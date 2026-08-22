package handlers

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type AnomalyHandler struct {
	repo            *database.Repository
	anomalyDetector *services.AnomalyDetector
	logger          *slog.Logger
}

func NewAnomalyHandler(repo *database.Repository, anomalyDetector *services.AnomalyDetector, logger *slog.Logger) *AnomalyHandler {
	return &AnomalyHandler{
		repo:            repo,
		anomalyDetector: anomalyDetector,
		logger:          logger,
	}
}

// GetBaseline handles fetching target performance baseline statistics
func (h *AnomalyHandler) GetBaseline(c *gin.Context) {
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

	window := c.DefaultQuery("range", "24h")
	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)

	baseline, err := h.anomalyDetector.GetBaseline(c.Request.Context(), targetID, window)
	if err != nil {
		h.logger.Error("Failed to fetch baseline stats", slog.String("url", targetURL), slog.String("error", err.Error()))
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
		"data":    baseline,
	})
}

// GetBaselineHistory retrieves the saved historical baselines calculated for the target
func (h *AnomalyHandler) GetBaselineHistory(c *gin.Context) {
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

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)
	baselines, err := h.repo.GetBaseline(c.Request.Context(), targetID, "24h") // default window
	if err != nil {
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
		"data":    baselines,
	})
}

// GetAnomalyStatus returns current active anomalies for a target
func (h *AnomalyHandler) GetAnomalyStatus(c *gin.Context) {
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

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)
	activeAnomalies, err := h.anomalyDetector.GetActiveAnomalies(c.Request.Context(), targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	status := "NORMAL"
	if len(activeAnomalies) > 0 {
		status = "ANOMALY"
		// If only contains low/medium warnings we can flag DEGRADED status instead
		allDegraded := true
		for _, a := range activeAnomalies {
			if a.LifecycleState == "ACTIVE" && (a.Severity == "HIGH" || a.Severity == "CRITICAL") {
				allDegraded = false
				break
			}
		}
		if allDegraded {
			status = "DEGRADED"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status":           status,
			"active_anomalies": activeAnomalies,
		},
	})
}

// GetRecentAnomalies returns recent anomaly events
func (h *AnomalyHandler) GetRecentAnomalies(c *gin.Context) {
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

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)
	recent, err := h.anomalyDetector.GetRecentAnomalies(c.Request.Context(), targetID, 10)
	if err != nil {
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
		"data":    recent,
	})
}

// GetAnomalyHistory retrieves anomaly events with custom page limits
func (h *AnomalyHandler) GetAnomalyHistory(c *gin.Context) {
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

	limitStr := c.DefaultQuery("limit", "50")
	limit, parseErr := strconv.Atoi(limitStr)
	if parseErr != nil || limit <= 0 {
		limit = 50
	}

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)
	history, err := h.anomalyDetector.GetAnomalyHistory(c.Request.Context(), targetID, limit)
	if err != nil {
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
		"data":    history,
	})
}

// GetAnomalyStats retrieves high level stats regarding anomaly recovery rates
func (h *AnomalyHandler) GetAnomalyStats(c *gin.Context) {
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

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)
	stats, err := h.anomalyDetector.GetAnomalyStats(c.Request.Context(), targetID)
	if err != nil {
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
		"data":    stats,
	})
}
