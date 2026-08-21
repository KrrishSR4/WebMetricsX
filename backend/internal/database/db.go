package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	_ "github.com/lib/pq"
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

	db, err := sql.Open("postgres", dbURL)
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
