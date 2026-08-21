package monitoring

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"time"
)

// ProbeTLS executes a TLS handshake and verifies SSL certificate metadata
func ProbeTLS(ctx context.Context, host string) TLSResult {
	start := time.Now()

	hostname := host
	port := "443"
	if h, p, err := net.SplitHostPort(host); err == nil {
		hostname = h
		port = p
	}

	dialer := &net.Dialer{
		Timeout: 5 * time.Second,
	}

	conn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(hostname, port), &tls.Config{
		ServerName:         hostname,
		InsecureSkipVerify: false,
	})
	latency := time.Since(start).Milliseconds()

	if err != nil {
		return TLSResult{
			HandshakeOK:  false,
			LatencyMs:    latency,
			SSLValid:     false,
			ErrorMessage: fmt.Sprintf("TLS handshake failed: %v", err),
		}
	}
	defer conn.Close()

	state := conn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return TLSResult{
			HandshakeOK:  true,
			LatencyMs:    latency,
			SSLValid:     false,
			ErrorMessage: "No peer certificates served",
		}
	}

	cert := state.PeerCertificates[0]
	now := time.Now()
	isValid := now.After(cert.NotBefore) && now.Before(cert.NotAfter)

	issuer := cert.Issuer.CommonName
	if issuer == "" && len(cert.Issuer.Organization) > 0 {
		issuer = cert.Issuer.Organization[0]
	}

	expiryDate := cert.NotAfter.UTC()

	return TLSResult{
		HandshakeOK: true,
		LatencyMs:   latency,
		SSLValid:    isValid,
		ExpiryDate:  &expiryDate,
		Issuer:      issuer,
	}
}
