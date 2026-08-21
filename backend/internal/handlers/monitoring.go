package handlers

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/scheduler"
	"github.com/gin-gonic/gin"
)

type CheckRequest struct {
	URL         string `json:"url" binding:"required"`
	TargetID    string `json:"target_id,omitempty"`
	IntervalSec int    `json:"interval_sec,omitempty"`
}

type MonitoringHandler struct {
	engine       *monitoring.Engine
	repo         *database.Repository
	cacheService cache.CacheService
	scheduler    *scheduler.Scheduler
	logger       *slog.Logger
}

func NewMonitoringHandler(
	engine *monitoring.Engine,
	repo *database.Repository,
	cacheService cache.CacheService,
	scheduler *scheduler.Scheduler,
	logger *slog.Logger,
) *MonitoringHandler {
	return &MonitoringHandler{
		engine:       engine,
		repo:         repo,
		cacheService: cacheService,
		scheduler:    scheduler,
		logger:       logger,
	}
}

func (h *MonitoringHandler) RunCheck(c *gin.Context) {
	var req CheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "Valid website URL is required in JSON payload",
			},
		})
		return
	}

	opts := monitoring.DefaultCheckOptions()
	ctx, cancel := context.WithTimeout(c.Request.Context(), 12*time.Second)
	defer cancel()

	// Execute Check
	res, err := h.engine.ExecuteCheck(ctx, req.URL, opts)
	if err != nil {
		h.logger.Warn("Monitoring check rejected or failed", slog.String("url", req.URL), slog.String("error", err.Error()))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "CHECK_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	if req.TargetID != "" {
		res.TargetID = req.TargetID
	} else {
		res.TargetID = database.GenerateID(res.URL)
	}

	// Persist to Neon PostgreSQL (Async / Non-blocking)
	if h.repo != nil {
		go func(result *monitoring.CheckResult) {
			pCtx, pCancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer pCancel()
			_ = h.repo.SaveCheckResult(pCtx, result)
		}(res)
	}

	// Save temporary check state in Redis Cache (Async / Non-blocking)
	if h.cacheService != nil && h.cacheService.IsAvailable() {
		go func(result *monitoring.CheckResult) {
			rCtx, rCancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer rCancel()
			key := cache.CheckStateKey(result.TargetID)
			_ = h.cacheService.Set(rCtx, key, result, 10*time.Minute)
		}(res)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    res,
	})
}

// StartMonitoring starts continuous background probing for a target URL
func (h *MonitoringHandler) StartMonitoring(c *gin.Context) {
	var req CheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "Valid website URL is required in JSON payload",
			},
		})
		return
	}

	interval := req.IntervalSec
	if interval <= 0 {
		interval = 30
	}

	targetID, err := h.scheduler.StartWorker(c.Request.Context(), req.URL, interval)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "START_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"target_id":    targetID,
			"url":          req.URL,
			"interval_sec": interval,
			"status":       "active",
		},
	})
}

// StopMonitoring halts the background monitoring worker for a target URL
func (h *MonitoringHandler) StopMonitoring(c *gin.Context) {
	var req CheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "Valid website URL is required in JSON payload",
			},
		})
		return
	}

	err := h.scheduler.StopWorker(c.Request.Context(), req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "STOP_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":    req.URL,
			"status": "stopped",
		},
	})
}

// StreamMonitoring streams live probe telemetry via Server-Sent Events (SSE)
func (h *MonitoringHandler) StreamMonitoring(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_URL",
				"message": "Query parameter 'url' is required for SSE telemetry stream",
			},
		})
		return
	}

	parsedURL, err := monitoring.ValidateAndSanitizeURL(rawURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_URL",
				"message": err.Error(),
			},
		})
		return
	}

	targetURL := parsedURL.String()
	eventCh, unsubscribe := h.scheduler.EventBus().Subscribe(targetURL)
	defer unsubscribe()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	c.Stream(func(w io.Writer) bool {
		select {
		case <-c.Request.Context().Done():
			return false
		case res, ok := <-eventCh:
			if !ok {
				return false
			}
			c.SSEvent("telemetry", res)
			return true
		}
	})
}

// PauseMonitoring pausescontinuous checks for a URL without removing its database target record
func (h *MonitoringHandler) PauseMonitoring(c *gin.Context) {
	var req CheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "Valid website URL is required in JSON payload",
			},
		})
		return
	}

	err := h.scheduler.PauseWorker(c.Request.Context(), req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "PAUSE_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"url":    req.URL,
			"status": "paused",
		},
	})
}

// ResumeMonitoring resumes paused continuous probing for a target URL
func (h *MonitoringHandler) ResumeMonitoring(c *gin.Context) {
	var req CheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "Valid website URL is required in JSON payload",
			},
		})
		return
	}

	interval := req.IntervalSec
	if interval <= 0 {
		interval = 30
	}

	targetID, err := h.scheduler.ResumeWorker(c.Request.Context(), req.URL, interval)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "RESUME_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"target_id":    targetID,
			"url":          req.URL,
			"interval_sec": interval,
			"status":       "active",
		},
	})
}

// GetMonitoringStatus fetches targets active properties, last check and next check timestamps
func (h *MonitoringHandler) GetMonitoringStatus(c *gin.Context) {
	targetID := c.Param("id")
	if targetID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_ID",
				"message": "Target parameter ID is required",
			},
		})
		return
	}

	if h.repo == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"id":           targetID,
				"is_active":    true,
				"status":       "ACTIVE",
				"interval_sec": 30,
			},
		})
		return
	}

	record, err := h.repo.GetTargetByID(c.Request.Context(), targetID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "TARGET_NOT_FOUND",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    record,
	})
}

// ListActiveMonitors lists all monitoring targets in WebMetricsX
func (h *MonitoringHandler) ListActiveMonitors(c *gin.Context) {
	if h.repo == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    []interface{}{},
		})
		return
	}

	list, err := h.repo.GetAllMonitoredTargets(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "LIST_FAILED",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    list,
	})
}
