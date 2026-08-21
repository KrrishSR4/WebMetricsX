package cache

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"
)

type TestPayload struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

func TestRedisCache_DegradedMode(t *testing.T) {
	// Initialize with invalid port to simulate offline Redis
	discardLogger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	rc, err := NewRedisCache("redis://localhost:9999/0", discardLogger)
	if err != nil {
		t.Fatalf("NewRedisCache should not error out on parse: %v", err)
	}

	if rc.IsAvailable() {
		t.Errorf("Expected IsAvailable to return false for unreachable Redis")
	}

	ctx := context.Background()
	var dest TestPayload
	err = rc.Get(ctx, "test:key", &dest)
	if !errors.Is(err, ErrCacheUnavailable) {
		t.Errorf("Expected ErrCacheUnavailable when Redis is offline, got: %v", err)
	}
}

func TestKeyHelpers(t *testing.T) {
	if got := JobStateKey("job123"); got != "webmetricsx:job:job123" {
		t.Errorf("JobStateKey error = %v", got)
	}

	if got := CheckStateKey("site456"); got != "webmetricsx:check:site456" {
		t.Errorf("CheckStateKey error = %v", got)
	}

	if got := WorkerStateKey("worker1"); got != "webmetricsx:worker:worker1" {
		t.Errorf("WorkerStateKey error = %v", got)
	}

	if got := AlertCooldownKey("site456", "ttfb"); got != "webmetricsx:cooldown:site456:ttfb" {
		t.Errorf("AlertCooldownKey error = %v", got)
	}

	if got := AlertDedupKey("site456", "hash1"); got != "webmetricsx:dedup:site456:hash1" {
		t.Errorf("AlertDedupKey error = %v", got)
	}
}
