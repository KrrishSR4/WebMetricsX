package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
	"github.com/gin-gonic/gin"
)

type CheckRequest struct {
	URL      string `json:"url" binding:"required"`
	TargetID string `json:"target_id,omitempty"`
}

type MonitoringHandler struct {
	engine       *monitoring.Engine
	repo         *database.Repository
	cacheService cache.CacheService
	logger       *slog.Logger
}

func NewMonitoringHandler(
	engine *monitoring.Engine,
	repo *database.Repository,
	cacheService cache.CacheService,
	logger *slog.Logger,
) *MonitoringHandler {
	return &MonitoringHandler{
		engine:       engine,
		repo:         repo,
		cacheService: cacheService,
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
