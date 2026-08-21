package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Environment        string
	CORSAllowedOrigins []string
	DatabaseURL        string
	RedisURL           string
}

func LoadConfig() (*Config, error) {
	// Attempt to load .env file if it exists, ignore error if missing
	_ = godotenv.Load()

	originsStr := getEnv("CORS_ALLOWED_ORIGINS", "https://webmetricsx.web.app,http://localhost:5173,http://localhost:8080")
	origins := strings.Split(originsStr, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	return &Config{
		Port:               getEnv("PORT", "8081"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		CORSAllowedOrigins: origins,
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		RedisURL:           getEnv("REDIS_URL", ""),
	}, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}
