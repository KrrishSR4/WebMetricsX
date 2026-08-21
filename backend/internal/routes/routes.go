package routes

import (
	"github.com/KrrishSR4/WebMetricsX/backend/internal/handlers"
	"github.com/gin-gonic/gin"
)

func Setup(router *gin.Engine, appVersion string) {
	healthHandler := handlers.NewHealthHandler(appVersion)

	// Direct Health Endpoint
	router.GET("/health", healthHandler.Check)

	// API Version 1 Router Group
	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.Check)
	}
}
