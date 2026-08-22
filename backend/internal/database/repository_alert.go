package database

import (
	"context"
	"database/sql"
	"time"
)

type AlertEventRecord struct {
	ID                 string     `json:"id"`
	TargetID           string     `json:"target_id"`
	AlertType          string     `json:"alert_type"`
	Severity           string     `json:"severity"`
	Title              string     `json:"title"`
	Message            string     `json:"message"`
	AffectedMetric     string     `json:"affected_metric"`
	CurrentValue       float64    `json:"current_value"`
	ThresholdValue     float64    `json:"threshold_value"`
	RCACause           *string    `json:"rca_cause,omitempty"`
	RCAEvidence        *string    `json:"rca_evidence,omitempty"`
	Timestamp          time.Time  `json:"timestamp"`
	Status             string     `json:"status"`              // TRIGGERED, ACTIVE, RESOLVED
	NotificationStatus string     `json:"notification_status"` // SENT, FAILED, PENDING, SKIPPED
	ConsecutiveCount   int        `json:"consecutive_count"`
	ResolvedAt         *time.Time `json:"resolved_at,omitempty"`
}

// SaveAlertEvent inserts or updates an alert event record in database
func (r *Repository) SaveAlertEvent(ctx context.Context, a *AlertEventRecord) error {
	if r.db == nil || !r.db.IsAvailable() {
		return nil
	}

	query := `
		INSERT INTO alert_events (
			id, target_id, alert_type, severity, title, message, affected_metric,
			current_value, threshold_value, rca_cause, rca_evidence, timestamp,
			status, notification_status, consecutive_count, resolved_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status,
			notification_status = EXCLUDED.notification_status,
			consecutive_count = EXCLUDED.consecutive_count,
			resolved_at = EXCLUDED.resolved_at,
			current_value = EXCLUDED.current_value
	`
	_, err := r.db.Pool().ExecContext(ctx, query,
		a.ID, a.TargetID, a.AlertType, a.Severity, a.Title, a.Message, a.AffectedMetric,
		a.CurrentValue, a.ThresholdValue, a.RCACause, a.RCAEvidence, a.Timestamp,
		a.Status, a.NotificationStatus, a.ConsecutiveCount, a.ResolvedAt,
	)
	return err
}

// GetActiveAlerts returns active incidents/alerts of a target
func (r *Repository) GetActiveAlerts(ctx context.Context, targetID string) ([]*AlertEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, nil
	}

	query := `
		SELECT id, target_id, alert_type, severity, title, message, affected_metric,
		       current_value, threshold_value, rca_cause, rca_evidence, timestamp,
		       status, notification_status, consecutive_count, resolved_at
		FROM alert_events
		WHERE target_id = $1 AND status != 'RESOLVED'
		ORDER BY timestamp DESC
	`
	rows, err := r.db.Pool().QueryContext(ctx, query, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*AlertEventRecord
	for rows.Next() {
		var a AlertEventRecord
		err := rows.Scan(
			&a.ID, &a.TargetID, &a.AlertType, &a.Severity, &a.Title, &a.Message, &a.AffectedMetric,
			&a.CurrentValue, &a.ThresholdValue, &a.RCACause, &a.RCAEvidence, &a.Timestamp,
			&a.Status, &a.NotificationStatus, &a.ConsecutiveCount, &a.ResolvedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, nil
}

// GetRecentAlerts returns historical alert event logs
func (r *Repository) GetRecentAlerts(ctx context.Context, targetID string, limit int) ([]*AlertEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, nil
	}

	query := `
		SELECT id, target_id, alert_type, severity, title, message, affected_metric,
		       current_value, threshold_value, rca_cause, rca_evidence, timestamp,
		       status, notification_status, consecutive_count, resolved_at
		FROM alert_events
		WHERE target_id = $1
		ORDER BY timestamp DESC
		LIMIT $2
	`
	rows, err := r.db.Pool().QueryContext(ctx, query, targetID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*AlertEventRecord
	for rows.Next() {
		var a AlertEventRecord
		err := rows.Scan(
			&a.ID, &a.TargetID, &a.AlertType, &a.Severity, &a.Title, &a.Message, &a.AffectedMetric,
			&a.CurrentValue, &a.ThresholdValue, &a.RCACause, &a.RCAEvidence, &a.Timestamp,
			&a.Status, &a.NotificationStatus, &a.ConsecutiveCount, &a.ResolvedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, &a)
	}
	return list, nil
}

// GetUnresolvedAlert finds a target's active/triggered alert by alert_type for resolution logic
func (r *Repository) GetUnresolvedAlert(ctx context.Context, targetID, alertType string) (*AlertEventRecord, error) {
	if r.db == nil || !r.db.IsAvailable() {
		return nil, sql.ErrNoRows
	}

	query := `
		SELECT id, target_id, alert_type, severity, title, message, affected_metric,
		       current_value, threshold_value, rca_cause, rca_evidence, timestamp,
		       status, notification_status, consecutive_count, resolved_at
		FROM alert_events
		WHERE target_id = $1 AND alert_type = $2 AND status != 'RESOLVED'
		ORDER BY timestamp DESC
		LIMIT 1
	`
	var a AlertEventRecord
	err := r.db.Pool().QueryRowContext(ctx, query, targetID, alertType).Scan(
		&a.ID, &a.TargetID, &a.AlertType, &a.Severity, &a.Title, &a.Message, &a.AffectedMetric,
		&a.CurrentValue, &a.ThresholdValue, &a.RCACause, &a.RCAEvidence, &a.Timestamp,
		&a.Status, &a.NotificationStatus, &a.ConsecutiveCount, &a.ResolvedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// UpdateAlertStatus changes alert state (triggered/active/resolved)
func (r *Repository) UpdateAlertStatus(ctx context.Context, alertID string, status string, resolvedAt *time.Time) error {
	if r.db == nil || !r.db.IsAvailable() {
		return nil
	}

	query := `UPDATE alert_events SET status = $1, resolved_at = $2 WHERE id = $3`
	_, err := r.db.Pool().ExecContext(ctx, query, status, resolvedAt, alertID)
	return err
}
