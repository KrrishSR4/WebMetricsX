package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

type Repository struct {
	db     *DB
	logger *slog.Logger
}

type LatencyBucket struct {
	Label string `json:"label"`
	MinMs int64  `json:"min_ms"`
	MaxMs int64  `json:"max_ms"`
	Count int    `json:"count"`
}

type PhaseBreakdown struct {
	DNSMs       int64   `json:"dns_ms"`
	DNSPct      float64 `json:"dns_pct"`
	TCPMs       int64   `json:"tcp_ms"`
	TCPPct      float64 `json:"tcp_pct"`
	TLSMs       int64   `json:"tls_ms"`
	TLSPct      float64 `json:"tls_pct"`
	TTFBMs      int64   `json:"ttfb_ms"`
	TTFBPct     float64 `json:"ttfb_pct"`
	DownloadMs  int64   `json:"download_ms"`
	DownloadPct float64 `json:"download_pct"`
	TotalMs     int64   `json:"total_ms"`
}

type StatusDistribution struct {
	StatusCode int    `json:"status_code"`
	Category   string `json:"category"`
	Count      int    `json:"count"`
}

type HeatmapCell struct {
	DayOfWeek string `json:"day_of_week"`
	HourOfDay int    `json:"hour_of_day"`
	AvgMs     int64  `json:"avg_ms"`
	P95Ms     int64  `json:"p95_ms"`
	Count     int    `json:"count"`
}

type KPIComparison struct {
	UptimePctDiff     float64 `json:"uptime_pct_diff"`
	AvgResponseDiffMs int64   `json:"avg_response_diff_ms"`
	P95ResponseDiffMs int64   `json:"p95_response_diff_ms"`
	P99ResponseDiffMs int64   `json:"p99_response_diff_ms"`
	AvgTTFBDiffMs     int64   `json:"avg_ttfb_diff_ms"`
}

type AnalyticsSummary struct {
	TargetURL          string                    `json:"target_url"`
	TimeRange          string                    `json:"time_range"`
	TotalChecks        int                       `json:"total_checks"`
	SuccessfulChecks   int                       `json:"successful_checks"`
	FailedChecks       int                       `json:"failed_checks"`
	DegradedChecks     int                       `json:"degraded_checks"`
	UptimePercentage   float64                   `json:"uptime_percentage"`
	AvgResponseTimeMs  int64                     `json:"avg_response_time_ms"`
	P50ResponseTimeMs  int64                     `json:"p50_response_time_ms"`
	P75ResponseTimeMs  int64                     `json:"p75_response_time_ms"`
	P95ResponseTimeMs  int64                     `json:"p95_response_time_ms"`
	P99ResponseTimeMs  int64                     `json:"p99_response_time_ms"`
	MinResponseTimeMs  int64                     `json:"min_response_time_ms"`
	MaxResponseTimeMs  int64                     `json:"max_response_time_ms"`
	AvgTTFBMs          int64                     `json:"avg_ttfb_ms"`
	P50TTFBMs          int64                     `json:"p50_ttfb_ms"`
	P95TTFBMs          int64                     `json:"p95_ttfb_ms"`
	P99TTFBMs          int64                     `json:"p99_ttfb_ms"`
	LongestIncidentSec int64                     `json:"longest_incident_sec"`
	LatencyBuckets     []LatencyBucket           `json:"latency_buckets"`
	PhaseBreakdown     PhaseBreakdown            `json:"phase_breakdown"`
	StatusDistribution []StatusDistribution      `json:"status_distribution"`
	Heatmap            []HeatmapCell             `json:"heatmap"`
	Comparison         *KPIComparison            `json:"comparison,omitempty"`
	History            []*monitoring.CheckResult `json:"history"`
}

func NewRepository(db *DB, logger *slog.Logger) *Repository {
	return &Repository{
		db:     db,
		logger: logger,
	}
}

func GenerateID(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:16])
}

type TargetRecord struct {
	ID          string    `json:"id"`
	URL         string    `json:"url"`
	Name        string    `json:"name"`
	IsActive    bool      `json:"is_active"`
	IntervalSec int       `json:"interval_sec"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UpsertTarget creates or updates a target in PostgreSQL with active status and interval
func (r *Repository) UpsertTarget(ctx context.Context, targetURL string, intervalSec int, isActive bool) (string, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return GenerateID(targetURL), nil
	}

	targetID := GenerateID(targetURL)
	now := time.Now().UTC()

	query := `
		INSERT INTO targets (id, url, name, is_active, interval_sec, updated_at)
		VALUES ($1, $2, $2, $3, $4, $5)
		ON CONFLICT (url) DO UPDATE SET
			is_active = EXCLUDED.is_active,
			interval_sec = EXCLUDED.interval_sec,
			updated_at = EXCLUDED.updated_at
		RETURNING id;
	`

	var actualID string
	err := r.db.Pool().QueryRowContext(ctx, query, targetID, targetURL, isActive, intervalSec, now).Scan(&actualID)
	if err != nil {
		r.logger.Warn("Failed to upsert target record", slog.String("url", targetURL), slog.String("error", err.Error()))
		return targetID, err
	}

	return actualID, nil
}

// SetTargetActiveStatus updates the active monitoring status of a target
func (r *Repository) SetTargetActiveStatus(ctx context.Context, targetURL string, isActive bool) error {
	if r.db == nil || !r.db.IsAvailable() {
		return nil
	}

	query := `UPDATE targets SET is_active = $1, updated_at = $2 WHERE url = $3;`
	_, err := r.db.Pool().ExecContext(ctx, query, isActive, time.Now().UTC(), targetURL)
	return err
}

// GetActiveTargets retrieves all targets marked as active for automatic worker recovery on boot
func (r *Repository) GetActiveTargets(ctx context.Context) ([]*TargetRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return []*TargetRecord{}, nil
	}

	query := `SELECT id, url, name, is_active, interval_sec, created_at, updated_at FROM targets WHERE is_active = TRUE;`
	rows, err := r.db.Pool().QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []*TargetRecord
	for rows.Next() {
		var t TargetRecord
		if err := rows.Scan(&t.ID, &t.URL, &t.Name, &t.IsActive, &t.IntervalSec, &t.CreatedAt, &t.UpdatedAt); err == nil {
			targets = append(targets, &t)
		}
	}
	return targets, nil
}

// SaveCheckResult persists check telemetry into Neon PostgreSQL
func (r *Repository) SaveCheckResult(ctx context.Context, res *monitoring.CheckResult) error {
	if r.db == nil || !r.db.IsAvailable() {
		r.logger.Debug("Database unavailable; skipping check result persistence")
		return nil
	}

	targetID := res.TargetID
	if targetID == "" {
		targetID = GenerateID(res.URL)
	}

	// Ensure target record exists
	targetQuery := `
		INSERT INTO targets (id, url, name, updated_at)
		VALUES ($1, $2, $2, $3)
		ON CONFLICT (url) DO UPDATE SET updated_at = EXCLUDED.updated_at
		RETURNING id;
	`
	var actualTargetID string
	err := r.db.Pool().QueryRowContext(ctx, targetQuery, targetID, res.URL, res.CheckedAt).Scan(&actualTargetID)
	if err != nil {
		r.logger.Warn("Failed to upsert target", slog.String("url", res.URL), slog.String("error", err.Error()))
		actualTargetID = targetID
	}

	resultID := GenerateID(fmt.Sprintf("%s-%d", res.URL, res.CheckedAt.UnixNano()))

	insertQuery := `
		INSERT INTO check_results (
			id, target_id, url, available, status_code,
			dns_latency_ms, tcp_latency_ms, tls_latency_ms, ttfb_ms, response_time_ms,
			ssl_valid, ssl_expiry_date, ssl_issuer, error_message, checked_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15
		);
	`

	var expiryVal *time.Time
	if res.SSLExpiryDate != nil {
		expiryVal = res.SSLExpiryDate
	}

	_, err = r.db.Pool().ExecContext(
		ctx,
		insertQuery,
		resultID,
		actualTargetID,
		res.URL,
		res.Available,
		res.StatusCode,
		res.DNSLatencyMs,
		res.TCPLatencyMs,
		res.TLSLatencyMs,
		res.TTFBMs,
		res.ResponseTimeMs,
		res.SSLValid,
		expiryVal,
		res.SSLIssuer,
		res.ErrorMessage,
		res.CheckedAt,
	)

	if err != nil {
		r.logger.Warn("Failed to insert check result into database", slog.String("url", res.URL), slog.String("error", err.Error()))
		return err
	}

	return nil
}

// ParseTimeRange parses duration strings like 1h, 6h, 24h, 7d, 30d
func ParseTimeRange(timeRange string) time.Duration {
	switch strings.ToLower(timeRange) {
	case "1h":
		return 1 * time.Hour
	case "6h":
		return 6 * time.Hour
	case "24h", "1d":
		return 24 * time.Hour
	case "7d":
		return 7 * 24 * time.Hour
	case "30d":
		return 30 * 24 * time.Hour
	default:
		return 24 * time.Hour
	}
}

// GetMonitoredTargets retrieves distinct target URLs stored in database
func (r *Repository) GetMonitoredTargets(ctx context.Context) ([]string, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return []string{}, nil
	}

	query := `SELECT DISTINCT url FROM targets ORDER BY url ASC;`
	rows, err := r.db.Pool().QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []string
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err == nil {
			targets = append(targets, u)
		}
	}
	return targets, nil
}

// GetCheckHistory retrieves historical check results for a target URL
func (r *Repository) GetCheckHistory(ctx context.Context, targetURL string, duration time.Duration) ([]*monitoring.CheckResult, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return []*monitoring.CheckResult{}, nil
	}

	since := time.Now().UTC().Add(-duration)
	query := `
		SELECT id, target_id, url, available, status_code,
		       dns_latency_ms, tcp_latency_ms, tls_latency_ms, ttfb_ms, response_time_ms,
		       ssl_valid, ssl_expiry_date, ssl_issuer, COALESCE(error_message, ''), checked_at
		FROM check_results
		WHERE url = $1 AND checked_at >= $2
		ORDER BY checked_at ASC;
	`

	rows, err := r.db.Pool().QueryContext(ctx, query, targetURL, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []*monitoring.CheckResult
	for rows.Next() {
		var res monitoring.CheckResult
		var resultID string
		var expiry *time.Time

		err := rows.Scan(
			&resultID, &res.TargetID, &res.URL, &res.Available, &res.StatusCode,
			&res.DNSLatencyMs, &res.TCPLatencyMs, &res.TLSLatencyMs, &res.TTFBMs, &res.ResponseTimeMs,
			&res.SSLValid, &expiry, &res.SSLIssuer, &res.ErrorMessage, &res.CheckedAt,
		)
		if err == nil {
			res.SSLExpiryDate = expiry
			history = append(history, &res)
		}
	}

	return history, nil
}

// GetAnalyticsSummary calculates complete real observability statistics from PostgreSQL history
func (r *Repository) GetAnalyticsSummary(ctx context.Context, targetURL string, timeRange string) (*AnalyticsSummary, error) {
	dur := ParseTimeRange(timeRange)
	history, err := r.GetCheckHistory(ctx, targetURL, dur)
	if err != nil {
		r.logger.Warn("Failed to fetch check history", slog.String("url", targetURL), slog.String("error", err.Error()))
	}

	summary := &AnalyticsSummary{
		TargetURL: targetURL,
		TimeRange: timeRange,
		History:   history,
	}

	if len(history) == 0 {
		// Initialize empty buckets & structure
		summary.LatencyBuckets = defaultLatencyBuckets(nil)
		return summary, nil
	}

	// Compute metrics from history array
	var totalResp, totalTTFB int64
	var totalDNS, totalTCP, totalTLS int64
	var successCount, degradedCount, failedCount int
	var respTimes []int64
	var ttfbTimes []int64
	statusCounts := make(map[int]int)

	for _, item := range history {
		respTimes = append(respTimes, item.ResponseTimeMs)
		ttfbTimes = append(ttfbTimes, item.TTFBMs)

		totalResp += item.ResponseTimeMs
		totalTTFB += item.TTFBMs
		totalDNS += item.DNSLatencyMs
		totalTCP += item.TCPLatencyMs
		totalTLS += item.TLSLatencyMs

		statusCounts[item.StatusCode]++

		if item.Available {
			if item.ResponseTimeMs > 400 || item.StatusCode >= 300 {
				degradedCount++
			} else {
				successCount++
			}
		} else {
			failedCount++
		}
	}

	total := len(history)
	summary.TotalChecks = total
	summary.SuccessfulChecks = successCount
	summary.DegradedChecks = degradedCount
	summary.FailedChecks = failedCount
	summary.UptimePercentage = (float64(successCount+degradedCount) / float64(total)) * 100.0

	summary.AvgResponseTimeMs = totalResp / int64(total)
	summary.AvgTTFBMs = totalTTFB / int64(total)

	sort.Slice(respTimes, func(i, j int) bool { return respTimes[i] < respTimes[j] })
	sort.Slice(ttfbTimes, func(i, j int) bool { return ttfbTimes[i] < ttfbTimes[j] })

	summary.MinResponseTimeMs = respTimes[0]
	summary.MaxResponseTimeMs = respTimes[len(respTimes)-1]
	summary.P50ResponseTimeMs = percentile(respTimes, 50)
	summary.P75ResponseTimeMs = percentile(respTimes, 75)
	summary.P95ResponseTimeMs = percentile(respTimes, 95)
	summary.P99ResponseTimeMs = percentile(respTimes, 99)

	summary.P50TTFBMs = percentile(ttfbTimes, 50)
	summary.P95TTFBMs = percentile(ttfbTimes, 95)
	summary.P99TTFBMs = percentile(ttfbTimes, 99)

	// Histograms
	summary.LatencyBuckets = defaultLatencyBuckets(respTimes)

	// Phase Breakdown
	avgDNS := totalDNS / int64(total)
	avgTCP := totalTCP / int64(total)
	avgTLS := totalTLS / int64(total)
	avgTTFB := totalTTFB / int64(total)
	avgTotal := totalResp / int64(total)
	avgDownload := avgTotal - avgTTFB
	if avgDownload < 0 {
		avgDownload = 0
	}

	var dnsPct, tcpPct, tlsPct, ttfbPct, dlPct float64
	if avgTotal > 0 {
		dnsPct = (float64(avgDNS) / float64(avgTotal)) * 100
		tcpPct = (float64(avgTCP) / float64(avgTotal)) * 100
		tlsPct = (float64(avgTLS) / float64(avgTotal)) * 100
		ttfbPct = (float64(avgTTFB) / float64(avgTotal)) * 100
		dlPct = (float64(avgDownload) / float64(avgTotal)) * 100
	}

	summary.PhaseBreakdown = PhaseBreakdown{
		DNSMs:       avgDNS,
		DNSPct:      dnsPct,
		TCPMs:       avgTCP,
		TCPPct:      tcpPct,
		TLSMs:       avgTLS,
		TLSPct:      tlsPct,
		TTFBMs:      avgTTFB,
		TTFBPct:     ttfbPct,
		DownloadMs:  avgDownload,
		DownloadPct: dlPct,
		TotalMs:     avgTotal,
	}

	// Status Code Distribution
	for code, cnt := range statusCounts {
		cat := "2xx Success"
		if code >= 300 && code < 400 {
			cat = "3xx Redirect"
		} else if code >= 400 && code < 500 {
			cat = "4xx Client Error"
		} else if code >= 500 {
			cat = "5xx Server Error"
		} else if code == 0 {
			cat = "Connection Error"
		}
		summary.StatusDistribution = append(summary.StatusDistribution, StatusDistribution{
			StatusCode: code,
			Category:   cat,
			Count:      cnt,
		})
	}

	// Heatmap Generation (24h x 7d Matrix)
	summary.Heatmap = generateHeatmap(history)

	return summary, nil
}

func percentile(sortedVals []int64, pct float64) int64 {
	if len(sortedVals) == 0 {
		return 0
	}
	idx := int((pct / 100.0) * float64(len(sortedVals)-1))
	if idx >= len(sortedVals) {
		idx = len(sortedVals) - 1
	}
	return sortedVals[idx]
}

func defaultLatencyBuckets(respTimes []int64) []LatencyBucket {
	buckets := []LatencyBucket{
		{Label: "0-50ms", MinMs: 0, MaxMs: 50, Count: 0},
		{Label: "50-100ms", MinMs: 50, MaxMs: 100, Count: 0},
		{Label: "100-200ms", MinMs: 100, MaxMs: 200, Count: 0},
		{Label: "200-300ms", MinMs: 200, MaxMs: 300, Count: 0},
		{Label: "300-500ms", MinMs: 300, MaxMs: 500, Count: 0},
		{Label: "500ms-1s", MinMs: 500, MaxMs: 1000, Count: 0},
		{Label: "1s+", MinMs: 1000, MaxMs: 999999, Count: 0},
	}

	for _, val := range respTimes {
		for i := range buckets {
			if val >= buckets[i].MinMs && val < buckets[i].MaxMs {
				buckets[i].Count++
				break
			}
		}
	}
	return buckets
}

func generateHeatmap(history []*monitoring.CheckResult) []HeatmapCell {
	type key struct {
		day  string
		hour int
	}
	groups := make(map[key][]int64)

	days := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}

	for _, item := range history {
		t := item.CheckedAt.Local()
		dayStr := days[t.Weekday()]
		k := key{day: dayStr, hour: t.Hour()}
		groups[k] = append(groups[k], item.ResponseTimeMs)
	}

	var cells []HeatmapCell
	for _, day := range days {
		for hour := 0; hour < 24; hour++ {
			k := key{day: day, hour: hour}
			vals := groups[k]
			count := len(vals)
			var avg, p95 int64
			if count > 0 {
				var sum int64
				for _, v := range vals {
					sum += v
				}
				avg = sum / int64(count)
				sort.Slice(vals, func(i, j int) bool { return vals[i] < vals[j] })
				p95 = percentile(vals, 95)
			}
			cells = append(cells, HeatmapCell{
				DayOfWeek: day,
				HourOfDay: hour,
				AvgMs:     avg,
				P95Ms:     p95,
				Count:     count,
			})
		}
	}
	return cells
}
