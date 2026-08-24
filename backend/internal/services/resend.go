package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

type ResendEmailProvider struct {
	APIKey string
	From   string
	logger *slog.Logger
}

func NewResendEmailProvider(apiKey, from string, logger *slog.Logger) *ResendEmailProvider {
	if from == "" {
		from = "onboarding@resend.dev"
	}
	return &ResendEmailProvider{
		APIKey: apiKey,
		From:   from,
		logger: logger,
	}
}

func (p *ResendEmailProvider) SendEmail(ctx context.Context, to, subject, htmlBody string) error {
	if p.APIKey == "" {
		p.logger.Info("[RESEND MOCK] Dry run email alert (API Key missing)",
			slog.String("to", to),
			slog.String("subject", subject),
		)
		return nil
	}

	url := "https://api.resend.com/emails"

	reqBody := map[string]interface{}{
		"from":    p.From,
		"to":      []string{to},
		"subject": subject,
		"html":    htmlBody,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal resend request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create resend request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend API returned error status %d: %s", resp.StatusCode, string(respBytes))
	}

	p.logger.Info("Resend alert email sent successfully", slog.String("to", to))
	return nil
}
