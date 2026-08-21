package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		rawQuery := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()
		errorMessage := c.Errors.String()

		if rawQuery != "" {
			path = path + "?" + rawQuery
		}

		attrs := []slog.Attr{
			slog.Int("status", statusCode),
			slog.String("method", method),
			slog.String("path", path),
			slog.String("ip", clientIP),
			slog.Duration("latency", latency),
			slog.String("user_agent", c.Request.UserAgent()),
		}

		if errorMessage != "" {
			attrs = append(attrs, slog.String("errors", errorMessage))
		}

		if statusCode >= 500 {
			logger.LogAttrs(c.Request.Context(), slog.LevelError, "HTTP request failed", attrs...)
		} else if statusCode >= 400 {
			logger.LogAttrs(c.Request.Context(), slog.LevelWarn, "HTTP request warning", attrs...)
		} else {
			logger.LogAttrs(c.Request.Context(), slog.LevelInfo, "HTTP request processed", attrs...)
		}
	}
}
