package services

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"strconv"
)

type EmailProvider interface {
	SendEmail(ctx context.Context, to, subject, body string) error
}

type SMTPEmailProvider struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	logger   *slog.Logger
}

func NewSMTPEmailProvider(host string, portStr string, username, password, from string, logger *slog.Logger) *SMTPEmailProvider {
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 587
	}
	return &SMTPEmailProvider{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
		logger:   logger,
	}
}

func (p *SMTPEmailProvider) SendEmail(ctx context.Context, to, subject, body string) error {
	if p.Host == "" || p.Username == "" {
		p.logger.Info("[SMTP MOCK] Dry run email alert",
			slog.String("to", to),
			slog.String("subject", subject),
			slog.String("body", body),
		)
		return nil
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		p.From, to, subject, body)

	addr := fmt.Sprintf("%s:%d", p.Host, p.Port)
	auth := smtp.PlainAuth("", p.Username, p.Password, p.Host)

	errCh := make(chan error, 1)
	go func() {
		errCh <- smtp.SendMail(addr, auth, p.From, []string{to}, []byte(msg))
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("failed to send SMTP email: %w", err)
		}
		p.logger.Info("SMTP alert email sent successfully", slog.String("to", to), slog.String("subject", subject))
		return nil
	}
}
