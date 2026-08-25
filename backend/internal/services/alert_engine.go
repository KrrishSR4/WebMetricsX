package services

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/email"
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
	memViolations      map[string]int
	memFailures        map[string]int
	memGlobalLimits    map[string]int
	memMetrics         map[string]int64
	memSubscriptions   map[string][]string
	memThresholds      map[string]int64

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
		memViolations:      make(map[string]int),
		memFailures:        make(map[string]int),
		memGlobalLimits:    make(map[string]int),
		memMetrics:         make(map[string]int64),
		memSubscriptions:   make(map[string][]string),
		memThresholds:      make(map[string]int64),
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
	// 1. Check WEBSITE_DOWN state (3 consecutive failed probes required)
	isFailed := !check.Available || check.StatusCode == 0 || check.StatusCode >= 500
	if isFailed {
		// Reset latency consecutive count
		ae.setConsecutiveViolations(ctx, check.TargetID, "HIGH_LATENCY", 0)

		// Increment consecutive failures count
		fails := ae.getConsecutiveFailures(ctx, check.TargetID) + 1
		ae.setConsecutiveFailures(ctx, check.TargetID, fails)
		ae.logger.Debug("Consecutive failures tracker", slog.String("target", check.TargetID), slog.Int("count", fails))

		if fails >= 3 {
			details := alertDetails{
				severity:       "CRITICAL",
				title:          "Website Down",
				message:        fmt.Sprintf("Target website %s failed network probes. Error: %s", check.URL, check.ErrorMessage),
				affectedMetric: "availability",
				currentVal:     0.0,
				thresholdVal:   1.0,
			}
			_ = ae.triggerAlert(ctx, check, "WEBSITE_DOWN", details)
		}

		// Resolve HIGH_LATENCY alert if active
		_ = ae.resolveAlert(ctx, check, "HIGH_LATENCY")
	} else {
		// Reset failures count
		ae.setConsecutiveFailures(ctx, check.TargetID, 0)
		_ = ae.resolveAlert(ctx, check, "WEBSITE_DOWN")

		// Load custom threshold (memory cache -> DB -> fallback 400ms)
		thresholdMs := ae.GetTargetThreshold(ctx, check.TargetID)

		// 2. Check HIGH_LATENCY state (TTFB > thresholdMs or ResponseTime > thresholdMs, 3 consecutive violations required)
		isLatencyViolated := check.TTFBMs > thresholdMs || check.ResponseTimeMs > thresholdMs
		if isLatencyViolated {
			viols := ae.getConsecutiveViolations(ctx, check.TargetID, "HIGH_LATENCY") + 1
			ae.setConsecutiveViolations(ctx, check.TargetID, "HIGH_LATENCY", viols)
			ae.logger.Debug("Consecutive latency violations tracker", slog.String("target", check.TargetID), slog.Int("count", viols))

			if viols >= 3 {
				details := alertDetails{
					severity:       "WARNING",
					title:          "High TTFB Detected",
					message:        fmt.Sprintf("Time To First Byte or response latency for %s is elevated: %dms (threshold %dms)", check.URL, check.TTFBMs, thresholdMs),
					affectedMetric: "ttfb",
					currentVal:     float64(check.TTFBMs),
					thresholdVal:   float64(thresholdMs),
				}
				_ = ae.triggerAlert(ctx, check, "HIGH_LATENCY", details)
			}
		} else {
			ae.setConsecutiveViolations(ctx, check.TargetID, "HIGH_LATENCY", 0)
			_ = ae.resolveAlert(ctx, check, "HIGH_LATENCY")
		}
	}

	return nil
}

func (ae *AlertEngine) triggerAlert(ctx context.Context, check *monitoring.CheckResult, alertType string, details alertDetails) error {
	activeAlert, err := ae.GetActiveIncident(ctx, check.TargetID, alertType)
	var alertID string
	var consecutiveCount int = 1
	var detectedAt time.Time = time.Now().UTC()
	var lastSentAt time.Time

	if err == nil && activeAlert != nil {
		alertID = activeAlert.ID
		consecutiveCount = activeAlert.ConsecutiveCount + 1
		detectedAt = activeAlert.Timestamp
		// Extract last sent time if recorded in activeAlert.ResolvedAt (reused field)
		if activeAlert.ResolvedAt != nil {
			lastSentAt = *activeAlert.ResolvedAt
		}
	} else {
		alertID = database.GenerateID(fmt.Sprintf("%s:%s:%d", check.TargetID, alertType, time.Now().UnixNano()))
		ae.incrementMetric(ctx, "alerts_triggered_total")
	}

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
		NotificationStatus: "SKIPPED",
		ConsecutiveCount:   consecutiveCount,
	}

	// Cooldown and safety checks
	cooldownActive := ae.checkAndSetCooldown(ctx, check.TargetID, alertType)
	canSendGlobal, _ := ae.checkAndIncrementGlobalRateLimit(ctx)

	if !cooldownActive && canSendGlobal {
		record.NotificationStatus = "SENT"
		nowSent := time.Now().UTC()
		record.ResolvedAt = &nowSent // Track LastAlertSentAt
		ae.incrementMetric(ctx, "alerts_sent_total")

		go func(rec *database.AlertEventRecord, chk *monitoring.CheckResult, prevSent time.Time) {
			nCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			availability := 100.0
			var avgVal, p95Val, p99Val float64
			if ae.repo != nil && ae.repo.IsAvailable() {
				if summary, err := ae.repo.GetAnalyticsSummary(nCtx, chk.TargetID, "24h"); err == nil && summary != nil {
					availability = summary.UptimePercentage
					avgVal = float64(summary.AvgResponseTimeMs)
					p95Val = float64(summary.P95ResponseTimeMs)
					p99Val = float64(summary.P99ResponseTimeMs)
				}
			}

			var cause, evidence string
			if chk.RCA != nil {
				cause = chk.RCA.LikelyCause
				evidence = chk.RCA.Evidence
			}

			alertData := email.AlertEmailData{
				Website:               chk.URL,
				Status:                alertType,
				TTFB:                  float64(chk.TTFBMs),
				Threshold:             rec.ThresholdValue,
				ResponseTime:          float64(chk.ResponseTimeMs),
				DNS:                   float64(chk.DNSLatencyMs),
				TCP:                   float64(chk.TCPLatencyMs),
				TLS:                   float64(chk.TLSLatencyMs),
				Availability:          availability,
				DetectedAt:            rec.Timestamp,
				LikelyCause:           cause,
				RCAEvidence:           evidence,
				AvgResponseTime:       avgVal,
				P95ResponseTime:       p95Val,
				P99ResponseTime:       p99Val,
				ConsecutiveViolations: rec.ConsecutiveCount,
				LastAlertTime:         prevSent,
				NextAlertTime:         time.Now().UTC().Add(15 * time.Minute),
			}

			// Fetch subscribed emails
			recipients := ae.GetSubscriptions(nCtx, chk.TargetID)
			if len(recipients) == 0 {
				ae.logger.Info("No subscribed recipients for target; skipping email dispatch", slog.String("target_id", chk.TargetID), slog.String("url", chk.URL))
				return
			}

			// Send to all recipients in batch
			if emailErr := email.SendAlertEmails(nCtx, recipients, alertData); emailErr != nil {
				ae.logger.Error("Failed to send Brevo alert email batch", slog.String("recipients", fmt.Sprintf("%v", recipients)), slog.String("error", emailErr.Error()))
				ae.incrementMetric(context.Background(), "brevo_send_failures_total")
				rec.NotificationStatus = "FAILED"
				_ = ae.saveAlertRecord(context.Background(), rec)
			}
		}(record, check, lastSentAt)
	} else {
		if cooldownActive {
			ae.logger.Info("Alert suppressed due to cooldown", slog.String("target", check.TargetID), slog.String("type", alertType))
			ae.incrementMetric(ctx, "alerts_suppressed_total")
		} else if !canSendGlobal {
			ae.logger.Warn("Alert suppressed due to global safety rate limit", slog.String("target", check.TargetID), slog.String("type", alertType))
			ae.incrementMetric(ctx, "alerts_rate_limited_total")
		}
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
	ae.incrementMetric(ctx, "alerts_recovered_total")

	go func(rec *database.AlertEventRecord, chk *monitoring.CheckResult) {
		nCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		availability := 100.0
		var avgVal, p95Val, p99Val float64
		if ae.repo != nil && ae.repo.IsAvailable() {
			if summary, err := ae.repo.GetAnalyticsSummary(nCtx, chk.TargetID, "24h"); err == nil && summary != nil {
				availability = summary.UptimePercentage
				avgVal = float64(summary.AvgResponseTimeMs)
				p95Val = float64(summary.P95ResponseTimeMs)
				p99Val = float64(summary.P99ResponseTimeMs)
			}
		}

		alertData := email.AlertEmailData{
			Website:         chk.URL,
			Status:          "RECOVERY",
			TTFB:            float64(chk.TTFBMs),
			Threshold:       rec.ThresholdValue,
			ResponseTime:    float64(chk.ResponseTimeMs),
			DNS:             float64(chk.DNSLatencyMs),
			TCP:             float64(chk.TCPLatencyMs),
			TLS:             float64(chk.TLSLatencyMs),
			Availability:    availability,
			DetectedAt:      now,
			AvgResponseTime: avgVal,
			P95ResponseTime: p95Val,
			P99ResponseTime: p99Val,
			LastAlertTime:   rec.Timestamp,
		}

		// Fetch subscribed emails
		recipients := ae.GetSubscriptions(nCtx, chk.TargetID)
		if len(recipients) == 0 {
			ae.logger.Info("No subscribed recipients for target; skipping recovery email dispatch", slog.String("target_id", chk.TargetID), slog.String("url", chk.URL))
			return
		}

		// Send to all recipients in batch
		if emailErr := email.SendAlertEmails(nCtx, recipients, alertData); emailErr != nil {
			ae.logger.Error("Failed to send Brevo recovery email batch", slog.String("recipients", fmt.Sprintf("%v", recipients)), slog.String("error", emailErr.Error()))
			ae.incrementMetric(context.Background(), "brevo_send_failures_total")
		}
	}(activeAlert, check)

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
		cutoffStr := time.Now().UTC().Add(ae.cooldownDur).Format(time.RFC3339)
		_ = ae.cacheService.Set(ctx, redisKey+":expiry", cutoffStr, ae.cooldownDur)
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
		_ = ae.cacheService.Delete(ctx, redisKey+":expiry")
		return
	}

	ae.mu.Lock()
	defer ae.mu.Unlock()
	delete(ae.memCooldowns, redisKey)
}

// ResetTargetState clears all active incidents, consecutive counters, and cooldowns for a target
func (ae *AlertEngine) ResetTargetState(ctx context.Context, targetID string) {
	ae.mu.Lock()
	defer ae.mu.Unlock()

	prefixIncident := fmt.Sprintf("%s:", targetID)
	for k := range ae.memActiveIncidents {
		if strings.HasPrefix(k, prefixIncident) || k == targetID {
			delete(ae.memActiveIncidents, k)
		}
	}

	prefixCooldown := fmt.Sprintf("webmetricsx:alert:cooldown:%s:", targetID)
	prefixViol := fmt.Sprintf("webmetricsx:alert:violations:%s:", targetID)
	prefixFail := fmt.Sprintf("webmetricsx:alert:failures:%s", targetID)

	for k := range ae.memCooldowns {
		if strings.HasPrefix(k, prefixCooldown) {
			delete(ae.memCooldowns, k)
		}
	}
	for k := range ae.memViolations {
		if strings.HasPrefix(k, prefixViol) {
			delete(ae.memViolations, k)
		}
	}
	delete(ae.memFailures, targetID)

	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		_ = ae.cacheService.Delete(ctx, fmt.Sprintf("webmetricsx:alert:cooldown:%s:HIGH_LATENCY", targetID))
		_ = ae.cacheService.Delete(ctx, fmt.Sprintf("webmetricsx:alert:cooldown:%s:WEBSITE_DOWN", targetID))
		_ = ae.cacheService.Delete(ctx, fmt.Sprintf("webmetricsx:alert:violations:%s:HIGH_LATENCY", targetID))
		_ = ae.cacheService.Delete(ctx, fmt.Sprintf("webmetricsx:alert:violations:%s:WEBSITE_DOWN", targetID))
		_ = ae.cacheService.Delete(ctx, prefixFail)
	}

	ae.logger.Info("[ALERT ENGINE] Reset target alert state and cooldowns", slog.String("target_id", targetID))
}

func (ae *AlertEngine) getConsecutiveViolations(ctx context.Context, targetID, alertType string) int {
	redisKey := fmt.Sprintf("webmetricsx:alert:violations:%s:%s", targetID, alertType)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var val int
		if err := ae.cacheService.Get(ctx, redisKey, &val); err == nil {
			return val
		}
		return 0
	}
	ae.mu.RLock()
	defer ae.mu.RUnlock()
	return ae.memViolations[redisKey]
}

func (ae *AlertEngine) setConsecutiveViolations(ctx context.Context, targetID, alertType string, val int) {
	redisKey := fmt.Sprintf("webmetricsx:alert:violations:%s:%s", targetID, alertType)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		_ = ae.cacheService.Set(ctx, redisKey, val, 24*time.Hour)
		return
	}
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.memViolations[redisKey] = val
}

func (ae *AlertEngine) getConsecutiveFailures(ctx context.Context, targetID string) int {
	redisKey := fmt.Sprintf("webmetricsx:alert:failures:%s", targetID)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var val int
		if err := ae.cacheService.Get(ctx, redisKey, &val); err == nil {
			return val
		}
		return 0
	}
	ae.mu.RLock()
	defer ae.mu.RUnlock()
	return ae.memFailures[redisKey]
}

func (ae *AlertEngine) setConsecutiveFailures(ctx context.Context, targetID string, val int) {
	redisKey := fmt.Sprintf("webmetricsx:alert:failures:%s", targetID)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		_ = ae.cacheService.Set(ctx, redisKey, val, 24*time.Hour)
		return
	}
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.memFailures[redisKey] = val
}

func (ae *AlertEngine) checkAndIncrementGlobalRateLimit(ctx context.Context) (bool, error) {
	currentHour := time.Now().UTC().Format("2006010215")
	redisKey := fmt.Sprintf("webmetricsx:alert:global_limit:%s", currentHour)

	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var count int
		_ = ae.cacheService.Get(ctx, redisKey, &count)
		if count >= 20 {
			return false, nil
		}
		_ = ae.cacheService.Set(ctx, redisKey, count+1, 2*time.Hour)
		return true, nil
	}

	ae.mu.Lock()
	defer ae.mu.Unlock()

	// Clean up old memory keys to prevent leak
	for k := range ae.memGlobalLimits {
		if k != redisKey {
			delete(ae.memGlobalLimits, k)
		}
	}

	count := ae.memGlobalLimits[redisKey]
	if count >= 20 {
		return false, nil
	}
	ae.memGlobalLimits[redisKey] = count + 1
	return true, nil
}

func (ae *AlertEngine) incrementMetric(ctx context.Context, metricName string) {
	redisKey := fmt.Sprintf("webmetricsx:metrics:%s", metricName)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var val int64
		_ = ae.cacheService.Get(ctx, redisKey, &val)
		_ = ae.cacheService.Set(ctx, redisKey, val+1, 0)
		return
	}
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.memMetrics[metricName] = ae.memMetrics[metricName] + 1
}

func (ae *AlertEngine) getMetricVal(ctx context.Context, metricName string) int64 {
	redisKey := fmt.Sprintf("webmetricsx:metrics:%s", metricName)
	if ae.cacheService != nil && ae.cacheService.IsAvailable() {
		var val int64
		if err := ae.cacheService.Get(ctx, redisKey, &val); err == nil {
			return val
		}
		return 0
	}
	ae.mu.RLock()
	defer ae.mu.RUnlock()
	return ae.memMetrics[metricName]
}

func (ae *AlertEngine) GetAlertStatusSummary(ctx context.Context, targetID string) (map[string]interface{}, error) {
	active, _ := ae.GetActiveIncidents(ctx, targetID)

	triggered := ae.getMetricVal(ctx, "alerts_triggered_total")
	sent := ae.getMetricVal(ctx, "alerts_sent_total")
	suppressed := ae.getMetricVal(ctx, "alerts_suppressed_total") + ae.getMetricVal(ctx, "alerts_rate_limited_total")

	var lastSent time.Time
	recent, _ := ae.GetRecentAlerts(ctx, targetID, 1)
	if len(recent) > 0 {
		lastSent = recent[0].Timestamp
	}

	statusMap := make(map[string]interface{})
	statusMap["active_incidents"] = active
	statusMap["triggered_count"] = triggered
	statusMap["sent_count"] = sent
	statusMap["suppressed_count"] = suppressed

	if !lastSent.IsZero() {
		statusMap["last_alert_sent_at"] = lastSent.Format(time.RFC3339)
	}

	now := time.Now().UTC()
	cooldowns := make(map[string]interface{})
	for _, alertType := range []string{"HIGH_LATENCY", "WEBSITE_DOWN"} {
		redisKey := fmt.Sprintf("webmetricsx:alert:cooldown:%s:%s", targetID, alertType)
		var exists int
		var cutoff time.Time
		var inCooldown bool

		if ae.cacheService != nil && ae.cacheService.IsAvailable() {
			if err := ae.cacheService.Get(ctx, redisKey, &exists); err == nil {
				inCooldown = true
				var cutoffStr string
				if errExp := ae.cacheService.Get(ctx, redisKey+":expiry", &cutoffStr); errExp == nil {
					if parsedExp, errP := time.Parse(time.RFC3339, cutoffStr); errP == nil {
						cutoff = parsedExp
					}
				}
			}
		} else {
			ae.mu.RLock()
			exp, ok := ae.memCooldowns[redisKey]
			ae.mu.RUnlock()
			if ok && now.Before(exp) {
				inCooldown = true
				cutoff = exp
			}
		}

		if inCooldown {
			remaining := cutoff.Sub(now).Round(time.Second)
			if remaining < 0 {
				remaining = 0
			}
			cooldowns[alertType] = map[string]interface{}{
				"in_cooldown":   true,
				"remaining_sec": int(remaining.Seconds()),
				"next_eligible": cutoff.Format(time.RFC3339),
			}
		} else {
			cooldowns[alertType] = map[string]interface{}{
				"in_cooldown": false,
			}
		}
	}
	statusMap["cooldowns"] = cooldowns

	return statusMap, nil
}

func (ae *AlertEngine) AddSubscription(targetID, email string) {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	subs := ae.memSubscriptions[targetID]
	for _, s := range subs {
		if s == email {
			return
		}
	}
	ae.memSubscriptions[targetID] = append(subs, email)
}

func (ae *AlertEngine) RemoveSubscription(targetID, email string) {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	subs := ae.memSubscriptions[targetID]
	var updated []string
	for _, s := range subs {
		if s != email {
			updated = append(updated, s)
		}
	}
	ae.memSubscriptions[targetID] = updated
}

func (ae *AlertEngine) GetSubscriptions(ctx context.Context, targetID string) []string {
	var subs []string
	if ae.repo != nil && ae.repo.IsAvailable() {
		if dbSubs, err := ae.repo.GetEmailSubscriptions(ctx, targetID); err == nil && len(dbSubs) > 0 {
			subs = dbSubs
		}
	}

	ae.mu.RLock()
	memSubs := ae.memSubscriptions[targetID]
	ae.mu.RUnlock()

	seen := make(map[string]bool)
	var finalSubs []string
	for _, s := range subs {
		if !seen[s] {
			seen[s] = true
			finalSubs = append(finalSubs, s)
		}
	}
	for _, s := range memSubs {
		if !seen[s] {
			seen[s] = true
			finalSubs = append(finalSubs, s)
		}
	}

	return finalSubs
}

func (ae *AlertEngine) SetTargetThreshold(targetID string, thresholdMs int64) {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.memThresholds[targetID] = thresholdMs
}

func (ae *AlertEngine) GetTargetThreshold(ctx context.Context, targetID string) int64 {
	ae.mu.RLock()
	thresh, ok := ae.memThresholds[targetID]
	ae.mu.RUnlock()
	if ok && thresh > 0 {
		return thresh
	}

	if ae.repo != nil && ae.repo.IsAvailable() {
		if target, err := ae.repo.GetTargetByID(ctx, targetID); err == nil && target != nil && target.LatencyThresholdMs > 0 {
			tVal := int64(target.LatencyThresholdMs)
			ae.mu.Lock()
			ae.memThresholds[targetID] = tVal
			ae.mu.Unlock()
			return tVal
		}
	}

	return 400 // Default fallback threshold 400ms
}
