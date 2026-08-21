package handlers

import (
	"log/slog"
	"net/http"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	repo   *database.Repository
	logger *slog.Logger
}

func NewAnalyticsHandler(repo *database.Repository, logger *slog.Logger) *AnalyticsHandler {
	return &AnalyticsHandler{
		repo:   repo,
		logger: logger,
	}
}

func (h *AnalyticsHandler) GetAnalytics(c *gin.Context) {
	targetURL := c.Query("url")
	if targetURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "MISSING_URL",
				"message": "Query parameter 'url' is required",
			},
		})
		return
	}

	timeRange := c.DefaultQuery("range", "24h")

	summary, err := h.repo.GetAnalyticsSummary(c.Request.Context(), targetURL, timeRange)
	if err != nil {
		h.logger.Error("Failed to calculate analytics summary", slog.String("url", targetURL), slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    summary,
	})
}

func (h *AnalyticsHandler) GetTargets(c *gin.Context) {
	targets, err := h.repo.GetMonitoredTargets(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to fetch target list", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    targets,
	})
}
