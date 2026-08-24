package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type AlertEmailData struct {
	Website      string
	Status       string // NORMAL, DEGRADED, DOWN
	TTFB         float64
	Threshold    float64
	ResponseTime float64
	DNS          float64
	TCP          float64
	TLS          float64
	Availability float64
	DetectedAt   time.Time
	LikelyCause  string
	RCAEvidence  string
}

func SendAlertEmail(ctx context.Context, recipient string, alert AlertEmailData) error {
	apiKey := os.Getenv("BREVO_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("BREVO_API_KEY environment variable is not configured")
	}

	senderEmail := os.Getenv("BREVO_SENDER_EMAIL")
	if senderEmail == "" {
		senderEmail = "alerts@webmetricsx.com"
	}

	senderName := os.Getenv("BREVO_SENDER_NAME")
	if senderName == "" {
		senderName = "WebMetricsX"
	}

	// Construct subject based on alert status
	var subject string
	var statusColor string
	switch alert.Status {
	case "DOWN":
		subject = fmt.Sprintf("🚨 WebMetricsX Alert — Connection DOWN for %s", alert.Website)
		statusColor = "#ef4444"
	case "DEGRADED":
		subject = fmt.Sprintf("⚠️ WebMetricsX Alert — High TTFB / Slow Performance for %s", alert.Website)
		statusColor = "#f59e0b"
	default:
		subject = fmt.Sprintf("✓ WebMetricsX Status — System Operational for %s", alert.Website)
		statusColor = "#10b981"
	}

	// Build a professional HTML email body
	htmlContent := fmt.Sprintf(`
		<div style="font-family: monospace, sans-serif; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
			<div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
				<h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: bold;">WebMetricsX Incident Alert</h2>
				<span style="background-color: %s; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
					%s
				</span>
			</div>
			
			<table style="width: 100%%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; color: #334155;">
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">Website:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%s</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">TTFB:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%.1f ms</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">Threshold:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%.1f ms</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">Response Time:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%.1f ms</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">DNS / TCP / TLS:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%.1f ms / %.1f ms / %.1f ms</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">Uptime Availability:</td>
					<td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">%.2f%%</td>
				</tr>
				<tr style="border-bottom: 1px solid #f8fafc;">
					<td style="padding: 8px 0; font-weight: bold; color: #64748b;">Detected At:</td>
					<td style="padding: 8px 0; text-align: right; color: #0f172a;">%s</td>
				</tr>
			</table>

			%s

			<p style="color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-bottom: 0;">
				This is an automated monitoring alert sent by WebMetricsX. Please do not reply directly to this email.
			</p>
		</div>
	`, statusColor, alert.Status, alert.Website, alert.TTFB, alert.Threshold, alert.ResponseTime, alert.DNS, alert.TCP, alert.TLS, alert.Availability, alert.DetectedAt.Format("2006-01-02 15:04:05 MST"), formatRCAHTML(alert.LikelyCause, alert.RCAEvidence))

	url := "https://api.brevo.com/v3/smtp/email"

	reqBody := map[string]interface{}{
		"sender": map[string]string{
			"name":  senderName,
			"email": senderEmail,
		},
		"to": []map[string]string{
			{
				"email": recipient,
			},
		},
		"subject":     subject,
		"htmlContent": htmlContent,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal Brevo JSON payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create Brevo HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("api-key", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Brevo API HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Brevo API returned error status %d: %s", resp.StatusCode, string(respBytes))
	}

	return nil
}

func formatRCAHTML(cause, evidence string) string {
	if cause == "" {
		return ""
	}
	return fmt.Sprintf(`
		<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; margin-top: 16px;">
			<div style="font-weight: bold; color: #92400e; font-size: 13px; margin-bottom: 4px;">RCA: %s</div>
			<div style="color: #b45309; font-size: 12px; line-height: 1.5;">%s</div>
		</div>
	`, cause, evidence)
}
