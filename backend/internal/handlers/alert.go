package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

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

// TestNotification handles testing email alerts and browser notifications via Resend API
func (h *AlertHandler) TestNotification(c *gin.Context) {
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

	email := strings.TrimSpace(req.Email)
	if email == "" || !isValidEmail(email) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Please enter a valid email address",
		})
		return
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		h.logger.Warn("RESEND_API_KEY environment variable is not configured")
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "RESEND_API_KEY is not configured in backend environment",
		})
		return
	}

	subject := "[WebMetricsX] Test Alert"
	timestamp := time.Now().Format("2006-01-02 15:04:05 MST")

	htmlBody := fmt.Sprintf(`
		<div style="font-family: monospace; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
			<h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">WebMetricsX Test Alert</h2>
			<p style="color: #334155; font-size: 14px; line-height: 1.6;">This is a test notification from WebMetricsX.</p>
			<p style="color: #334155; font-size: 14px; line-height: 1.6;">Your email alerting system is working correctly.</p>
			<div style="background-color: #f8fafc; padding: 12px; border-radius: 8px; margin: 20px 0;">
				<span style="font-weight: bold; color: #64748b;">Timestamp:</span> 
				<span style="color: #0f172a;">%s</span>
			</div>
			<p style="color: #64748b; font-size: 11px; margin-bottom: 0;">This is a test notification and not a real monitoring incident.</p>
		</div>
	`, timestamp)

	fromEmail := os.Getenv("RESEND_FROM")
	if fromEmail == "" {
		fromEmail = "onboarding@resend.dev"
	}
	if !strings.Contains(fromEmail, "<") {
		fromEmail = fmt.Sprintf("WebMetricsX <%s>", fromEmail)
	}

	provider := services.NewResendEmailProvider(apiKey, fromEmail, h.logger)
	err := provider.SendEmail(c.Request.Context(), email, subject, htmlBody)
	if err != nil {
		h.logger.Error("Failed to send test email through Resend", slog.String("error", err.Error()))
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

