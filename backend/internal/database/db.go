package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type DB struct {
	pool   *sql.DB
	logger *slog.Logger
	active bool
}

// NewDB initializes PostgreSQL connection pool from connection URL
func NewDB(dbURL string, logger *slog.Logger) (*DB, error) {
	if dbURL == "" {
		logger.Info("DATABASE_URL is empty; database features disabled")
		return &DB{active: false, logger: logger}, nil
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		logger.Warn("PostgreSQL connection failed; operating in degraded database mode", slog.String("error", err.Error()))
		return &DB{pool: db, logger: logger, active: false}, nil
	}

	logger.Info("PostgreSQL database connected successfully")

	// Ensure database schema is migrated for baselines and anomalies (Phase 2.6 Migration)
	migrationQueries := []string{
		`ALTER TABLE targets ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';`,
		`ALTER TABLE targets ADD COLUMN IF NOT EXISTS next_checked_at TIMESTAMP WITH TIME ZONE;`,
		`CREATE TABLE IF NOT EXISTS baselines (
			id VARCHAR(64) PRIMARY KEY,
			target_id VARCHAR(64) REFERENCES targets(id) ON DELETE CASCADE,
			time_window VARCHAR(32) NOT NULL,
			metric_type VARCHAR(64) NOT NULL,
			mean_value DOUBLE PRECISION NOT NULL,
			median_value DOUBLE PRECISION NOT NULL,
			p95_value DOUBLE PRECISION NOT NULL,
			p99_value DOUBLE PRECISION NOT NULL,
			min_value DOUBLE PRECISION NOT NULL,
			max_value DOUBLE PRECISION NOT NULL,
			stddev_value DOUBLE PRECISION NOT NULL,
			sample_count INT NOT NULL,
			calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_target_window_metric UNIQUE (target_id, time_window, metric_type)
		);`,
		`CREATE TABLE IF NOT EXISTS anomaly_events (
			id VARCHAR(64) PRIMARY KEY,
			target_id VARCHAR(64) REFERENCES targets(id) ON DELETE CASCADE,
			metric_type VARCHAR(64) NOT NULL,
			lifecycle_state VARCHAR(64) NOT NULL DEFAULT 'DEVIATION_DETECTED',
			severity VARCHAR(32) NOT NULL DEFAULT 'LOW',
			observed_value DOUBLE PRECISION NOT NULL,
			expected_value DOUBLE PRECISION NOT NULL,
			deviation_percentage DOUBLE PRECISION NOT NULL,
			consecutive_count INT NOT NULL DEFAULT 1,
			detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			resolved_at TIMESTAMP WITH TIME ZONE,
			status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
		);`,
		`CREATE INDEX IF NOT EXISTS idx_anomaly_events_target_id ON anomaly_events(target_id);`,
		`CREATE INDEX IF NOT EXISTS idx_anomaly_events_detected_at ON anomaly_events(detected_at DESC);`,
		`CREATE TABLE IF NOT EXISTS alert_events (
			id VARCHAR(64) PRIMARY KEY,
			target_id VARCHAR(64) REFERENCES targets(id) ON DELETE CASCADE,
			alert_type VARCHAR(64) NOT NULL,
			severity VARCHAR(32) NOT NULL DEFAULT 'LOW',
			title VARCHAR(256) NOT NULL,
			message TEXT NOT NULL,
			affected_metric VARCHAR(64) NOT NULL,
			current_value DOUBLE PRECISION NOT NULL,
			threshold_value DOUBLE PRECISION NOT NULL,
			rca_cause VARCHAR(256),
			rca_evidence TEXT,
			timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			status VARCHAR(32) NOT NULL DEFAULT 'TRIGGERED',
			notification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
			consecutive_count INT NOT NULL DEFAULT 1,
			resolved_at TIMESTAMP WITH TIME ZONE
		);`,
		`ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS consecutive_count INT NOT NULL DEFAULT 1;`,
		`CREATE INDEX IF NOT EXISTS idx_alerts_target_id ON alert_events(target_id);`,
		`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alert_events(timestamp DESC);`,
		`CREATE TABLE IF NOT EXISTS alert_subscriptions (
			id VARCHAR(64) PRIMARY KEY,
			target_id VARCHAR(64) REFERENCES targets(id) ON DELETE CASCADE,
			email VARCHAR(255) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_target_email UNIQUE (target_id, email)
		);`,
		`ALTER TABLE targets ADD COLUMN IF NOT EXISTS latency_threshold_ms INT NOT NULL DEFAULT 400;`,
	}
	for _, q := range migrationQueries {
		if _, mErr := db.ExecContext(ctx, q); mErr != nil {
			logger.Warn("Database schema auto-migration warning", slog.String("query", q), slog.String("error", mErr.Error()))
		}
	}

	return &DB{pool: db, logger: logger, active: true}, nil
}

func (d *DB) IsAvailable() bool {
	if d == nil || !d.active || d.pool == nil {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return d.pool.PingContext(ctx) == nil
}

func (d *DB) Pool() *sql.DB {
	return d.pool
}

func (d *DB) Close() error {
	if d.pool != nil {
		return d.pool.Close()
	}
	return nil
}
