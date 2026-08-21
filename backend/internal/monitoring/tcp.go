package monitoring

import (
	"context"
	"fmt"
	"net"
	"time"
)

// ProbeTCP attempts a TCP socket connection and measures latency
func ProbeTCP(ctx context.Context, host string, defaultPort int) TCPResult {
	start := time.Now()

	address := host
	if _, _, err := net.SplitHostPort(host); err != nil {
		address = fmt.Sprintf("%s:%d", host, defaultPort)
	}

	dialer := net.Dialer{
		Timeout: 5 * time.Second,
	}

	conn, err := dialer.DialContext(ctx, "tcp", address)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return TCPResult{
			Connected:    false,
			LatencyMs:    latency,
			ErrorMessage: err.Error(),
		}
	}
	defer conn.Close()

	return TCPResult{
		Connected: true,
		LatencyMs: latency,
	}
}
