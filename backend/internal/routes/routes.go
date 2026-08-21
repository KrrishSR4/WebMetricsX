package routes

import (
	"log/slog"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/database"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/handlers"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/monitoring"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/scheduler"
	"github.com/gin-gonic/gin"
)

func Setup(
	router *gin.Engine,
	appVersion string,
	cacheService cache.CacheService,
	engine *monitoring.Engine,
	repo *database.Repository,
	sched *scheduler.Scheduler,
	logger *slog.Logger,
) {
	healthHandler := handlers.NewHealthHandler(appVersion, cacheService)
	monitoringHandler := handlers.NewMonitoringHandler(engine, repo, cacheService, sched, logger)
	analyticsHandler := handlers.NewAnalyticsHandler(repo, logger)

	// Direct Health Endpoint
	router.GET("/health", healthHandler.Check)

	// API Version 1 Router Group
	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.Check)
		v1.POST("/monitoring/check", monitoringHandler.RunCheck)
		v1.POST("/monitoring/start", monitoringHandler.StartMonitoring)
		v1.POST("/monitoring/stop", monitoringHandler.StopMonitoring)
		v1.POST("/monitoring/pause", monitoringHandler.PauseMonitoring)
		v1.POST("/monitoring/resume", monitoringHandler.ResumeMonitoring)
		v1.GET("/monitoring/status/:id", monitoringHandler.GetMonitoringStatus)
		v1.GET("/monitoring/list", monitoringHandler.ListActiveMonitors)
		v1.GET("/monitoring/stream", monitoringHandler.StreamMonitoring)

		v1.GET("/monitoring/analytics", analyticsHandler.GetAnalytics)
		v1.GET("/monitoring/targets", analyticsHandler.GetTargets)
	}
}
