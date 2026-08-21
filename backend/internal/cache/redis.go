package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
	logger *slog.Logger
	mu     sync.RWMutex
	active bool
}

// NewRedisCache initializes a Redis client from a connection URL
func NewRedisCache(redisURL string, logger *slog.Logger) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse REDIS_URL: %w", err)
	}

	client := redis.NewClient(opts)

	rc := &RedisCache{
		client: client,
		logger: logger,
	}

	// Initial ping check
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis initial connection failed; operating in degraded mode", slog.String("error", err.Error()))
		rc.active = false
	} else {
		logger.Info("Redis cache connected successfully", slog.String("addr", opts.Addr))
		rc.active = true
	}

	return rc, nil
}

func (r *RedisCache) IsAvailable() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if !r.active {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := r.client.Ping(ctx).Err()
	return err == nil
}

func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	if !r.IsAvailable() {
		return ErrCacheUnavailable
	}

	val, err := r.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return ErrCacheMiss
	} else if err != nil {
		r.logger.Warn("Redis GET failed", slog.String("key", key), slog.String("error", err.Error()))
		return fmt.Errorf("redis get error: %w", err)
	}

	if strPtr, ok := dest.(*string); ok {
		*strPtr = val
		return nil
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return fmt.Errorf("redis unmarshal error: %w", err)
	}

	return nil
}

func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if !r.IsAvailable() {
		return ErrCacheUnavailable
	}

	var data []byte
	var err error

	if str, ok := value.(string); ok {
		data = []byte(str)
	} else {
		data, err = json.Marshal(value)
		if err != nil {
			return fmt.Errorf("redis marshal error: %w", err)
		}
	}

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		r.logger.Warn("Redis SET failed", slog.String("key", key), slog.String("error", err.Error()))
		return fmt.Errorf("redis set error: %w", err)
	}

	return nil
}

func (r *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if !r.IsAvailable() || len(keys) == 0 {
		return nil
	}

	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		r.logger.Warn("Redis DEL failed", slog.String("error", err.Error()))
		return fmt.Errorf("redis del error: %w", err)
	}

	return nil
}

func (r *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	if !r.IsAvailable() {
		return false, ErrCacheUnavailable
	}

	count, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("redis exists error: %w", err)
	}

	return count > 0, nil
}

func (r *RedisCache) TTL(ctx context.Context, key string) (time.Duration, error) {
	if !r.IsAvailable() {
		return 0, ErrCacheUnavailable
	}

	dur, err := r.client.TTL(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("redis ttl error: %w", err)
	}

	return dur, nil
}

func (r *RedisCache) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.active = false
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}
