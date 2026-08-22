package services

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

type AlertEngine struct {
	repo          *database.Repository
	cacheService  cache.CacheService
	emailProvider EmailProvider
	pushProvider  *PushNotificationProvider
	logger        *slog.Logger
	mu            sync.RWMutex

	// In-memory states if DB/Redis are offline
	memAlerts          []*database.AlertEventRecord
	memActiveIncidents map[string]*database.AlertEventRecord
	memCooldowns       map[string]time.Time

	recipientEmail string
	cooldownDur    time.Duration
}

func NewAlertEngine(
	repo *database.Repository,
	cacheService cache.CacheService,
	emailProvider EmailProvider,
	pushProvider *PushNotificationProvider,
	recipientEmail string,
	logger *slog.Logger,
) *AlertEngine {
	if recipientEmail == "" {
		recipientEmail = "admin@webmetricsx.com"
	}
	return &AlertEngine{
		repo:               repo,
		cacheService:       cacheService,
		emailProvider:      emailProvider,
		pushProvider:       pushProvider,
		logger:             logger,
		memAlerts:          make([]*database.AlertEventRecord, 0),
		memActiveIncidents: make(map[string]*database.AlertEventRecord),
		memCooldowns:       make(map[string]time.Time),
		recipientEmail:     recipientEmail,
		cooldownDur:        15 * time.Minute,
	}
}

type alertDetails struct {
	severity       string
	title          string
	message        string
	affectedMetric string
	currentVal     float64
	thresholdVal   float64
}

// ProcessAlertsForCheck runs rules checks and resolves or triggers alarms
func (ae *AlertEngine) ProcessAlertsForCheck(ctx context.Context, check *monitoring.CheckResult) error {
	conditions := ae.evaluateConditions(check)

	alertTypes := []string{"DOWN", "HIGH_TTFB", "HIGH_LATENCY", "ANOMALY", "REGRESSION", "SERVER_ERROR"}

	for _, alertType := range alertTypes {
		details, triggered := conditions[alertType]

		if triggered {
			err := ae.triggerAlert(ctx, check, alertType, details)
			if err != nil {
				ae.logger.Error("Failed to trigger alert", slog.String("type", alertType), slog.String("error", err.Error()))
			}
		} else {
			err := ae.resolveAlert(ctx, check, alertType)
			if err != nil {
				ae.logger.Error("Failed to resolve alert", slog.String("type", alertType), slog.String("error", err.Error()))
			}
		}
	}

	return nil
}

func (ae *AlertEngine) evaluateConditions(check *monitoring.CheckResult) map[string]alertDetails {
	res := make(map[string]alertDetails)

	// DOWN check
	if !check.Available || check.StatusCode == 0 {
		res["DOWN"] = alertDetails{
			severity:       "CRITICAL",
			title:          "Website Connection DOWN",
			message:        fmt.Sprintf("Target website %s failed network probes. Error: %s", check.URL, check.ErrorMessage),
			affectedMetric: "availability",
			currentVal:     0.0,
			thresholdVal:   1.0,
		}
	}

	// SERVER ERROR check
	if check.StatusCode >= 500 {
		res["SERVER_ERROR"] = alertDetails{
			severity:       "CRITICAL",
			title:          "Origin Server Failure (HTTP 5xx)",
			message:        fmt.Sprintf("Target website %s returned severe HTTP server error code %d", check.URL, check.StatusCode),
			affectedMetric: "status_code",
			currentVal:     float64(check.StatusCode),
			thresholdVal:   500.0,
		}
	}

	// HIGH TTFB check (TTFB > 400ms)
	if check.Available && check.TTFBMs > 400 {
		res["HIGH_TTFB"] = alertDetails{
			severity:       "MEDIUM",
			title:          "High Time To First Byte (TTFB)",
			message:        fmt.Sprintf("Time To First Byte for %s is elevated: %dms (threshold limit 400ms)", check.URL, check.TTFBMs),
			affectedMetric: "ttfb",
			currentVal:     float64(check.TTFBMs),
			thresholdVal:   400.0,
		}
	}

	// HIGH LATENCY check (ResponseTime > 400ms)
	if check.Available && check.ResponseTimeMs > 400 {
		res["HIGH_LATENCY"] = alertDetails{
			severity:       "LOW",
			title:          "Response Latency Degraded",
			message:        fmt.Sprintf("Total network response latency for %s is degraded: %dms (threshold limit 400ms)", check.URL, check.ResponseTimeMs),
			affectedMetric: "response_time",
			currentVal:     float64(check.ResponseTimeMs),
			thresholdVal:   400.0,
		}
	}

	// ANOMALY check
	if check.Available && check.AnomalyState == "ANOMALY" {
		severity := "HIGH"
		if check.AnomalySeverity != "" {
			severity = check.AnomalySeverity
		}
		res["ANOMALY"] = alertDetails{
			severity:       severity,
			title:          "Statistical Anomaly Detected",
			message:        fmt.Sprintf("Latency values for %s significantly deviated from historical baseline averages.", check.URL),
			affectedMetric: "response_time",
			currentVal:     float64(check.ResponseTimeMs),
			thresholdVal:   0.0,
		}
	}

	// REGRESSION check
	hasRegression := false
	var regressionDetails string
	for _, reg := range check.Regressions {
		if reg.Status == "Performance Regression" {
			hasRegression = true
			regressionDetails += fmt.Sprintf(" %s: %dms (baseline %dms).", reg.MetricType, int(reg.CurrentValue), int(reg.BaselineValue))
		}
	}
	if check.Available && hasRegression {
		res["REGRESSION"] = alertDetails{
			severity:       "MEDIUM",
			title:          "Performance Regression Identified",
			message:        fmt.Sprintf("Sustained performance regression detected on %s:%s", check.URL, regressionDetails),
			affectedMetric: "response_time",
			currentVal:     float64(check.ResponseTimeMs),
			thresholdVal:   0.0,
		}
	}

	return res
}

func (ae *AlertEngine) triggerAlert(ctx context.Context, check *monitoring.CheckResult, alertType string, details alertDetails) error {
	activeAlert, err := ae.GetActiveIncident(ctx, check.TargetID, alertType)
	var alertID string
	var consecutiveCount int = 1
	var detectedAt time.Time = time.Now().UTC()

	if err == nil && activeAlert != nil {
		alertID = activeAlert.ID
		consecutiveCount = activeAlert.ConsecutiveCount + 1
		detectedAt = activeAlert.Timestamp
	} else {
		alertID = database.GenerateID(fmt.Sprintf("%s:%s:%d", check.TargetID, alertType, time.Now().UnixNano()))
	}

	cooldownActive := ae.checkAndSetCooldown(ctx, check.TargetID, alertType)

	notificationStatus := "SKIPPED"
	status := "ACTIVE"
	if consecutiveCount == 1 {
		status = "TRIGGERED"
	}

	var rcaCause, rcaEvidence *string
	if check.RCA != nil {
		rcaCause = &check.RCA.LikelyCause
		rcaEvidence = &check.RCA.Evidence
	}

	record := &database.AlertEventRecord{
		ID:                 alertID,
		TargetID:           check.TargetID,
		AlertType:          alertType,
		Severity:           details.severity,
		Title:              details.title,
		Message:            details.message,
		AffectedMetric:     details.affectedMetric,
		CurrentValue:       details.currentVal,
		ThresholdValue:     details.thresholdVal,
		RCACause:           rcaCause,
		RCAEvidence:        rcaEvidence,
		Timestamp:          detectedAt,
		Status:             status,
		NotificationStatus: notificationStatus,
		ConsecutiveCount:   consecutiveCount,
	}

	if !cooldownActive {
		record.NotificationStatus = "SENT"
		go func(rec *database.AlertEventRecord, checkURL string) {
			nCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			subject := fmt.Sprintf("[%s] Alert Triggered: %s", rec.Severity, rec.Title)
			body := ae.buildAlertEmailBody(rec, checkURL)
			if emailErr := ae.emailProvider.SendEmail(nCtx, ae.recipientEmail, subject, body); emailErr != nil {
				ae.logger.Error("Failed to send alert email", slog.String("error", emailErr.Error()))
				rec.NotificationStatus = "FAILED"
				_ = ae.saveAlertRecord(context.Background(), rec)
			}

			if ae.pushProvider != nil {
				pushMsg := fmt.Sprintf("[%s] %s: %s", rec.Severity, rec.Title, rec.Message)
				if pushErr := ae.pushProvider.SendPushNotification(nCtx, rec.TargetID, rec.Title, pushMsg); pushErr != nil {
					ae.logger.Error("Failed to send browser push notification", slog.String("error", pushErr.Error()))
				}
			}
		}(record, check.URL)
	}

	return ae.saveAlertRecord(ctx, record)
}

func (ae *AlertEngine) resolveAlert(ctx context.Context, check *monitoring.CheckResult, alertType string) error {
	activeAlert, err := ae.GetActiveIncident(ctx, check.TargetID, alertType)
	if err != nil || activeAlert == nil {
		return nil
	}

	now := time.Now().UTC()
	activeAlert.Status = "RESOLVED"
	activeAlert.ResolvedAt = &now

	ae.clearCooldown(ctx, check.TargetID, alertType)

	go func(rec *database.AlertEventRecord, checkURL string) {
		nCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		subject := fmt.Sprintf("[RESOLVED] Alert Cleared: %s", rec.Title)
		body := ae.buildResolutionEmailBody(rec, checkURL)
		_ = ae.emailProvider.SendEmail(nCtx, ae.recipientEmail, subject, body)

		if ae.pushProvider != nil {
			pushMsg := fmt.Sprintf("[RESOLVED] Alert Cleared for %s", checkURL)
			_ = ae.pushProvider.SendPushNotification(nCtx, rec.TargetID, "Alert Resolved", pushMsg)
		}
	}(activeAlert, check.URL)

	return ae.saveAlertRecord(ctx, activeAlert)
}

func (ae *AlertEngine) saveAlertRecord(ctx context.Context, record *database.AlertEventRecord) error {
	if ae.repo != nil && ae.repo.IsAvailable() {
		return ae.repo.SaveAlertEvent(ctx, record)
	}

	ae.mu.Lock()
	defer ae.mu.Unlock()

	key := fmt.Sprintf("%s:%s", record.TargetID, record.AlertType)
	if record.Status == "RESOLVED" {
		delete(ae.memActiveIncidents, key)
	} else {
		ae.memActiveIncidents[key] = record
	}

	ae.memAlerts = append(ae.memAlerts, record)
	if len(ae.memAlerts) > 100 {
		ae.memAlerts = ae.memAlerts[1:]
	}
	return nil
}

func (ae *AlertEngine) GetActiveIncident(ctx context.Context, targetID, alertType string) (*database.AlertEventRecord, error) {
	if ae.repo != nil && ae.repo.IsAvailable() {
		alert, err := ae.repo.GetUnresolvedAlert(ctx, targetID, alertType)
		if err != nil {
			if err == sql.ErrNoRows {
				return nil, nil
			}
			return nil, err
		}
		return alert, nil
	}

	ae.mu.RLock()
	defer ae.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", targetID, alertType)
	alert, exists := ae.memActiveIncidents[key]
	if !exists {
		return nil, nil
	}
	return alert, nil
}

func (ae *AlertEngine) GetActiveIncidents(ctx context.Context, targetID string) ([]*database.AlertEventRecord, error) {
	if ae.repo != nil && ae.repo.IsAvailable() {
		return ae.repo.GetActiveAlerts(ctx, targetID)
	}

	ae.mu.RLock()
	defer ae.mu.RUnlock()
	var list []*database.AlertEventRecord
	for _, a := range ae.memActiveIncidents {
		if a.TargetID == targetID && a.Status != "RESOLVED" {
			list = append(list, a)
		}
	}
	return list, nil
}

func (ae *AlertEngine) GetRecentAlerts(ctx context.Context, targetID string, limit int) ([]*database.AlertEventRecord, error) {
	if ae.repo != nil && ae.repo.IsAvailable() {
		return ae.repo.GetRecentAlerts(ctx, targetID, limit)
	}

	ae.mu.RLock()
	defer ae.mu.RUnlock()
	var list []*database.AlertEventRecord
	count := 0
	for i := len(ae.memAlerts) - 1; i >= 0; i-- {
		a := ae.memAlerts[i]
		if a.TargetID == targetID {
			list = append(list, a)
			count++
			if count >= limit {
				break
			}
		}
	}
	return list, nil
}

func (ae *AlertEngine) checkAndSetCooldown(ctx context.Context, targetID, alertType string) bool {
	redisKey := fmt.Sprintf("webmetricsx:alert:cooldown:%s:%s", targetID, alertType)

	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var exists int
		if err := ae.cacheService.Get(ctx, redisKey, &exists); err == nil {
			return true
		}
		_ = ae.cacheService.Set(ctx, redisKey, 1, ae.cooldownDur)
		return false
	}

	ae.mu.Lock()
	defer ae.mu.Unlock()
	now := time.Now().UTC()
	cutoff, exists := ae.memCooldowns[redisKey]
	if exists && now.Before(cutoff) {
		return true
	}

	ae.memCooldowns[redisKey] = now.Add(ae.cooldownDur)
	return false
}

func (ae *AlertEngine) clearCooldown(ctx context.Context, targetID, alertType string) {
	redisKey := fmt.Sprintf("webmetricsx:alert:cooldown:%s:%s", targetID, alertType)

	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		_ = ae.cacheService.Delete(ctx, redisKey)
		return
	}

	ae.mu.Lock()
	defer ae.mu.Unlock()
	delete(ae.memCooldowns, redisKey)
}

func (ae *AlertEngine) buildAlertEmailBody(rec *database.AlertEventRecord, checkURL string) string {
	rcaBlock := ""
	if rec.RCACause != nil {
		rcaBlock = fmt.Sprintf(`
			<div style="background-color: #fcf8e3; border: 1px solid #faebcc; border-radius: 8px; padding: 15px; margin-top: 20px;">
				<h3 style="color: #8a6d3b; margin-top: 0; font-size: 14px;">🔍 Root Cause Analysis (RCA)</h3>
				<p style="margin: 0; font-family: monospace; font-size: 13px;"><strong>Likely Cause:</strong> %s</p>
				<p style="margin: 5px 0 0 0; font-family: monospace; font-size: 12px; color: #666;">%s</p>
			</div>
		`, *rec.RCACause, *rec.RCAEvidence)
	}

	return fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
			<div style="background-color: #d9534f; color: white; padding: 15px; border-radius: 8px; text-align: center;">
				<h2 style="margin: 0; font-size: 20px;">⚠️ WebMetricsX Alert Triggered</h2>
			</div>
			<div style="padding: 20px 0;">
				<p style="font-size: 16px; color: #333;">An issue has been identified on your monitored target website.</p>
				<table style="width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Website:</td>
						<td><a href="%s" style="color: #337ab7; text-decoration: none;">%s</a></td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Alert Type:</td>
						<td style="font-family: monospace; font-weight: bold; color: #d9534f;">%s</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Severity:</td>
						<td><span style="background-color: #f2dede; color: #a94442; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">%s</span></td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Current Value:</td>
						<td style="font-family: monospace;">%.1f</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Threshold/Baseline:</td>
						<td style="font-family: monospace; color: #999;">%.1f</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Time Detected:</td>
						<td>%s</td>
					</tr>
				</table>
				<p style="margin-top: 20px; font-size: 14px; color: #444; line-height: 1.5;">
					<strong>Message:</strong> %s
				</p>
				%s
			</div>
			<div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; color: #999; font-size: 11px;">
				Sent automatically by WebMetricsX Continuous Monitoring Service.
			</div>
		</div>
	`, checkURL, checkURL, rec.AlertType, rec.Severity, rec.CurrentValue, rec.ThresholdValue, rec.Timestamp.Format(time.RFC1123), rec.Message, rcaBlock)
}

func (ae *AlertEngine) buildResolutionEmailBody(rec *database.AlertEventRecord, checkURL string) string {
	duration := ""
	if rec.ResolvedAt != nil {
		dur := rec.ResolvedAt.Sub(rec.Timestamp).Round(time.Second)
		duration = fmt.Sprintf(`
			<tr style="border-bottom: 1px solid #eee; height: 35px;">
				<td style="color: #666; font-weight: bold;">Incident Duration:</td>
				<td>%s</td>
			</tr>
		`, dur.String())
	}

	return fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
			<div style="background-color: #5cb85c; color: white; padding: 15px; border-radius: 8px; text-align: center;">
				<h2 style="margin: 0; font-size: 20px;">✅ WebMetricsX Alert Resolved</h2>
			</div>
			<div style="padding: 20px 0;">
				<p style="font-size: 16px; color: #333;">The performance issue on your website has been resolved. Operation returned to normal.</p>
				<table style="width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Website:</td>
						<td><a href="%s" style="color: #337ab7; text-decoration: none;">%s</a></td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Alert Type:</td>
						<td style="font-family: monospace; font-weight: bold; color: #5cb85c;">%s</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Recovery Value:</td>
						<td style="font-family: monospace;">%.1f</td>
					</tr>
					<tr style="border-bottom: 1px solid #eee; height: 35px;">
						<td style="color: #666; font-weight: bold;">Time Resolved:</td>
						<td>%s</td>
					</tr>
					%s
				</table>
			</div>
			<div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; color: #999; font-size: 11px;">
				Sent automatically by WebMetricsX Continuous Monitoring Service.
			</div>
		</div>
	`, checkURL, checkURL, rec.AlertType, rec.CurrentValue, rec.ResolvedAt.Format(time.RFC1123), duration)
}
