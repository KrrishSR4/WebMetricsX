package cache

import (
	"context"
	"errors"
	"time"
)

var (
	// ErrCacheMiss is returned when a requested key is not found in cache
	ErrCacheMiss = errors.New("cache: key not found")
	// ErrCacheUnavailable is returned when Redis is unreachable
	ErrCacheUnavailable = errors.New("cache: service unavailable")
)

// CacheService defines the contract for caching and temporary state operations
type CacheService interface {
	// Get retrieves a value from cache and unmarshals it into dest
	Get(ctx context.Context, key string, dest interface{}) error
	// Set stores a value in cache with a specified TTL (0 = no expiration)
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	// Delete removes one or more keys from cache
	Delete(ctx context.Context, keys ...string) error
	// Exists checks if a key exists in cache
	Exists(ctx context.Context, key string) (bool, error)
	// TTL returns the remaining time-to-live of a key
	TTL(ctx context.Context, key string) (time.Duration, error)
	// IsAvailable returns true if the Redis connection is active and healthy
	IsAvailable() bool
	// Close safely closes the underlying cache client connection
	Close() error
}
