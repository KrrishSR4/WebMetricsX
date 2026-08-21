package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/KrrishSR4/WebMetricsX/backend/internal/config"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/middleware"
	"github.com/KrrishSR4/WebMetricsX/backend/internal/routes"
	"github.com/gin-gonic/gin"
)

const AppVersion = "v2.0.0-dev"

func main() {
	// 1. Initialize Structured Logger (log/slog)
	logHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	logger.Info("Starting WebMetricsX Go Backend", slog.String("version", AppVersion))

	// 2. Load Configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Error("Failed to load configuration", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// 3. Set Gin Mode based on Environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// 4. Initialize Router & Middlewares
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	router.Use(middleware.ErrorHandler(logger))

	// 5. Register Routes
	routes.Setup(router, AppVersion)

	// 6. HTTP Server Setup
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 7. Start Server in a Goroutine
	go func() {
		logger.Info("HTTP server running", slog.String("port", cfg.Port), slog.String("env", cfg.Environment))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("HTTP server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// 8. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down WebMetricsX Go Backend gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", slog.String("error", err.Error()))
	}

	logger.Info("Server exited cleanly")
}
