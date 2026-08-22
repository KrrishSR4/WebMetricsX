package database

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type DBBaselineMetric struct {
	MetricType  string  `json:"metric_type"`
	Mean        float64 `json:"mean"`
	Median      float64 `json:"median"`
	P95         float64 `json:"p95"`
	P99         float64 `json:"p99"`
	Min         float64 `json:"min"`
	Max         float64 `json:"max"`
	StdDev      float64 `json:"stddev"`
	SampleCount int     `json:"sample_count"`
}

type AnomalyEventRecord struct {
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
	Status              string     `json:"status"`
}

type AnomalyStatsRecord struct {
	TotalDetected     int            `json:"total_detected"`
	TotalResolved     int            `json:"total_resolved"`
	MeanResolutionSec float64        `json:"mean_resolution_sec"`
	SeverityCounts    map[string]int `json:"severity_counts"`
	MetricCounts      map[string]int `json:"metric_counts"`
}

// ComputeBaselineFromHistory calculates the baseline statistics for a target URL natively using PostgreSQL
func (r *Repository) ComputeBaselineFromHistory(ctx context.Context, targetID string, since time.Time) (map[string]*DBBaselineMetric, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, fmt.Errorf("database unavailable")
	}

	// We calculate baseline metrics for: response_time_ms, ttfb_ms, dns_latency_ms, tcp_latency_ms, tls_latency_ms
	metrics := []string{"response_time_ms", "ttfb_ms", "dns_latency_ms", "tcp_latency_ms", "tls_latency_ms"}
	results := make(map[string]*DBBaselineMetric)

	for _, metric := range metrics {
		query := fmt.Sprintf(`
			SELECT 
				COALESCE(AVG(%[1]s), 0) as avg_val,
				COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY %[1]s), 0) as p50_val,
				COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY %[1]s), 0) as p95_val,
				COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY %[1]s), 0) as p99_val,
				COALESCE(MIN(%[1]s), 0) as min_val,
				COALESCE(MAX(%[1]s), 0) as max_val,
				COALESCE(STDDEV_SAMP(%[1]s), 0) as stddev_val,
				COUNT(*) as sample_count
			FROM check_results
			WHERE target_id = $1 AND checked_at >= $2 AND available = TRUE;
		`, metric)

		var mean, median, p95, p99, minVal, maxVal, stddev float64
		var sampleCount int

		err := r.db.Pool().QueryRowContext(ctx, query, targetID, since).Scan(
			&mean, &median, &p95, &p99, &minVal, &maxVal, &stddev, &sampleCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to compute baseline for metric %s: %w", metric, err)
		}

		// Normalize metric key for json consistency (e.g. response_time_ms -> response_time)
		key := strings.TrimSuffix(metric, "_ms")

		results[key] = &DBBaselineMetric{
			MetricType:  key,
			Mean:        mean,
			Median:      median,
			P95:         p95,
			P99:         p99,
			Min:         minVal,
			Max:         maxVal,
			StdDev:      stddev,
			SampleCount: sampleCount,
		}
	}

	return results, nil
}

// UpsertBaseline stores or updates calculated baseline values for a specific window
func (r *Repository) UpsertBaseline(ctx context.Context, targetID, window string, metric *DBBaselineMetric) error {
	if r.db == nil || !r.db.IsAvailable() {
		return nil
	}

	id := GenerateID(fmt.Sprintf("%s:%s:%s", targetID, window, metric.MetricType))
	query := `
		INSERT INTO baselines (id, target_id, time_window, metric_type, mean_value, median_value, p95_value, p99_value, min_value, max_value, stddev_value, sample_count, calculated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
		ON CONFLICT (target_id, time_window, metric_type) DO UPDATE SET
			mean_value = EXCLUDED.mean_value,
			median_value = EXCLUDED.median_value,
			p95_value = EXCLUDED.p95_value,
			p99_value = EXCLUDED.p99_value,
			min_value = EXCLUDED.min_value,
			max_value = EXCLUDED.max_value,
			stddev_value = EXCLUDED.stddev_value,
			sample_count = EXCLUDED.sample_count,
			calculated_at = CURRENT_TIMESTAMP;
	`
	_, err := r.db.Pool().ExecContext(ctx, query, id, targetID, window, metric.MetricType, metric.Mean, metric.Median, metric.P95, metric.P99, metric.Min, metric.Max, metric.StdDev, metric.SampleCount)
	return err
}

// GetBaseline retrieves the latest calculated baseline statistics for a target URL and window
func (r *Repository) GetBaseline(ctx context.Context, targetID, window string) (map[string]*DBBaselineMetric, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, fmt.Errorf("database unavailable")
	}

	query := `
		SELECT metric_type, mean_value, median_value, p95_value, p99_value, min_value, max_value, stddev_value, sample_count
		FROM baselines
		WHERE target_id = $1 AND time_window = $2;
	`
	rows, err := r.db.Pool().QueryContext(ctx, query, targetID, window)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	baselines := make(map[string]*DBBaselineMetric)
	for rows.Next() {
		var metricType string
		var mean, median, p95, p99, minVal, maxVal, stddev float64
		var sampleCount int

		if err := rows.Scan(&metricType, &mean, &median, &p95, &p99, &minVal, &maxVal, &stddev, &sampleCount); err != nil {
			return nil, err
		}

		baselines[metricType] = &DBBaselineMetric{
			MetricType:  metricType,
			Mean:        mean,
			Median:      median,
			P95:         p95,
			P99:         p99,
			Min:         minVal,
			Max:         maxVal,
			StdDev:      stddev,
			SampleCount: sampleCount,
		}
	}

	return baselines, nil
}

// SaveAnomalyEvent records or updates an anomaly event in the database
func (r *Repository) SaveAnomalyEvent(ctx context.Context, event *AnomalyEventRecord) error {
	if r.db == nil || !r.db.IsAvailable() {
		return nil
	}

	query := `
		INSERT INTO anomaly_events (id, target_id, metric_type, lifecycle_state, severity, observed_value, expected_value, deviation_percentage, consecutive_count, detected_at, resolved_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (id) DO UPDATE SET
			lifecycle_state = EXCLUDED.lifecycle_state,
			severity = EXCLUDED.severity,
			observed_value = EXCLUDED.observed_value,
			deviation_percentage = EXCLUDED.deviation_percentage,
			consecutive_count = EXCLUDED.consecutive_count,
			resolved_at = EXCLUDED.resolved_at,
			status = EXCLUDED.status;
	`
	var resolvedAt interface{} = nil
	if event.ResolvedAt != nil {
		resolvedAt = *event.ResolvedAt
	}

	_, err := r.db.Pool().ExecContext(ctx, query, event.ID, event.TargetID, event.MetricType, event.LifecycleState, event.Severity, event.ObservedValue, event.ExpectedValue, event.DeviationPercentage, event.ConsecutiveCount, event.DetectedAt, resolvedAt, event.Status)
	return err
}

// GetActiveAnomalyEvent retrieves the active anomaly event for a target and metric type, if any
func (r *Repository) GetActiveAnomalyEvent(ctx context.Context, targetID, metricType string) (*AnomalyEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, sql.ErrNoRows
	}

	query := `
		SELECT id, target_id, metric_type, lifecycle_state, severity, observed_value, expected_value, deviation_percentage, consecutive_count, detected_at, resolved_at, status
		FROM anomaly_events
		WHERE target_id = $1 AND metric_type = $2 AND status = 'ACTIVE'
		LIMIT 1;
	`
	var ev AnomalyEventRecord
	var resolvedAt sql.NullTime

	err := r.db.Pool().QueryRowContext(ctx, query, targetID, metricType).Scan(
		&ev.ID, &ev.TargetID, &ev.MetricType, &ev.LifecycleState, &ev.Severity,
		&ev.ObservedValue, &ev.ExpectedValue, &ev.DeviationPercentage, &ev.ConsecutiveCount,
		&ev.DetectedAt, &resolvedAt, &ev.Status,
	)
	if err != nil {
		return nil, err
	}

	if resolvedAt.Valid {
		ev.ResolvedAt = &resolvedAt.Time
	}

	return &ev, nil
}

// GetActiveAnomalies returns all active anomalies for a target
func (r *Repository) GetActiveAnomalies(ctx context.Context, targetID string) ([]*AnomalyEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, nil
	}

	query := `
		SELECT id, target_id, metric_type, lifecycle_state, severity, observed_value, expected_value, deviation_percentage, consecutive_count, detected_at, resolved_at, status
		FROM anomaly_events
		WHERE target_id = $1 AND status = 'ACTIVE'
		ORDER BY detected_at DESC;
	`
	rows, err := r.db.Pool().QueryContext(ctx, query, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]*AnomalyEventRecord, 0)
	for rows.Next() {
		var ev AnomalyEventRecord
		var resolvedAt sql.NullTime

		if err := rows.Scan(
			&ev.ID, &ev.TargetID, &ev.MetricType, &ev.LifecycleState, &ev.Severity,
			&ev.ObservedValue, &ev.ExpectedValue, &ev.DeviationPercentage, &ev.ConsecutiveCount,
			&ev.DetectedAt, &resolvedAt, &ev.Status,
		); err != nil {
			return nil, err
		}

		if resolvedAt.Valid {
			ev.ResolvedAt = &resolvedAt.Time
		}
		events = append(events, &ev)
	}

	return events, nil
}

// GetRecentAnomalies fetches the last N anomaly events (resolved or active) for a target
func (r *Repository) GetRecentAnomalies(ctx context.Context, targetID string, limit int) ([]*AnomalyEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, nil
	}

	query := `
		SELECT id, target_id, metric_type, lifecycle_state, severity, observed_value, expected_value, deviation_percentage, consecutive_count, detected_at, resolved_at, status
		FROM anomaly_events
		WHERE target_id = $1
		ORDER BY detected_at DESC
		LIMIT $2;
	`
	rows, err := r.db.Pool().QueryContext(ctx, query, targetID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]*AnomalyEventRecord, 0)
	for rows.Next() {
		var ev AnomalyEventRecord
		var resolvedAt sql.NullTime

		if err := rows.Scan(
			&ev.ID, &ev.TargetID, &ev.MetricType, &ev.LifecycleState, &ev.Severity,
			&ev.ObservedValue, &ev.ExpectedValue, &ev.DeviationPercentage, &ev.ConsecutiveCount,
			&ev.DetectedAt, &resolvedAt, &ev.Status,
		); err != nil {
			return nil, err
		}

		if resolvedAt.Valid {
			ev.ResolvedAt = &resolvedAt.Time
		}
		events = append(events, &ev)
	}

	return events, nil
}

// GetAnomalyStats retrieves high level anomaly statistics for a target URL
func (r *Repository) GetAnomalyStats(ctx context.Context, targetID string) (*AnomalyStatsRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return &AnomalyStatsRecord{
			SeverityCounts: make(map[string]int),
			MetricCounts:   make(map[string]int),
		}, nil
	}

	stats := &AnomalyStatsRecord{
		SeverityCounts: make(map[string]int),
		MetricCounts:   make(map[string]int),
	}

	// 1. Basic counts and duration
	queryBasic := `
		SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
			COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))), 0) as avg_resolution
		FROM anomaly_events
		WHERE target_id = $1;
	`
	err := r.db.Pool().QueryRowContext(ctx, queryBasic, targetID).Scan(
		&stats.TotalDetected, &stats.TotalResolved, &stats.MeanResolutionSec,
	)
	if err != nil {
		return nil, err
	}

	// 2. Severity Counts
	querySeverity := `
		SELECT severity, COUNT(*)
		FROM anomaly_events
		WHERE target_id = $1
		GROUP BY severity;
	`
	rowsSev, err := r.db.Pool().QueryContext(ctx, querySeverity, targetID)
	if err != nil {
		return nil, err
	}
	defer rowsSev.Close()
	for rowsSev.Next() {
		var sev string
		var count int
		if err := rowsSev.Scan(&sev, &count); err == nil {
			stats.SeverityCounts[sev] = count
		}
	}

	// 3. Metric Counts
	queryMetric := `
		SELECT metric_type, COUNT(*)
		FROM anomaly_events
		WHERE target_id = $1
		GROUP BY metric_type;
	`
	rowsMet, err := r.db.Pool().QueryContext(ctx, queryMetric, targetID)
	if err != nil {
		return nil, err
	}
	defer rowsMet.Close()
	for rowsMet.Next() {
		var met string
		var count int
		if err := rowsMet.Scan(&met, &count); err == nil {
			stats.MetricCounts[met] = count
		}
	}

	return stats, nil
}
