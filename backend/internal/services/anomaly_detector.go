package services

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"sync"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

type MetricBaseline struct {
	Mean        float64 `json:"mean"`
	Median      float64 `json:"median"`
	P95         float64 `json:"p95"`
	P99         float64 `json:"p99"`
	Min         float64 `json:"min"`
	Max         float64 `json:"max"`
	StdDev      float64 `json:"stddev"`
	SampleCount int     `json:"sample_count"`
}

type TargetBaseline struct {
	TargetID         string                     `json:"target_id"`
	TimeWindow       string                     `json:"time_window"`
	Metrics          map[string]*MetricBaseline `json:"metrics"`
	InsufficientData bool                       `json:"insufficient_data"`
	CalculatedAt     time.Time                  `json:"calculated_at"`
}

type AnomalyEvent struct {
	ID                  string     `json:"id"`
	TargetID            string     `json:"target_id"`
	MetricType          string     `json:"metric_type"`
	LifecycleState      string     `json:"lifecycle_state"`
	Severity            string     `json:"severity"`
	ObservedValue       float64    `json:"observed_value"`
	ExpectedValue       float64    `json:"expected_value"`
	DeviationPercentage float64    `json:"deviation_percentage"`
	ConsecutiveCount    int        `json:"consecutive_count"`
	DetectedAt          time.Time  `json:"detected_at"`
	ResolvedAt          *time.Time `json:"resolved_at,omitempty"`
	Status              string     `json:"status"` // ACTIVE / RESOLVED
}

type AnomalyStatus struct {
	Status          string          `json:"status"` // NORMAL / DEGRADED / ANOMALY
	ActiveAnomalies []*AnomalyEvent `json:"active_anomalies"`
}

type AnomalyStats struct {
	TotalDetected     int            `json:"total_detected"`
	TotalResolved     int            `json:"total_resolved"`
	MeanResolutionSec float64        `json:"mean_resolution_sec"`
	SeverityCounts    map[string]int `json:"severity_counts"`
	MetricCounts      map[string]int `json:"metric_counts"`
}

type AnomalyConfig struct {
	DeviationThresholdPct float64
	StdDevMultiplier      float64
	ConsecutiveThreshold  int
	MinSamplesRequired    int
}

type AnomalyDetector struct {
	repo         *database.Repository
	cacheService cache.CacheService
	logger       *slog.Logger
	config       AnomalyConfig
	mu           sync.RWMutex

	// Fallback in-memory state if Redis is offline
	memConsecutiveCounts map[string]int
	memAnomalyStates     map[string]*database.AnomalyEventRecord
	memCheckHistory      map[string][]*monitoring.CheckResult
	memLatestChecks      map[string]*monitoring.CheckResult
}

func NewAnomalyDetector(repo *database.Repository, cacheService cache.CacheService, logger *slog.Logger) *AnomalyDetector {
	return &AnomalyDetector{
		repo:         repo,
		cacheService: cacheService,
		logger:       logger,
		config: AnomalyConfig{
			DeviationThresholdPct: 50.0, // 50% deviation threshold
			StdDevMultiplier:      3.0,  // 3 standard deviations
			ConsecutiveThreshold:  3,    // 3 consecutive hits to confirm anomaly
			MinSamplesRequired:    10,   // minimum 10 samples for baseline
		},
		memConsecutiveCounts: make(map[string]int),
		memAnomalyStates:     make(map[string]*database.AnomalyEventRecord),
		memCheckHistory:      make(map[string][]*monitoring.CheckResult),
		memLatestChecks:      make(map[string]*monitoring.CheckResult),
	}
}

// GetBaseline calculates or fetches the baseline for a specific target URL and time window
func (ad *AnomalyDetector) GetBaseline(ctx context.Context, targetID, window string) (*TargetBaseline, error) {
	// 1. Resolve window start time
	var duration time.Duration
	switch window {
	case "1h":
		duration = time.Hour
	case "6h":
		duration = 6 * time.Hour
	case "24h":
		duration = 24 * time.Hour
	case "7d":
		duration = 7 * 24 * time.Hour
	case "30d":
		duration = 30 * 24 * time.Hour
	default:
		window = "24h"
		duration = 24 * time.Hour
	}

	// 2. Try Redis cache
	if ad.cacheService != nil && ad.cacheService.IsAvailable() {
		cacheKey := fmt.Sprintf("webmetricsx:baseline:%s:%s", targetID, window)
		var cached TargetBaseline
		if err := ad.cacheService.Get(ctx, cacheKey, &cached); err == nil {
			return &cached, nil
		}
	}

	// 3. Programmatic Fallback if DB is unavailable
	if ad.repo == nil || !ad.repo.IsAvailable() {
		ad.mu.RLock()
		checks := ad.memCheckHistory[targetID]
		ad.mu.RUnlock()

		baseline := &TargetBaseline{
			TargetID:     targetID,
			TimeWindow:   window,
			Metrics:      make(map[string]*MetricBaseline),
			CalculatedAt: time.Now(),
		}

		var filtered []*monitoring.CheckResult
		cutoff := time.Now().Add(-duration)
		for _, c := range checks {
			if c.CheckedAt.After(cutoff) {
				filtered = append(filtered, c)
			}
		}

		if len(filtered) < ad.config.MinSamplesRequired {
			baseline.InsufficientData = true
			return baseline, nil
		}

		computed := ad.computeInMemBaseline(filtered)
		for k, m := range computed {
			baseline.Metrics[k] = m
		}

		return baseline, nil
	}

	// 4. Compute natively from Postgres
	since := time.Now().Add(-duration)
	dbMetrics, err := ad.repo.ComputeBaselineFromHistory(ctx, targetID, since)
	if err != nil {
		return nil, fmt.Errorf("failed to compute baseline from postgres: %w", err)
	}

	baseline := &TargetBaseline{
		TargetID:     targetID,
		TimeWindow:   window,
		Metrics:      make(map[string]*MetricBaseline),
		CalculatedAt: time.Now(),
	}

	respTimeBaseline, exists := dbMetrics["response_time"]
	if !exists || respTimeBaseline.SampleCount < ad.config.MinSamplesRequired {
		baseline.InsufficientData = true
	} else {
		for k, m := range dbMetrics {
			baseline.Metrics[k] = &MetricBaseline{
				Mean:        m.Mean,
				Median:      m.Median,
				P95:         m.P95,
				P99:         m.P99,
				Min:         m.Min,
				Max:         m.Max,
				StdDev:      m.StdDev,
				SampleCount: m.SampleCount,
			}
			_ = ad.repo.UpsertBaseline(ctx, targetID, window, m)
		}
	}

	if ad.cacheService != nil && ad.cacheService.IsAvailable() {
		cacheKey := fmt.Sprintf("webmetricsx:baseline:%s:%s", targetID, window)
		_ = ad.cacheService.Set(ctx, cacheKey, baseline, 5*time.Minute)
	}

	return baseline, nil
}

func (ad *AnomalyDetector) computeInMemBaseline(checks []*monitoring.CheckResult) map[string]*MetricBaseline {
	metrics := []string{"response_time", "ttfb", "dns_latency", "tcp_latency", "tls_latency"}
	results := make(map[string]*MetricBaseline)

	for _, metric := range metrics {
		var vals []float64
		for _, c := range checks {
			if !c.Available {
				continue
			}
			var val float64
			switch metric {
			case "response_time":
				val = float64(c.ResponseTimeMs)
			case "ttfb":
				val = float64(c.TTFBMs)
			case "dns_latency":
				val = float64(c.DNSLatencyMs)
			case "tcp_latency":
				val = float64(c.TCPLatencyMs)
			case "tls_latency":
				val = float64(c.TLSLatencyMs)
			}
			vals = append(vals, val)
		}

		count := len(vals)
		if count == 0 {
			continue
		}

		var sum float64
		minVal := vals[0]
		maxVal := vals[0]
		for _, v := range vals {
			sum += v
			if v < minVal {
				minVal = v
			}
			if v > maxVal {
				maxVal = v
			}
		}
		mean := sum / float64(count)

		var varianceSum float64
		for _, v := range vals {
			diff := v - mean
			varianceSum += diff * diff
		}
		stddev := 0.0
		if count > 1 {
			stddev = math.Sqrt(varianceSum / float64(count-1))
		}

		sort.Float64s(vals)
		median := vals[count/2]
		p95 := vals[int(float64(count)*0.95)]
		p99 := vals[int(float64(count)*0.99)]

		results[metric] = &MetricBaseline{
			Mean:        mean,
			Median:      median,
			P95:         p95,
			P99:         p99,
			Min:         minVal,
			Max:         maxVal,
			StdDev:      stddev,
			SampleCount: count,
		}
	}

	return results
}

// ProcessCheckResult performs real-time baseline comparison and anomaly lifecycle updating
func (ad *AnomalyDetector) ProcessCheckResult(ctx context.Context, check *monitoring.CheckResult) (string, string, error) {
	// Fallback to in-memory check history if database is unavailable
	if ad.repo == nil || !ad.repo.IsAvailable() {
		ad.mu.Lock()
		ad.memCheckHistory[check.TargetID] = append(ad.memCheckHistory[check.TargetID], check)
		if len(ad.memCheckHistory[check.TargetID]) > 100 {
			ad.memCheckHistory[check.TargetID] = ad.memCheckHistory[check.TargetID][1:]
		}
		ad.mu.Unlock()
	}

	// Fetch current baseline (24h default)
	baseline, err := ad.GetBaseline(ctx, check.TargetID, "24h")
	if err != nil {
		return "NORMAL", "NONE", err
	}

	overallStatus := "NORMAL"
	maxSeverity := "NONE"

	metricValues := map[string]float64{
		"response_time": float64(check.ResponseTimeMs),
		"ttfb":          float64(check.TTFBMs),
		"dns_latency":   float64(check.DNSLatencyMs),
		"tcp_latency":   float64(check.TCPLatencyMs),
		"tls_latency":   float64(check.TLSLatencyMs),
	}

	minDiffs := map[string]float64{
		"response_time": 80.0,
		"ttfb":          60.0,
		"dns_latency":   15.0,
		"tcp_latency":   15.0,
		"tls_latency":   15.0,
	}

	if !check.Available || check.StatusCode >= 400 || check.StatusCode == 0 {
		overallStatus = "ANOMALY"
		maxSeverity = "CRITICAL"
		check.AnomalyState = overallStatus
		check.AnomalySeverity = maxSeverity
		check.RCA = ad.runRCA(check, baseline)
		check.Regressions = ad.runRegressionDetection(check, baseline)

		ad.mu.Lock()
		ad.memLatestChecks[check.TargetID] = check
		ad.mu.Unlock()

		ad.triggerAvailabilityAnomaly(ctx, check)
		return overallStatus, maxSeverity, nil
	}

	ad.resolveAvailabilityAnomaly(ctx, check)

	if baseline.InsufficientData {
		check.AnomalyState = "NORMAL"
		check.AnomalySeverity = "NONE"

		ad.mu.Lock()
		ad.memLatestChecks[check.TargetID] = check
		ad.mu.Unlock()

		return "NORMAL", "NONE", nil
	}

	for metricKey, val := range metricValues {
		bm, exists := baseline.Metrics[metricKey]
		if !exists || bm.SampleCount < ad.config.MinSamplesRequired {
			continue
		}

		mean := bm.Mean
		stddev := bm.StdDev

		diff := val - mean
		pct := 0.0
		if mean > 0 {
			pct = (diff / mean) * 100.0
		}

		isAnomalous := false
		isDegraded := false
		severity := "NONE"

		minDiff := minDiffs[metricKey]
		if diff > minDiff {
			stddevBoundary := stddev * ad.config.StdDevMultiplier
			pctBoundary := ad.config.DeviationThresholdPct

			if diff > stddevBoundary && pct > pctBoundary {
				isAnomalous = true
				if diff > stddev*6.0 || pct > 200.0 {
					severity = "CRITICAL"
				} else if diff > stddev*4.0 || pct > 100.0 {
					severity = "HIGH"
				} else if diff > stddev*2.5 || pct > 50.0 {
					severity = "MEDIUM"
				} else {
					severity = "LOW"
				}
			} else if diff > (stddev*1.5) && pct > (pctBoundary/2.0) {
				isDegraded = true
				severity = "LOW"
			}
		}

		consecKey := fmt.Sprintf("%s:%s", check.TargetID, metricKey)
		consecCount := 0

		if isAnomalous || isDegraded {
			consecCount = ad.incrementConsecutiveCount(ctx, consecKey)
			lifecycleState := "DEVIATION_DETECTED"
			if consecCount == 2 {
				lifecycleState = "ANOMALY_SUSPECTED"
			} else if consecCount >= ad.config.ConsecutiveThreshold {
				lifecycleState = "ACTIVE"
			}

			if lifecycleState == "ACTIVE" {
				overallStatus = "ANOMALY"
				if ad.getSeverityWeight(severity) > ad.getSeverityWeight(maxSeverity) {
					maxSeverity = severity
				}
				_ = ad.upsertActiveAnomaly(ctx, check.TargetID, metricKey, lifecycleState, severity, val, mean, pct, consecCount)
			} else {
				if overallStatus != "ANOMALY" {
					overallStatus = "DEGRADED"
					maxSeverity = "LOW"
				}
				_ = ad.upsertActiveAnomaly(ctx, check.TargetID, metricKey, lifecycleState, severity, val, mean, pct, consecCount)
			}
		} else {
			ad.resetConsecutiveCount(ctx, consecKey)
			ad.resolveActiveAnomaly(ctx, check.TargetID, metricKey, val)
		}
	}

	check.AnomalyState = overallStatus
	check.AnomalySeverity = maxSeverity
	if overallStatus != "NORMAL" {
		check.RCA = ad.runRCA(check, baseline)
	}
	check.Regressions = ad.runRegressionDetection(check, baseline)

	ad.mu.Lock()
	ad.memLatestChecks[check.TargetID] = check
	ad.mu.Unlock()

	return overallStatus, maxSeverity, nil
}

func (ad *AnomalyDetector) getSeverityWeight(sev string) int {
	switch sev {
	case "CRITICAL":
		return 4
	case "HIGH":
		return 3
	case "MEDIUM":
		return 2
	case "LOW":
		return 1
	default:
		return 0
	}
}

func (ad *AnomalyDetector) triggerAvailabilityAnomaly(ctx context.Context, check *monitoring.CheckResult) {
	eventID := database.GenerateID(fmt.Sprintf("%s:availability:active", check.TargetID))
	now := time.Now().UTC()

	existing, err := ad.GetActiveAnomalyEvent(ctx, check.TargetID, "availability")
	if err == nil && existing != nil {
		existing.ConsecutiveCount++
		existing.ObservedValue = 0
		existing.DeviationPercentage = 100.0
		_ = ad.saveAnomalyEvent(ctx, existing)
		return
	}

	event := &database.AnomalyEventRecord{
		ID:                  eventID,
		TargetID:            check.TargetID,
		MetricType:          "availability",
		LifecycleState:      "ACTIVE",
		Severity:            "CRITICAL",
		ObservedValue:       0,
		ExpectedValue:       100.0,
		DeviationPercentage: 100.0,
		ConsecutiveCount:    1,
		DetectedAt:          now,
		Status:              "ACTIVE",
	}

	_ = ad.saveAnomalyEvent(ctx, event)
}

func (ad *AnomalyDetector) resolveAvailabilityAnomaly(ctx context.Context, check *monitoring.CheckResult) {
	existing, err := ad.GetActiveAnomalyEvent(ctx, check.TargetID, "availability")
	if err == nil && existing != nil {
		now := time.Now().UTC()
		existing.Status = "RESOLVED"
		existing.LifecycleState = "RESOLVED"
		existing.ResolvedAt = &now
		existing.ObservedValue = 100.0
		_ = ad.saveAnomalyEvent(ctx, existing)
	}
}

func (ad *AnomalyDetector) upsertActiveAnomaly(ctx context.Context, targetID, metric, lifecycle, severity string, val, expected, pct float64, consec int) error {
	existing, err := ad.GetActiveAnomalyEvent(ctx, targetID, metric)
	now := time.Now().UTC()

	if err == nil && existing != nil {
		existing.LifecycleState = lifecycle
		existing.Severity = severity
		existing.ObservedValue = val
		existing.DeviationPercentage = pct
		existing.ConsecutiveCount = consec
		return ad.saveAnomalyEvent(ctx, existing)
	}

	eventID := database.GenerateID(fmt.Sprintf("%s:%s:%d", targetID, metric, now.UnixNano()))
	event := &database.AnomalyEventRecord{
		ID:                  eventID,
		TargetID:            targetID,
		MetricType:          metric,
		LifecycleState:      lifecycle,
		Severity:            severity,
		ObservedValue:       val,
		ExpectedValue:       expected,
		DeviationPercentage: pct,
		ConsecutiveCount:    consec,
		DetectedAt:          now,
		Status:              "ACTIVE",
	}
	return ad.saveAnomalyEvent(ctx, event)
}

func (ad *AnomalyDetector) resolveActiveAnomaly(ctx context.Context, targetID, metric string, val float64) {
	existing, err := ad.GetActiveAnomalyEvent(ctx, targetID, metric)
	if err == nil && existing != nil {
		now := time.Now().UTC()
		existing.Status = "RESOLVED"
		existing.LifecycleState = "RESOLVED"
		existing.ResolvedAt = &now
		existing.ObservedValue = val
		_ = ad.saveAnomalyEvent(ctx, existing)
	}
}

func (ad *AnomalyDetector) saveAnomalyEvent(ctx context.Context, event *database.AnomalyEventRecord) error {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.SaveAnomalyEvent(ctx, event)
	}

	ad.mu.Lock()
	defer ad.mu.Unlock()
	key := fmt.Sprintf("%s:%s", event.TargetID, event.MetricType)
	if event.Status == "RESOLVED" {
		delete(ad.memAnomalyStates, key)
	} else {
		ad.memAnomalyStates[key] = event
	}
	return nil
}

func (ad *AnomalyDetector) GetActiveAnomalyEvent(ctx context.Context, targetID, metricType string) (*database.AnomalyEventRecord, error) {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.GetActiveAnomalyEvent(ctx, targetID, metricType)
	}

	ad.mu.RLock()
	defer ad.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", targetID, metricType)
	event, exists := ad.memAnomalyStates[key]
	if !exists {
		return nil, sql.ErrNoRows
	}
	return event, nil
}

func (ad *AnomalyDetector) incrementConsecutiveCount(ctx context.Context, key string) int {
	if ad.cacheService != nil && ad.cacheService.IsAvailable() {
		redisKey := fmt.Sprintf("webmetricsx:anomaly:consecutive:%s", key)
		var val int
		if err := ad.cacheService.Get(ctx, redisKey, &val); err == nil {
			val++
			_ = ad.cacheService.Set(ctx, redisKey, val, 1*time.Hour)
			return val
		}
		_ = ad.cacheService.Set(ctx, redisKey, 1, 1*time.Hour)
		return 1
	}

	ad.mu.Lock()
	defer ad.mu.Unlock()
	ad.memConsecutiveCounts[key]++
	return ad.memConsecutiveCounts[key]
}

func (ad *AnomalyDetector) resetConsecutiveCount(ctx context.Context, key string) {
	if ad.cacheService != nil && ad.cacheService.IsAvailable() {
		redisKey := fmt.Sprintf("webmetricsx:anomaly:consecutive:%s", key)
		_ = ad.cacheService.Delete(ctx, redisKey)
		return
	}

	ad.mu.Lock()
	defer ad.mu.Unlock()
	delete(ad.memConsecutiveCounts, key)
}

func (ad *AnomalyDetector) GetActiveAnomalies(ctx context.Context, targetID string) ([]*database.AnomalyEventRecord, error) {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.GetActiveAnomalies(ctx, targetID)
	}

	ad.mu.RLock()
	defer ad.mu.RUnlock()
	var list []*database.AnomalyEventRecord
	for _, ev := range ad.memAnomalyStates {
		if ev.TargetID == targetID && ev.Status == "ACTIVE" {
			list = append(list, ev)
		}
	}
	return list, nil
}

func (ad *AnomalyDetector) GetRecentAnomalies(ctx context.Context, targetID string, limit int) ([]*database.AnomalyEventRecord, error) {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.GetRecentAnomalies(ctx, targetID, limit)
	}

	// programmatically no recent history fallback required since stats resolves from active states
	return nil, nil
}

func (ad *AnomalyDetector) GetAnomalyStats(ctx context.Context, targetID string) (*database.AnomalyStatsRecord, error) {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.GetAnomalyStats(ctx, targetID)
	}

	return &database.AnomalyStatsRecord{
		SeverityCounts: make(map[string]int),
		MetricCounts:   make(map[string]int),
	}, nil
}

func (ad *AnomalyDetector) GetAnomalyHistory(ctx context.Context, targetID string, limit int) ([]*database.AnomalyEventRecord, error) {
	if ad.repo != nil && ad.repo.IsAvailable() {
		return ad.repo.GetRecentAnomalies(ctx, targetID, limit)
	}

	return nil, nil
}

func (ad *AnomalyDetector) GetLatestCheck(ctx context.Context, targetID string) (*monitoring.CheckResult, error) {
	if ad.cacheService != nil && ad.cacheService.IsAvailable() {
		cacheKey := fmt.Sprintf("webmetricsx:check:latest:%s", targetID)
		var check monitoring.CheckResult
		if err := ad.cacheService.Get(ctx, cacheKey, &check); err == nil {
			return &check, nil
		}
	}

	ad.mu.RLock()
	defer ad.mu.RUnlock()
	check, exists := ad.memLatestChecks[targetID]
	if !exists {
		return nil, fmt.Errorf("no recent checks found for target %s", targetID)
	}
	return check, nil
}

func (ad *AnomalyDetector) runRCA(check *monitoring.CheckResult, baseline *TargetBaseline) *monitoring.RCAData {
	if baseline == nil || baseline.InsufficientData {
		return nil
	}

	if !check.Available || check.StatusCode == 0 {
		return &monitoring.RCAData{
			LikelyCause:    "Origin/Network Outage",
			AffectedMetric: "availability",
			Evidence:       fmt.Sprintf("Probe failed to connect. Error: %s", check.ErrorMessage),
			Confidence:     95.0,
			Severity:       "CRITICAL",
		}
	}

	if check.StatusCode >= 500 {
		return &monitoring.RCAData{
			LikelyCause:    "Origin Server Failure",
			AffectedMetric: "status_code",
			Evidence:       fmt.Sprintf("Origin returned server status code %d", check.StatusCode),
			Confidence:     90.0,
			Severity:       "CRITICAL",
		}
	}

	dns := float64(check.DNSLatencyMs)
	tcp := float64(check.TCPLatencyMs)
	tls := float64(check.TLSLatencyMs)
	ttfb := float64(check.TTFBMs)
	resp := float64(check.ResponseTimeMs)

	var dnsMean, tcpMean, tlsMean, ttfbMean, respMean float64
	var dnsStd, tcpStd, tlsStd, ttfbStd, respStd float64

	if m, ok := baseline.Metrics["dns_latency"]; ok {
		dnsMean, dnsStd = m.Mean, m.StdDev
	}
	if m, ok := baseline.Metrics["tcp_latency"]; ok {
		tcpMean, tcpStd = m.Mean, m.StdDev
	}
	if m, ok := baseline.Metrics["tls_latency"]; ok {
		tlsMean, tlsStd = m.Mean, m.StdDev
	}
	if m, ok := baseline.Metrics["ttfb"]; ok {
		ttfbMean, ttfbStd = m.Mean, m.StdDev
	}
	if m, ok := baseline.Metrics["response_time"]; ok {
		respMean, respStd = m.Mean, m.StdDev
	}

	dnsDiff := dns - dnsMean
	tcpDiff := tcp - tcpMean
	tlsDiff := tls - tlsMean
	ttfbDiff := ttfb - ttfbMean
	respDiff := resp - respMean

	dnsHigh := dnsDiff > math.Max(15.0, dnsStd*2.5) && dns > dnsMean*1.5
	tcpHigh := tcpDiff > math.Max(15.0, tcpStd*2.5) && tcp > tcpMean*1.5
	tlsHigh := tlsDiff > math.Max(20.0, tlsStd*2.5) && tls > tlsMean*1.5
	ttfbHigh := ttfbDiff > math.Max(60.0, ttfbStd*2.5) && ttfb > ttfbMean*1.5

	if dnsHigh && !tcpHigh && !tlsHigh && !ttfbHigh {
		return &monitoring.RCAData{
			LikelyCause:    "DNS Latency",
			AffectedMetric: "dns_latency",
			Evidence:       fmt.Sprintf("DNS lookup took %dms (mean baseline %dms), while other handshake latency phases were normal", check.DNSLatencyMs, int(dnsMean)),
			Confidence:     85.0,
			Severity:       check.AnomalySeverity,
		}
	}

	if tcpHigh && !dnsHigh && !tlsHigh && !ttfbHigh {
		return &monitoring.RCAData{
			LikelyCause:    "Network/TCP Latency",
			AffectedMetric: "tcp_latency",
			Evidence:       fmt.Sprintf("TCP connect latency spiked to %dms (mean baseline %dms), suggesting raw network transport/congestion issue", check.TCPLatencyMs, int(tcpMean)),
			Confidence:     80.0,
			Severity:       check.AnomalySeverity,
		}
	}

	if tlsHigh && !tcpHigh && !dnsHigh && !ttfbHigh {
		return &monitoring.RCAData{
			LikelyCause:    "TLS/SSL Handshake Latency",
			AffectedMetric: "tls_latency",
			Evidence:       fmt.Sprintf("TLS Handshake negotiation took %dms (mean baseline %dms), indicating SSL negotiation overhead or cryptographic delay", check.TLSLatencyMs, int(tlsMean)),
			Confidence:     85.0,
			Severity:       check.AnomalySeverity,
		}
	}

	if ttfbHigh && !dnsHigh && !tcpHigh && !tlsHigh {
		return &monitoring.RCAData{
			LikelyCause:    "Origin Server Latency",
			AffectedMetric: "ttfb",
			Evidence:       fmt.Sprintf("Time To First Byte (TTFB) spiked to %dms (mean baseline %dms), while DNS/TCP/TLS handshake components remained healthy", check.TTFBMs, int(ttfbMean)),
			Confidence:     90.0,
			Severity:       check.AnomalySeverity,
		}
	}

	networkPhasesHighCount := 0
	if dnsHigh {
		networkPhasesHighCount++
	}
	if tcpHigh {
		networkPhasesHighCount++
	}
	if tlsHigh {
		networkPhasesHighCount++
	}

	if networkPhasesHighCount >= 2 {
		return &monitoring.RCAData{
			LikelyCause:    "Network Degradation",
			AffectedMetric: "response_time",
			Evidence:       fmt.Sprintf("Multiple network transport components (DNS: %dms, TCP: %dms, TLS: %dms) are highly degraded", check.DNSLatencyMs, check.TCPLatencyMs, check.TLSLatencyMs),
			Confidence:     75.0,
			Severity:       check.AnomalySeverity,
		}
	}

	if respDiff > respStd*2.0 {
		return &monitoring.RCAData{
			LikelyCause:    "Unspecified Latency Spike",
			AffectedMetric: "response_time",
			Evidence:       fmt.Sprintf("Total response time spiked to %dms (mean baseline %dms) due to minor increases across multiple connection segments", check.ResponseTimeMs, int(respMean)),
			Confidence:     55.0,
			Severity:       check.AnomalySeverity,
		}
	}

	return nil
}

func (ad *AnomalyDetector) runRegressionDetection(check *monitoring.CheckResult, baseline *TargetBaseline) []monitoring.PerformanceRegression {
	if baseline == nil || baseline.InsufficientData {
		return nil
	}

	var regressions []monitoring.PerformanceRegression

	metrics := []string{"response_time", "ttfb", "dns_latency", "tcp_latency", "tls_latency"}
	minDiffs := map[string]float64{
		"response_time": 50.0,
		"ttfb":          40.0,
		"dns_latency":   15.0,
		"tcp_latency":   15.0,
		"tls_latency":   15.0,
	}

	for _, metricKey := range metrics {
		bm, exists := baseline.Metrics[metricKey]
		if !exists {
			continue
		}

		var val float64
		switch metricKey {
		case "response_time":
			val = float64(check.ResponseTimeMs)
		case "ttfb":
			val = float64(check.TTFBMs)
		case "dns_latency":
			val = float64(check.DNSLatencyMs)
		case "tcp_latency":
			val = float64(check.TCPLatencyMs)
		case "tls_latency":
			val = float64(check.TLSLatencyMs)
		}

		mean := bm.Mean
		diff := val - mean
		pct := 0.0
		if mean > 0 {
			pct = (diff / mean) * 100.0
		}

		status := "Normal"
		if diff > minDiffs[metricKey] && pct > 50.0 {
			status = "Performance Regression"
		}

		regressions = append(regressions, monitoring.PerformanceRegression{
			MetricType:       metricKey,
			BaselineValue:    mean,
			CurrentValue:     val,
			PercentageChange: pct,
			Status:           status,
		})
	}

	return regressions
}
