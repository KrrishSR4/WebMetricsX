package scheduler

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

func TestScheduler_WorkerLifecycle(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))
	defer ts.Close()

	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	engine := monitoring.NewEngine(logger, 2)
	engine.SetAllowPrivateTargets(true)

	sched := NewScheduler(engine, nil, nil, nil, logger)
	defer sched.Close()

	ctx := context.Background()

	// 1. Subscribe to SSE EventBus
	parsedURL, _ := monitoring.ValidateAndSanitizeURL(ts.URL)
	targetURL := parsedURL.String()
	eventCh, unsubscribe := sched.EventBus().Subscribe(targetURL)
	defer unsubscribe()

	// 2. Start Worker with 1s interval
	targetID, err := sched.StartWorker(ctx, ts.URL, 1)
	if err != nil {
		t.Fatalf("Failed to start worker: %v", err)
	}
	if targetID == "" {
		t.Errorf("Expected non-empty target ID")
	}

	// 3. Duplicate Start Call (Must NOT spawn duplicate worker)
	targetID2, err2 := sched.StartWorker(ctx, ts.URL, 1)
	if err2 != nil || targetID2 != targetID {
		t.Errorf("Duplicate start worker call should return same target ID")
	}

	// 4. Verify SSE Event received
	select {
	case res := <-eventCh:
		if !res.Available {
			t.Errorf("Expected check to be available")
		}
	case <-time.After(3 * time.Second):
		t.Errorf("Timed out waiting for probe tick event")
	}

	// 5. Pause Worker
	err = sched.PauseWorker(ctx, ts.URL)
	if err != nil {
		t.Errorf("Failed to pause worker: %v", err)
	}

	// 6. Resume Worker
	resID, err := sched.ResumeWorker(ctx, ts.URL, 1)
	if err != nil {
		t.Errorf("Failed to resume worker: %v", err)
	}
	if resID != targetID {
		t.Errorf("Expected target ID %s on resume, got %s", targetID, resID)
	}

	// 7. Stop Worker
	err = sched.StopWorker(ctx, ts.URL)
	if err != nil {
		t.Errorf("Failed to stop worker: %v", err)
	}
}
