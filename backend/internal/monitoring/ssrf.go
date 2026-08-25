package monitoring

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

var (
	ErrInvalidURL        = errors.New("monitoring: invalid or malformed URL")
	ErrUnsupportedScheme = errors.New("monitoring: only http and https protocols are allowed")
	ErrRestrictedTarget  = errors.New("monitoring SSRF protection: target resolves to restricted private or loopback IP")
)

var privateIPBlocks []*net.IPNet

func init() {
	cidrs := []string{
		"127.0.0.0/8",    // IPv4 loopback
		"10.0.0.0/8",     // RFC1918 private
		"172.16.0.0/12",  // RFC1918 private
		"192.168.0.0/16", // RFC1918 private

		"169.254.0.0/16", // IPv4 link-local / AWS metadata
		"0.0.0.0/8",      // Current network
		"::1/128",        // IPv6 loopback
		"fc00::/7",       // IPv6 Unique local addr
		"fe80::/10",      // IPv6 link-local
	}

	for _, cidr := range cidrs {
		_, block, err := net.ParseCIDR(cidr)
		if err == nil {
			privateIPBlocks = append(privateIPBlocks, block)
		}
	}
}

// ValidateAndSanitizeURL checks URL format and enforces protocol restrictions
func ValidateAndSanitizeURL(rawURL string) (*url.URL, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return nil, ErrInvalidURL
	}

	if !strings.Contains(trimmed, "://") {
		trimmed = "https://" + trimmed
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return nil, ErrInvalidURL
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return nil, ErrUnsupportedScheme
	}

	return parsed, nil
}

// IsRestrictedIP checks if an IP is private, loopback, or cloud metadata target
func IsRestrictedIP(ip net.IP) bool {
	if ip == nil {
		return true
	}

	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}

	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}

	return false
}

// ValidateTargetHost resolves the hostname and validates all resolved IPs against SSRF rules
func ValidateTargetHost(host string) ([]net.IP, error) {
	// Strip optional port if present
	hostname := host
	if h, _, err := net.SplitHostPort(host); err == nil {
		hostname = h
	}

	// Check direct IP parsing
	if ip := net.ParseIP(hostname); ip != nil {
		if IsRestrictedIP(ip) {
			return nil, ErrRestrictedTarget
		}
		return []net.IP{ip}, nil
	}

	// Resolve hostname
	ips, err := net.LookupIP(hostname)
	if err != nil {
		return nil, fmt.Errorf("monitoring DNS lookup failed for host %s: %w", hostname, err)
	}

	if len(ips) == 0 {
		return nil, fmt.Errorf("monitoring DNS resolution returned no IPs for %s", hostname)
	}

	for _, ip := range ips {
		if IsRestrictedIP(ip) {
			return nil, ErrRestrictedTarget
		}
	}

	return ips, nil
}
