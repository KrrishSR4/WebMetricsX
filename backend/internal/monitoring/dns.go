package monitoring

import (
	"context"
	"net"
	"time"
)

// ProbeDNS performs an independent DNS resolution check and measures latency
func ProbeDNS(ctx context.Context, host string) DNSResult {
	start := time.Now()

	hostname := host
	if h, _, err := net.SplitHostPort(host); err == nil {
		hostname = h
	}

	// Check if already an IP
	if ip := net.ParseIP(hostname); ip != nil {
		return DNSResult{
			Resolved:    true,
			LatencyMs:   0,
			IPAddresses: []string{ip.String()},
		}
	}

	resolver := net.Resolver{}
	addrs, err := resolver.LookupHost(ctx, hostname)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return DNSResult{
			Resolved:     false,
			LatencyMs:    latency,
			ErrorMessage: err.Error(),
		}
	}

	return DNSResult{
		Resolved:    true,
		LatencyMs:   latency,
		IPAddresses: addrs,
	}
}
