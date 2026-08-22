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

type AlertHandler struct {
	repo         *database.Repository
	alertEngine  *services.AlertEngine
	pushProvider *services.PushNotificationProvider
	logger       *slog.Logger
}

func NewAlertHandler(
	repo *database.Repository,
	alertEngine *services.AlertEngine,
	pushProvider *services.PushNotificationProvider,
	logger *slog.Logger,
) *AlertHandler {
	return &AlertHandler{
		repo:         repo,
		alertEngine:  alertEngine,
		pushProvider: pushProvider,
		logger:       logger,
	}
}

// GetAlertHistory fetches historical alerts generated for a target
func (h *AlertHandler) GetAlertHistory(c *gin.Context) {
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

	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}

	if parsed, err := monitoring.ValidateAndSanitizeURL(targetURL); err == nil {
		targetURL = parsed.String()
	}
	targetID := database.GenerateID(targetURL)

	list, getErr := h.alertEngine.GetRecentAlerts(c.Request.Context(), targetID, limit)
	if getErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": getErr.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    list,
	})
}

// GetActiveIncidents fetches triggered/active incidents for a target
func (h *AlertHandler) GetActiveIncidents(c *gin.Context) {
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

	list, getErr := h.alertEngine.GetActiveIncidents(c.Request.Context(), targetID)
	if getErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": getErr.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    list,
	})
}

// SubscribePush receives push token subscription payloads from the browser
func (h *AlertHandler) SubscribePush(c *gin.Context) {
	var req struct {
		URL          string                    `json:"url"`
		Subscription services.PushSubscription `json:"subscription"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": err.Error(),
			},
		})
		return
	}

	if req.URL == "" || req.Subscription.Endpoint == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "INVALID_INPUT",
				"message": "URL and push subscription details are required",
			},
		})
		return
	}

	if parsed, err := monitoring.ValidateAndSanitizeURL(req.URL); err == nil {
		req.URL = parsed.String()
	}
	targetID := database.GenerateID(req.URL)

	if h.pushProvider != nil {
		h.pushProvider.RegisterSubscription(targetID, req.Subscription)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status": "SUBSCRIBED",
		},
	})
}
