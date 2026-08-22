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
	"github.com/KrrishSR4/WebMetricsX/backend/internal/services"
)

type Worker struct {
	TargetID    string
	URL         string
	IntervalSec int
	cancel      context.CancelFunc
}

type Job struct {
	TargetID    string
	URL         string
	IntervalSec int
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
	engine          *monitoring.Engine
	repo            *database.Repository
	cacheService    cache.CacheService
	anomalyDetector *services.AnomalyDetector
	alertEngine     *services.AlertEngine
	logger          *slog.Logger
	workers         map[string]*Worker
	eventBus        *EventBus
	jobQueue        chan *Job
	workerCount     int
	ctx             context.Context
	cancel          context.CancelFunc
	wg              sync.WaitGroup
	mu              sync.RWMutex
}

func NewScheduler(
	engine *monitoring.Engine,
	repo *database.Repository,
	cacheService cache.CacheService,
	anomalyDetector *services.AnomalyDetector,
	alertEngine *services.AlertEngine,
	logger *slog.Logger,
) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Scheduler{
		engine:          engine,
		repo:            repo,
		cacheService:    cacheService,
		anomalyDetector: anomalyDetector,
		alertEngine:     alertEngine,
		logger:          logger,
		workers:         make(map[string]*Worker),
		eventBus:        NewEventBus(),
		jobQueue:        make(chan *Job, 1000),
		workerCount:     10, // Default bounded pool count
		ctx:             ctx,
		cancel:          cancel,
	}

	// Start consumer worker pool
	for i := 0; i < s.workerCount; i++ {
		s.wg.Add(1)
		go s.workerConsumer(i)
	}

	return s
}

func (s *Scheduler) EventBus() *EventBus {
	return s.eventBus
}

func (s *Scheduler) workerConsumer(id int) {
	defer s.wg.Done()
	s.logger.Info("[SCHEDULER] Worker pool consumer started", slog.Int("worker_id", id))

	for {
		select {
		case <-s.ctx.Done():
			s.logger.Info("[SCHEDULER] Worker pool consumer exiting", slog.Int("worker_id", id))
			return
		case j, ok := <-s.jobQueue:
			if !ok {
				return
			}
			s.executeProbeTick(j)
		}
	}
}

// StartWorker starts (or resumes) continuous background monitoring for a URL
func (s *Scheduler) StartWorker(ctx context.Context, rawURL string, intervalSec int) (string, error) {
	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid monitoring URL: %w", err)
	}

	targetURL := parsedURL.String()
	if intervalSec <= 0 {
		intervalSec = 30
	}

	s.mu.Lock()
	if _, exists := s.workers[targetURL]; exists {
		s.mu.Unlock()
		s.logger.Info("[MONITOR] Worker already active for target; skipping launch", slog.String("url", targetURL))
		var targetID string
		if s.repo != nil {
			targetID, _ = s.repo.UpsertTarget(ctx, targetURL, intervalSec, true)
		} else {
			targetID = database.GenerateID(targetURL)
		}
		return targetID, nil
	}
	s.mu.Unlock()

	var targetID string
	if s.repo != nil {
		var upsertErr error
		targetID, upsertErr = s.repo.UpsertTarget(ctx, targetURL, intervalSec, true)
		if upsertErr != nil {
			s.logger.Warn("[MONITOR] Target database upsert warning", slog.String("url", targetURL), slog.String("error", upsertErr.Error()))
		}
	} else {
		targetID = database.GenerateID(targetURL)
	}

	s.mu.Lock()
	if _, exists := s.workers[targetURL]; exists {
		s.mu.Unlock()
		return targetID, nil
	}

	workerCtx, cancel := context.WithCancel(s.ctx)
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
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		s.runWorkerLoop(workerCtx, worker)
	}()

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
		if s.repo != nil {
			_ = s.repo.UpdateTargetStatus(ctx, targetURL, "STOPPED", false)
		}
		return nil
	}

	worker.cancel()
	delete(s.workers, targetURL)
	s.mu.Unlock()

	// Update PostgreSQL database
	if s.repo != nil {
		_ = s.repo.UpdateTargetStatus(ctx, targetURL, "STOPPED", false)
	}

	// Remove worker lock from Redis
	if s.cacheService != nil && s.cacheService.IsAvailable() {
		_ = s.cacheService.Delete(ctx, cache.WorkerStateKey(worker.TargetID))
	}

	s.logger.Info("[MONITOR] target stopped continuous worker", slog.String("url", targetURL))
	return nil
}

// PauseWorker pauses scheduled checks without removing the target from database records
func (s *Scheduler) PauseWorker(ctx context.Context, rawURL string) error {
	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		return err
	}
	targetURL := parsedURL.String()

	s.mu.Lock()
	worker, exists := s.workers[targetURL]
	if !exists {
		s.mu.Unlock()
		if s.repo != nil {
			_ = s.repo.UpdateTargetStatus(ctx, targetURL, "PAUSED", false)
		}
		return nil
	}

	worker.cancel()
	delete(s.workers, targetURL)
	s.mu.Unlock()

	if s.repo != nil {
		_ = s.repo.UpdateTargetStatus(ctx, targetURL, "PAUSED", false)
	}

	if s.cacheService != nil && s.cacheService.IsAvailable() {
		_ = s.cacheService.Delete(ctx, cache.WorkerStateKey(worker.TargetID))
	}

	s.logger.Info("[MONITOR] target paused worker", slog.String("url", targetURL))
	return nil
}

// ResumeWorker restores worker monitoring checks for a paused target URL
func (s *Scheduler) ResumeWorker(ctx context.Context, rawURL string, intervalSec int) (string, error) {
	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		return "", err
	}
	targetURL := parsedURL.String()

	if s.repo != nil {
		_ = s.repo.UpdateTargetStatus(ctx, targetURL, "ACTIVE", true)
	}

	return s.StartWorker(ctx, targetURL, intervalSec)
}

func (s *Scheduler) runWorkerLoop(ctx context.Context, w *Worker) {
	ticker := time.NewTicker(time.Duration(w.IntervalSec) * time.Second)
	defer ticker.Stop()

	// Initial immediate job dispatch
	s.queueJob(ctx, w)

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("[WORKER] continuous worker ticker loop finished", slog.String("url", w.URL))
			return
		case <-ticker.C:
			s.queueJob(ctx, w)
		}
	}
}

func (s *Scheduler) queueJob(ctx context.Context, w *Worker) {
	select {
	case <-ctx.Done():
		return
	case s.jobQueue <- &Job{TargetID: w.TargetID, URL: w.URL, IntervalSec: w.IntervalSec}:
		s.logger.Debug("[SCHEDULER] Queued check job", slog.String("url", w.URL))
	default:
		s.logger.Warn("[SCHEDULER] Job queue full; skipping check", slog.String("url", w.URL))
	}
}

func (s *Scheduler) executeProbeTick(j *Job) {
	opts := monitoring.DefaultCheckOptions()
	opts.Timeout = 12 * time.Second

	s.logger.Info("[PROBE] executing network probe", slog.String("url", j.URL))
	res, err := s.engine.ExecuteCheck(s.ctx, j.URL, opts)

	now := time.Now().UTC()
	if err != nil {
		s.logger.Warn("[PROBE] probe failed", slog.String("url", j.URL), slog.String("error", err.Error()))
		res = &monitoring.CheckResult{
			TargetID:     j.TargetID,
			URL:          j.URL,
			Available:    false,
			StatusCode:   0,
			ErrorMessage: err.Error(),
			CheckedAt:    now,
		}
	} else {
		res.TargetID = j.TargetID
		s.logger.Info("[PROBE] probe completed", slog.String("url", j.URL), slog.Int("status", res.StatusCode), slog.Int64("response_ms", res.ResponseTimeMs))
	}

	nextCheck := now.Add(time.Duration(j.IntervalSec) * time.Second)

	// 1. Insert Telemetry into Neon PostgreSQL
	if s.repo != nil {
		pCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if dbErr := s.repo.SaveCheckResult(pCtx, res); dbErr == nil {
			s.logger.Debug("[DB] telemetry inserted into postgresql", slog.String("target_id", j.TargetID))
		}
		_ = s.repo.UpdateCheckTimestamps(pCtx, j.TargetID, now, nextCheck)
		cancel()
	}

	// Run Anomaly Detector (Phase 2.6)
	if s.anomalyDetector != nil {
		pCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		anomalyState, anomalySeverity, detErr := s.anomalyDetector.ProcessCheckResult(pCtx, res)
		cancel()
		if detErr != nil {
			s.logger.Warn("[ANOMALY] Detection execution failed", slog.String("url", j.URL), slog.String("error", detErr.Error()))
		} else {
			res.AnomalyState = anomalyState
			res.AnomalySeverity = anomalySeverity
		}
	}

	// Run Alerting Engine (Phase 2.7)
	if s.alertEngine != nil {
		pCtx, cancel := context.WithTimeout(context.Background(), 7*time.Second)
		_ = s.alertEngine.ProcessAlertsForCheck(pCtx, res)
		cancel()
	}

	// 2. Cache Latest State in Redis
	if s.cacheService != nil && s.cacheService.IsAvailable() {
		rCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		_ = s.cacheService.Set(rCtx, cache.CheckStateKey(j.TargetID), res, 10*time.Minute)
		cancel()
	}

	// 3. Publish Telemetry Event to SSE Event Bus
	s.eventBus.Publish(j.URL, res)
	s.logger.Debug("[EVENT] telemetry published to SSE subscribers", slog.String("url", j.URL))
}

// LoadActiveTargetsFromDB queries PostgreSQL on backend startup and restarts continuous workers
func (s *Scheduler) LoadActiveTargetsFromDB(ctx context.Context) {
	if s.repo == nil {
		return
	}
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

// GetActiveWorkers returns copies of all currently running in-memory workers
func (s *Scheduler) GetActiveWorkers() []Worker {
	s.mu.RLock()
	defer s.mu.RUnlock()

	workers := make([]Worker, 0, len(s.workers))
	for _, w := range s.workers {
		workers = append(workers, Worker{
			TargetID:    w.TargetID,
			URL:         w.URL,
			IntervalSec: w.IntervalSec,
		})
	}
	return workers
}

// Close gracefully cancels all active workers and shuts down the pool cleanly
func (s *Scheduler) Close() {
	s.cancel() // Cancel context to stop all tickers and worker consumers

	s.wg.Wait() // Wait for all worker ticker goroutines and pool consumers to exit

	s.mu.Lock()
	for u := range s.workers {
		delete(s.workers, u)
	}
	s.mu.Unlock()

	close(s.jobQueue)

	s.logger.Info("[SCHEDULER] Stopped all worker consumers and continuous tickers cleanly")
}
