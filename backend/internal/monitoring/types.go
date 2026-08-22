package monitoring

import "time"

// CheckOptions configures monitoring parameters for a check run
type CheckOptions struct {
	Timeout       time.Duration `json:"timeout"`
	MaxRetries    int           `json:"max_retries"`
	RetryDelay    time.Duration `json:"retry_delay"`
	FollowRedirects bool        `json:"follow_redirects"`
}

func DefaultCheckOptions() CheckOptions {
	return CheckOptions{
		Timeout:         10 * time.Second,
		MaxRetries:      2,
		RetryDelay:      500 * time.Millisecond,
		FollowRedirects: true,
	}
}

// DNSResult holds DNS resolution probe results
type DNSResult struct {
	Resolved     bool     `json:"resolved"`
	LatencyMs    int64    `json:"latency_ms"`
	IPAddresses  []string `json:"ip_addresses,omitempty"`
	ErrorMessage string   `json:"error_message,omitempty"`
}

// TCPResult holds TCP connection probe results
type TCPResult struct {
	Connected    bool   `json:"connected"`
	LatencyMs    int64  `json:"latency_ms"`
	ErrorMessage string `json:"error_message,omitempty"`
}

// TLSResult holds TLS handshake & certificate probe results
type TLSResult struct {
	HandshakeOK  bool       `json:"handshake_ok"`
	LatencyMs    int64      `json:"latency_ms"`
	SSLValid     bool       `json:"ssl_valid"`
	ExpiryDate   *time.Time `json:"expiry_date,omitempty"`
	Issuer       string     `json:"issuer,omitempty"`
	ErrorMessage string     `json:"error_message,omitempty"`
}

// HTTPResult holds HTTP request performance & timing results
type HTTPResult struct {
	StatusCode     int    `json:"status_code"`
	TTFBMs         int64  `json:"ttfb_ms"`
	ResponseTimeMs int64  `json:"response_time_ms"`
	DownloadTimeMs int64  `json:"download_time_ms"`
	ErrorMessage   string `json:"error_message,omitempty"`
}

type PerformanceRegression struct {
	MetricType       string  `json:"metric_type"`
	BaselineValue    float64 `json:"baseline_value"`
	CurrentValue     float64 `json:"current_value"`
	PercentageChange float64 `json:"percentage_change"`
	Status           string  `json:"status"` // Performance Regression / Normal
}

type RCAData struct {
	LikelyCause    string  `json:"likely_cause"`
	AffectedMetric string  `json:"affected_metric"`
	Evidence       string  `json:"evidence"`
	Confidence     float64 `json:"confidence"`
	Severity       string  `json:"severity"`
}

// CheckResult represents the normalized, complete monitoring check result
type CheckResult struct {
	TargetID        string                  `json:"target_id,omitempty"`
	URL             string                  `json:"url"`
	Available       bool                    `json:"available"`
	StatusCode      int                     `json:"status_code"`
	DNSLatencyMs    int64                   `json:"dns_latency_ms"`
	TCPLatencyMs    int64                   `json:"tcp_latency_ms"`
	TLSLatencyMs    int64                   `json:"tls_latency_ms"`
	TTFBMs          int64                   `json:"ttfb_ms"`
	ResponseTimeMs  int64                   `json:"response_time_ms"`
	SSLValid        bool                    `json:"ssl_valid"`
	SSLExpiryDate   *time.Time              `json:"ssl_expiry_date,omitempty"`
	SSLIssuer       string                  `json:"ssl_issuer,omitempty"`
	ErrorMessage    string                  `json:"error_message,omitempty"`
	CheckedAt       time.Time               `json:"checked_at"`
	AnomalyState    string                  `json:"anomaly_state,omitempty"`
	AnomalySeverity string                  `json:"anomaly_severity,omitempty"`
	RCA             *RCAData                `json:"rca,omitempty"`
	Regressions     []PerformanceRegression `json:"regressions,omitempty"`
}
