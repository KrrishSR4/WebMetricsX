package database

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

type Repository struct {
	db     *DB
	logger *slog.Logger
}

func NewRepository(db *DB, logger *slog.Logger) *Repository {
	return &Repository{
		db:     db,
		logger: logger,
	}
}

// GenerateID produces a deterministic sha256 hash string for keys
func GenerateID(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:16])
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
