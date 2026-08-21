package monitoring

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"sync"
	"time"
)


type Engine struct {
	logger              *slog.Logger
	concurrency         int
	allowPrivateTargets bool
}

func NewEngine(logger *slog.Logger, maxConcurrency int) *Engine {
	if maxConcurrency <= 0 {
		maxConcurrency = 10
	}
	return &Engine{
		logger:              logger,
		concurrency:         maxConcurrency,
		allowPrivateTargets: false,
	}
}

func (e *Engine) SetAllowPrivateTargets(allow bool) {
	e.allowPrivateTargets = allow
}

// ExecuteCheck performs a complete monitoring check for a single target URL
func (e *Engine) ExecuteCheck(ctx context.Context, targetURL string, opts CheckOptions) (*CheckResult, error) {
	// 1. Validate URL & SSRF Rules
	parsedURL, err := ValidateAndSanitizeURL(targetURL)
	if err != nil {
		return nil, fmt.Errorf("URL validation failed: %w", err)
	}

	// 2. Validate Target Host IPs against SSRF (unless private targets allowed for testing)
	var ips []net.IP
	if !e.allowPrivateTargets {
		resolvedIPs, err := ValidateTargetHost(parsedURL.Host)
		if err != nil {
			return nil, fmt.Errorf("SSRF protection error: %w", err)
		}
		ips = resolvedIPs
	}

	// 3. Prepare probe execution context with timeout
	ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()


	var finalResult *CheckResult
	var lastErr error

	// Retry loop with exponential backoff
	retryDelay := opts.RetryDelay
	for attempt := 0; attempt <= opts.MaxRetries; attempt++ {
		if attempt > 0 {
			e.logger.Info("Retrying check for target", slog.String("url", parsedURL.String()), slog.Int("attempt", attempt))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(retryDelay):
				retryDelay *= 2
			}
		}

		result := e.performSingleCheck(ctx, parsedURL, ips)
		if result.Available {
			finalResult = result
			break
		}

		finalResult = result
		lastErr = fmt.Errorf("attempt %d failed: %s", attempt+1, result.ErrorMessage)
	}

	if finalResult == nil {
		return nil, lastErr
	}

	return finalResult, nil
}

func (e *Engine) performSingleCheck(ctx context.Context, parsedURL *url.URL, ips []net.IP) *CheckResult {
	checkedAt := time.Now().UTC()
	hostname := parsedURL.Host

	// A. DNS Probe
	dnsRes := ProbeDNS(ctx, hostname)
	if len(dnsRes.IPAddresses) == 0 && len(ips) > 0 {
		dnsRes.IPAddresses = []string{ips[0].String()}
		dnsRes.Resolved = true
	}

	// B. TCP Probe
	defaultPort := 80
	if parsedURL.Scheme == "https" {
		defaultPort = 443
	}
	tcpRes := ProbeTCP(ctx, hostname, defaultPort)

	// C. TLS Probe (if HTTPS)
	var tlsRes TLSResult
	if parsedURL.Scheme == "https" {
		tlsRes = ProbeTLS(ctx, hostname)
	}

	// D. HTTP Probe
	httpRes := ProbeHTTP(ctx, parsedURL.String(), DefaultCheckOptions())

	available := httpRes.StatusCode >= 200 && httpRes.StatusCode < 400

	errMsg := httpRes.ErrorMessage
	if !available && errMsg == "" {
		if !tcpRes.Connected {
			errMsg = fmt.Sprintf("TCP connection to %s failed: %s", hostname, tcpRes.ErrorMessage)
		} else if parsedURL.Scheme == "https" && !tlsRes.HandshakeOK {
			errMsg = fmt.Sprintf("TLS handshake failed: %s", tlsRes.ErrorMessage)
		} else if httpRes.StatusCode >= 400 {
			errMsg = fmt.Sprintf("HTTP server returned status %d", httpRes.StatusCode)
		}
	}

	return &CheckResult{
		URL:            parsedURL.String(),
		Available:      available,
		StatusCode:     httpRes.StatusCode,
		DNSLatencyMs:   dnsRes.LatencyMs,
		TCPLatencyMs:   tcpRes.LatencyMs,
		TLSLatencyMs:   tlsRes.LatencyMs,
		TTFBMs:         httpRes.TTFBMs,
		ResponseTimeMs: httpRes.ResponseTimeMs,
		SSLValid:       tlsRes.SSLValid,
		SSLExpiryDate:  tlsRes.ExpiryDate,
		SSLIssuer:      tlsRes.Issuer,
		ErrorMessage:   errMsg,
		CheckedAt:      checkedAt,
	}
}

// BatchCheck performs concurrent monitoring checks for multiple URLs using a bounded worker pool
func (e *Engine) BatchCheck(ctx context.Context, urls []string, opts CheckOptions) map[string]*CheckResult {
	results := make(map[string]*CheckResult)
	var mu sync.Mutex

	sem := make(chan struct{}, e.concurrency)
	var wg sync.WaitGroup

	for _, u := range urls {
		wg.Add(1)
		go func(targetURL string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			res, err := e.ExecuteCheck(ctx, targetURL, opts)
			mu.Lock()
			if err != nil {
				results[targetURL] = &CheckResult{
					URL:          targetURL,
					Available:    false,
					ErrorMessage: err.Error(),
					CheckedAt:    time.Now().UTC(),
				}
			} else {
				results[targetURL] = res
			}
			mu.Unlock()
		}(u)
	}

	wg.Wait()
	return results
}
