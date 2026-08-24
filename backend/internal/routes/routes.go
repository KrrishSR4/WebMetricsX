package routes

import (
	"log/slog"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/handlers"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/scheduler"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/services"
	"github.com/gin-gonic/gin"
)

func Setup(
	router *gin.Engine,
	appVersion string,
	cacheService cache.CacheService,
	engine *monitoring.Engine,
	repo *database.Repository,
	sched *scheduler.Scheduler,
	anomalyDet *services.AnomalyDetector,
	alertEngine *services.AlertEngine,
	pushProvider *services.PushNotificationProvider,
	logger *slog.Logger,
) {
	healthHandler := handlers.NewHealthHandler(appVersion, cacheService)
	monitoringHandler := handlers.NewMonitoringHandler(engine, repo, cacheService, sched, logger)
	analyticsHandler := handlers.NewAnalyticsHandler(repo, logger)
	anomalyHandler := handlers.NewAnomalyHandler(repo, anomalyDet, logger)
	alertHandler := handlers.NewAlertHandler(repo, alertEngine, pushProvider, logger)

	// Direct Health Endpoint
	router.GET("/health", healthHandler.Check)
	router.POST("/api/alerts/test", alertHandler.TestBrevoAlert)

	// API Version 1 Router Group
	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.Check)
		v1.POST("/monitoring/check", monitoringHandler.RunCheck)
		v1.POST("/monitoring/start", monitoringHandler.StartMonitoring)
		v1.POST("/monitoring/stop", monitoringHandler.StopMonitoring)
		v1.POST("/monitoring/pause", monitoringHandler.PauseMonitoring)
		v1.POST("/monitoring/resume", monitoringHandler.ResumeMonitoring)
		v1.POST("/monitoring/threshold", monitoringHandler.UpdateTargetThreshold)
		v1.GET("/monitoring/status/:id", monitoringHandler.GetMonitoringStatus)
		v1.GET("/monitoring/list", monitoringHandler.ListActiveMonitors)
		v1.GET("/monitoring/stream", monitoringHandler.StreamMonitoring)

		v1.GET("/monitoring/analytics", analyticsHandler.GetAnalytics)
		v1.GET("/monitoring/targets", analyticsHandler.GetTargets)

		// Baseline & Anomaly Endpoints (Phase 2.6)
		v1.GET("/monitoring/baseline", anomalyHandler.GetBaseline)
		v1.GET("/monitoring/baseline/history", anomalyHandler.GetBaselineHistory)
		v1.GET("/monitoring/anomalies/status", anomalyHandler.GetAnomalyStatus)
		v1.GET("/monitoring/anomalies/recent", anomalyHandler.GetRecentAnomalies)
		v1.GET("/monitoring/anomalies/history", anomalyHandler.GetAnomalyHistory)
		v1.GET("/monitoring/anomalies/stats", anomalyHandler.GetAnomalyStats)
		v1.GET("/monitoring/analysis", anomalyHandler.GetAnalysis)

		// Alerting Endpoints (Phase 2.7)
		v1.GET("/monitoring/alerts/history", alertHandler.GetAlertHistory)
		v1.GET("/monitoring/alerts/active", alertHandler.GetActiveIncidents)
		v1.GET("/monitoring/alerts/status", alertHandler.GetAlertStatus)
		v1.POST("/monitoring/alerts/subscribe", alertHandler.SubscribePush)
		v1.POST("/monitoring/alerts/subscribe/email", alertHandler.SubscribeEmail)
		v1.POST("/monitoring/alerts/unsubscribe/email", alertHandler.UnsubscribeEmail)
		v1.GET("/monitoring/alerts/subscribe/email/list", alertHandler.GetEmailSubscriptions)
		v1.POST("/alerts/test", alertHandler.TestBrevoAlert)
	}
}
