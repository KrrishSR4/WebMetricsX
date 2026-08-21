package handlers

import (
	"net/http"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/cache"
	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Status     string            `json:"status"`
	Timestamp  time.Time         `json:"timestamp"`
	Service    string            `json:"service"`
	Version    string            `json:"version"`
	Components map[string]string `json:"components"`
}

type HealthHandler struct {
	version      string
	cacheService cache.CacheService
}

func NewHealthHandler(version string, cacheService cache.CacheService) *HealthHandler {
	return &HealthHandler{
		version:      version,
		cacheService: cacheService,
	}
}

func (h *HealthHandler) Check(c *gin.Context) {
	components := make(map[string]string)

	if h.cacheService != nil && h.cacheService.IsAvailable() {
		components["redis"] = "healthy"
	} else {
		components["redis"] = "degraded"
	}

	c.JSON(http.StatusOK, HealthResponse{
		Status:     "ok",
		Timestamp:  time.Now().UTC(),
		Service:    "webmetricsx-backend",
		Version:    h.version,
		Components: components,
	})
}
