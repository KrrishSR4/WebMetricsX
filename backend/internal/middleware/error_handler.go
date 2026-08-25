package middleware

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func ErrorHandler(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Handle any deferred panics or errors added to context
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			logger.Error("Unhandled HTTP error", slog.String("error", err.Error()))

			if !c.Writer.Written() {
				c.JSON(http.StatusInternalServerError, ErrorResponse{
					Success: false,
					Error: ErrorDetail{
						Code:    "INTERNAL_SERVER_ERROR",
						Message: "An unexpected server error occurred",
					},
				})
			}
		}
	}
}
