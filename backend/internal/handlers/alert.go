package handlers

import (
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/email"
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

// TestBrevoAlert handles testing email alerts via Brevo REST API
func (h *AlertHandler) TestBrevoAlert(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
		})
		return
	}

	emailStr := strings.TrimSpace(req.Email)
	if emailStr == "" || !isValidEmail(emailStr) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Please enter a valid email address",
		})
		return
	}

	apiKey := os.Getenv("BREVO_API_KEY")
	if apiKey == "" {
		h.logger.Warn("BREVO_API_KEY environment variable is not configured")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "BREVO_API_KEY is not configured in backend environment",
		})
		return
	}

	// Prepare data containing real-like values for verification
	alertData := email.AlertEmailData{
		Website:      "https://example.com (WebMetricsX Testing)",
		Status:       "DEGRADED",
		TTFB:         420.0,
		Threshold:    400.0,
		ResponseTime: 480.0,
		DNS:          15.0,
		TCP:          25.0,
		TLS:          40.0,
		Availability: 99.9,
		DetectedAt:   time.Now(),
		LikelyCause:  "Origin Latency",
		RCAEvidence:  "TTFB was high while DNS and TLS handshakes were fast, pointing to backend processing slowdown.",
	}

	err := email.SendAlertEmail(c.Request.Context(), emailStr, alertData)
	if err != nil {
		h.logger.Error("Failed to send test email through Brevo", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Unable to send test alert: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test alert sent successfully",
	})
}

func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".") && len(email) > 5
}

