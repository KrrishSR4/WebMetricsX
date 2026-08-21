package scheduler

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
)

type Worker struct {
	TargetID    string
	URL         string
	IntervalSec int
	cancel      context.CancelFunc
}

type EventBus struct {
	subscribers map[string][]chan *monitoring.CheckResult
	mu          sync.RWMutex
}

func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[string][]chan *monitoring.CheckResult),
	}
}

func (eb *EventBus) Subscribe(targetURL string) (chan *monitoring.CheckResult, func()) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	ch := make(chan *monitoring.CheckResult, 50)
	eb.subscribers[targetURL] = append(eb.subscribers[targetURL], ch)

	unsubscribe := func() {
		eb.mu.Lock()
		defer eb.mu.Unlock()

		subs := eb.subscribers[targetURL]
		for i, sub := range subs {
			if sub == ch {
				eb.subscribers[targetURL] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}
	}

	return ch, unsubscribe
}

func (eb *EventBus) Publish(targetURL string, res *monitoring.CheckResult) {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	for _, ch := range eb.subscribers[targetURL] {
		select {
		case ch <- res:
		default:
			// Non-blocking publish if subscriber buffer is full
		}
	}
}

type Scheduler struct {
	engine       *monitoring.Engine
	repo         *database.Repository
	cacheService cache.CacheService
	logger       *slog.Logger
	workers      map[string]*Worker
	eventBus     *EventBus
	mu           sync.RWMutex
}

func NewScheduler(
	engine *monitoring.Engine,
	repo *database.Repository,
	cacheService cache.CacheService,
	logger *slog.Logger,
) *Scheduler {
	return &Scheduler{
		engine:       engine,
		repo:         repo,
		cacheService: cacheService,
		logger:       logger,
		workers:      make(map[string]*Worker),
		eventBus:     NewEventBus(),
	}
}

func (s *Scheduler) EventBus() *EventBus {
	return s.eventBus
}

// StartWorker starts a continuous background monitoring worker for a URL
func (s *Scheduler) StartWorker(ctx context.Context, rawURL string, intervalSec int) (string, error) {
	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid monitoring URL: %w", err)
	}

	targetURL := parsedURL.String()
	if intervalSec <= 0 {
		intervalSec = 30
	}

	// 1. Check if worker is already active in memory or Redis lock to prevent duplicate workers
	s.mu.Lock()
	if _, exists := s.workers[targetURL]; exists {
		s.mu.Unlock()
		s.logger.Info("[MONITOR] Worker already active for target; skipping duplicate launch", slog.String("url", targetURL))
		targetID, _ := s.repo.UpsertTarget(ctx, targetURL, intervalSec, true)
		return targetID, nil
	}

	targetID, err := s.repo.UpsertTarget(ctx, targetURL, intervalSec, true)
	if err != nil {
		s.logger.Warn("[MONITOR] Target database upsert warning", slog.String("url", targetURL), slog.String("error", err.Error()))
	}

	workerCtx, cancel := context.WithCancel(context.Background())
	worker := &Worker{
		TargetID:    targetID,
		URL:         targetURL,
		IntervalSec: intervalSec,
		cancel:      cancel,
	}

	s.workers[targetURL] = worker
	s.mu.Unlock()

	// Update worker state in Redis
	if s.cacheService != nil && s.cacheService.IsAvailable() {
		_ = s.cacheService.Set(context.Background(), cache.WorkerStateKey(targetID), map[string]interface{}{
			"status":       "active",
			"url":          targetURL,
			"interval_sec": intervalSec,
			"started_at":   time.Now().UTC(),
		}, 24*time.Hour)
	}

	s.logger.Info("[MONITOR] target started continuous monitoring worker", slog.String("target_id", targetID), slog.String("url", targetURL), slog.Int("interval_sec", intervalSec))

	// Launch background goroutine ticker loop
	go s.runWorkerLoop(workerCtx, worker)

	return targetID, nil
}

// StopWorker stops and cancels the background worker for a target URL
func (s *Scheduler) StopWorker(ctx context.Context, rawURL string) error {
	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		return err
	}
	targetURL := parsedURL.String()

	s.mu.Lock()
	worker, exists := s.workers[targetURL]
	if !exists {
		s.mu.Unlock()
		_ = s.repo.SetTargetActiveStatus(ctx, targetURL, false)
		return nil
	}

	worker.cancel()
	delete(s.workers, targetURL)
	s.mu.Unlock()

	// Update PostgreSQL database
	_ = s.repo.SetTargetActiveStatus(ctx, targetURL, false)

	// Remove worker lock from Redis
	if s.cacheService != nil && s.cacheService.IsAvailable() {
		_ = s.cacheService.Delete(ctx, cache.WorkerStateKey(worker.TargetID))
	}

	s.logger.Info("[MONITOR] target stopped continuous worker", slog.String("url", targetURL))
	return nil
}

func (s *Scheduler) runWorkerLoop(ctx context.Context, w *Worker) {
	ticker := time.NewTicker(time.Duration(w.IntervalSec) * time.Second)
	defer ticker.Stop()

	// Perform initial immediate probe check tick
	s.executeProbeTick(ctx, w)

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("[WORKER] continuous worker context cancelled", slog.String("url", w.URL))
			return
		case <-ticker.C:
			s.logger.Debug("[WORKER] next probe scheduled tick", slog.String("url", w.URL))
			s.executeProbeTick(ctx, w)
		}
	}
}

func (s *Scheduler) executeProbeTick(ctx context.Context, w *Worker) {
	opts := monitoring.DefaultCheckOptions()
	opts.Timeout = 12 * time.Second

	s.logger.Info("[PROBE] executing network probe", slog.String("url", w.URL))
	res, err := s.engine.ExecuteCheck(ctx, w.URL, opts)

	if err != nil {
		s.logger.Warn("[PROBE] probe failed", slog.String("url", w.URL), slog.String("error", err.Error()))
		res = &monitoring.CheckResult{
			TargetID:     w.TargetID,
			URL:          w.URL,
			Available:    false,
			StatusCode:   0,
			ErrorMessage: err.Error(),
			CheckedAt:    time.Now().UTC(),
		}
	} else {
		res.TargetID = w.TargetID
		s.logger.Info("[PROBE] probe completed", slog.String("url", w.URL), slog.Int("status", res.StatusCode), slog.Int64("response_ms", res.ResponseTimeMs))
	}

	// 1. Insert Telemetry into Neon PostgreSQL
	if s.repo != nil {
		pCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if dbErr := s.repo.SaveCheckResult(pCtx, res); dbErr == nil {
			s.logger.Debug("[DB] telemetry inserted into postgresql", slog.String("target_id", w.TargetID))
		}
		cancel()
	}

	// 2. Cache Latest State in Redis
	if s.cacheService != nil && s.cacheService.IsAvailable() {
		rCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_ = s.cacheService.Set(rCtx, cache.CheckStateKey(w.TargetID), res, 10*time.Minute)
		cancel()
	}

	// 3. Publish Telemetry Event to SSE Event Bus
	s.eventBus.Publish(w.URL, res)
	s.logger.Debug("[EVENT] telemetry published to SSE subscribers", slog.String("url", w.URL))
}

// LoadActiveTargetsFromDB queries PostgreSQL on backend startup and restarts continuous workers
func (s *Scheduler) LoadActiveTargetsFromDB(ctx context.Context) {
	targets, err := s.repo.GetActiveTargets(ctx)
	if err != nil {
		s.logger.Warn("[SCHEDULER] Failed to load active targets from DB", slog.String("error", err.Error()))
		return
	}

	for _, t := range targets {
		if t.IsActive {
			_, _ = s.StartWorker(ctx, t.URL, t.IntervalSec)
		}
	}
	s.logger.Info("[SCHEDULER] Restored active workers on startup", slog.Int("active_count", len(targets)))
}

// Close gracefully cancels all active workers on server shutdown
func (s *Scheduler) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()

	for u, worker := range s.workers {
		worker.cancel()
		delete(s.workers, u)
	}
	s.logger.Info("[SCHEDULER] Stopped all continuous background workers cleanly")
}
