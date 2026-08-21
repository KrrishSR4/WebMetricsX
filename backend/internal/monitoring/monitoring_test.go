package monitoring

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestValidateAndSanitizeURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		err      error
	}{
		{"example.com", "https://example.com", nil},
		{"http://example.com/test", "http://example.com/test", nil},
		{"https://example.com", "https://example.com", nil},
		{"ftp://example.com", "", ErrUnsupportedScheme},
		{"", "", ErrInvalidURL},
	}

	for _, tt := range tests {
		parsed, err := ValidateAndSanitizeURL(tt.input)
		if tt.err != nil {
			if err == nil {
				t.Errorf("Expected error for input %q, got nil", tt.input)
			}
		} else {
			if err != nil {
				t.Errorf("Unexpected error for input %q: %v", tt.input, err)
			} else if parsed.String() != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, parsed.String())
			}
		}
	}
}

func TestSSRFProtection(t *testing.T) {
	restrictedIPs := []string{
		"127.0.0.1",
		"10.0.0.1",
		"172.16.0.1",
		"192.168.1.100",
		"169.254.169.254",
		"0.0.0.0",
		"::1",
	}

	for _, ipStr := range restrictedIPs {
		ip := net.ParseIP(ipStr)
		if !IsRestrictedIP(ip) {
			t.Errorf("Expected IP %s to be flagged as restricted SSRF target", ipStr)
		}
	}

	publicIP := net.ParseIP("8.8.8.8")
	if IsRestrictedIP(publicIP) {
		t.Errorf("Public IP 8.8.8.8 should not be flagged as restricted")
	}
}

func TestProbeHTTP_WithLocalTestServer(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(20 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))
	defer ts.Close()

	ctx := context.Background()
	opts := DefaultCheckOptions()

	res := ProbeHTTP(ctx, ts.URL, opts)
	if res.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", res.StatusCode)
	}

	if res.TTFBMs <= 0 {
		t.Errorf("Expected TTFBMs > 0, got %d", res.TTFBMs)
	}

	if res.ResponseTimeMs <= 0 {
		t.Errorf("Expected ResponseTimeMs > 0, got %d", res.ResponseTimeMs)
	}
}

func TestEngine_BatchCheck(t *testing.T) {
	ts1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts1.Close()

	ts2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts2.Close()

	discardLogger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	engine := NewEngine(discardLogger, 2)
	engine.SetAllowPrivateTargets(true)


	ctx := context.Background()
	results := engine.BatchCheck(ctx, []string{ts1.URL, ts2.URL}, DefaultCheckOptions())

	if len(results) != 2 {
		t.Fatalf("Expected 2 batch results, got %d", len(results))
	}

	if res1, ok := results[ts1.URL]; !ok || !res1.Available {
		t.Errorf("Expected ts1 check to be available")
	}

	if res2, ok := results[ts2.URL]; !ok || res2.Available {
		t.Errorf("Expected ts2 check to be unavailable (404)")
	}
}
