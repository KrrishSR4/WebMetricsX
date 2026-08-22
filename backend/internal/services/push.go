package services

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
)

type PushSubscription struct {
	Endpoint string            `json:"endpoint"`
	Keys     map[string]string `json:"keys"`
}

type PushNotificationProvider struct {
	mu            sync.RWMutex
	subscriptions map[string][]PushSubscription // targetID -> subscriptions
	logger        *slog.Logger
}

func NewPushNotificationProvider(logger *slog.Logger) *PushNotificationProvider {
	return &PushNotificationProvider{
		subscriptions: make(map[string][]PushSubscription),
		logger:        logger,
	}
}

// RegisterSubscription saves a browser push subscription for a target URL
func (p *PushNotificationProvider) RegisterSubscription(targetID string, sub PushSubscription) {
	p.mu.Lock()
	defer p.mu.Unlock()

	subs := p.subscriptions[targetID]
	for _, existing := range subs {
		if existing.Endpoint == sub.Endpoint {
			return
		}
	}

	p.subscriptions[targetID] = append(subs, sub)
	p.logger.Info("Registered web push subscription", slog.String("target_id", targetID), slog.String("endpoint", sub.Endpoint))
}

// SendPushNotification dispatches push payloads to all registered subscription endpoints
func (p *PushNotificationProvider) SendPushNotification(ctx context.Context, targetID string, title string, message string) error {
	p.mu.RLock()
	subs, exists := p.subscriptions[targetID]
	p.mu.RUnlock()

	if !exists || len(subs) == 0 {
		p.logger.Debug("No web push subscriptions registered for target", slog.String("target_id", targetID))
		return nil
	}

	payload, err := json.Marshal(map[string]string{
		"title":   title,
		"message": message,
	})
	if err != nil {
		return err
	}

	p.logger.Info("[PUSH MOCK] Dispatching VAPID push payload to subscriptions",
		slog.String("target_id", targetID),
		slog.Int("subscriber_count", len(subs)),
		slog.String("payload", string(payload)),
	)

	return nil
}
