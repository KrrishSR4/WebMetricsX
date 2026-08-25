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
	Website               string
	Status                string // HIGH_LATENCY, WEBSITE_DOWN, RECOVERY
	TTFB                  float64
	Threshold             float64
	ResponseTime          float64
	DNS                   float64
	TCP                   float64
	TLS                   float64
	Availability          float64
	DetectedAt            time.Time
	LikelyCause           string
	RCAEvidence           string
	AvgResponseTime       float64
	P95ResponseTime       float64
	P99ResponseTime       float64
	ConsecutiveViolations int
	LastAlertTime         time.Time
	NextAlertTime         time.Time
}

func SendAlertEmail(ctx context.Context, recipient string, alert AlertEmailData) error {
	return SendAlertEmails(ctx, []string{recipient}, alert)
}

func SendAlertEmails(ctx context.Context, recipients []string, alert AlertEmailData) error {
	if len(recipients) == 0 {
		return nil
	}

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

	// Construct subject based on alert status (Avoiding emojis)
	var subject string
	var statusBg string
	var statusText string
	var statusBorder string
	switch alert.Status {
	case "WEBSITE_DOWN":
		subject = fmt.Sprintf("WebMetricsX Alert — Website Down: %s", alert.Website)
		statusBg = "#fef2f2"
		statusText = "#dc2626"
		statusBorder = "#fecaca"
	case "HIGH_LATENCY":
		subject = fmt.Sprintf("WebMetricsX Alert — High TTFB Detected for %s", alert.Website)
		statusBg = "#fffbeb"
		statusText = "#d97706"
		statusBorder = "#fef3c7"
	default: // RECOVERY
		subject = fmt.Sprintf("WebMetricsX Recovery — Website Recovered: %s", alert.Website)
		statusBg = "#f0fdf4"
		statusText = "#16a34a"
		statusBorder = "#dcfce7"
	}

	lastAlertStr := "N/A"
	if !alert.LastAlertTime.IsZero() {
		lastAlertStr = alert.LastAlertTime.Format("2006-01-02 15:04:05 MST")
	}
	nextAlertStr := "N/A"
	if !alert.NextAlertTime.IsZero() {
		nextAlertStr = alert.NextAlertTime.Format("2006-01-02 15:04:05 MST")
	}

	// Header title string based on status
	headerTitle := "Incident Alert"
	if alert.Status == "RECOVERY" {
		headerTitle = "Incident Resolved"
	}

	// Build a professional HTML email body with Light Mode theme matching the WebMetricsX design
	htmlContent := fmt.Sprintf(`
		<div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; padding: 32px 16px; min-height: 100%%; width: 100%%; box-sizing: border-box;">
			<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
				
				<!-- Header -->
				<table style="width: 100%%; border-collapse: collapse; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px;">
					<tr>
						<td style="vertical-align: middle; padding-bottom: 16px;">
							<span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
								WebMetricsX
							</span>
							<div style="font-size: 9px; color: #64748b; font-family: monospace; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px;">
								%s
							</div>
						</td>
						<td style="text-align: right; vertical-align: middle; padding-bottom: 16px;">
							<span style="background-color: %s; color: %s; border: 1px solid %s; padding: 5px 12px; border-radius: 9999px; font-size: 10px; font-weight: 700; font-family: monospace; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;">
								%s
							</span>
						</td>
					</tr>
				</table>

				<!-- Target Url Section -->
				<div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-family: monospace;">
					<div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Target Website</div>
					<div style="font-size: 12px; font-weight: bold; color: #0f172a; word-break: break-all;">
						%s
					</div>
				</div>

				<!-- Dynamic Metric Grid (Table-based for email compatibility) -->
				<table style="width: 100%%; border-collapse: collapse; margin-bottom: 20px; font-family: monospace;">
					<tr>
						<td style="width: 50%%; padding-right: 6px; padding-bottom: 12px;">
							<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; height: 70px;">
								<div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">TTFB</div>
								<div style="font-size: 18px; font-weight: 800; color: #0f172a;">%.1f <span style="font-size: 10px; font-weight: 500; color: #64748b;">ms</span></div>
								<div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Threshold: %.0f ms</div>
							</div>
						</td>
						<td style="width: 50%%; padding-left: 6px; padding-bottom: 12px;">
							<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; height: 70px;">
								<div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Response Time</div>
								<div style="font-size: 18px; font-weight: 800; color: #0f172a;">%.1f <span style="font-size: 10px; font-weight: 500; color: #64748b;">ms</span></div>
								<div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Status: %s</div>
							</div>
						</td>
					</tr>
					<tr>
						<td style="width: 50%%; padding-right: 6px;">
							<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; height: 70px;">
								<div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Phases Breakdown</div>
								<div style="font-size: 10px; font-weight: bold; color: #334155; line-height: 1.3;">
									DNS: %.0f ms<br/>
									TCP: %.0f ms<br/>
									TLS: %.0f ms
								</div>
							</div>
						</td>
						<td style="width: 50%%; padding-left: 6px;">
							<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; height: 70px;">
								<div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Availability</div>
								<div style="font-size: 18px; font-weight: 800; color: #16a34a;">%.2f%%</div>
								<div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Last 24 hours</div>
							</div>
						</td>
					</tr>
				</table>

				<!-- Stats & Cooldown Details -->
				<div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 12px; color: #334155; font-family: monospace;">
					<div style="font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 10px; margin-bottom: 8px; letter-spacing: 0.5px;">Incident Details</div>
					<table style="width: 100%%; border-collapse: collapse;">
						<tr style="border-bottom: 1px solid #f1f5f9; height: 28px;">
							<td style="color: #64748b;">Average Latency (24h):</td>
							<td style="text-align: right; font-weight: bold; color: #0f172a;">%.1f ms</td>
						</tr>
						<tr style="border-bottom: 1px solid #f1f5f9; height: 28px;">
							<td style="color: #64748b;">P95 / P99 Latency:</td>
							<td style="text-align: right; font-weight: bold; color: #0f172a;">%.1f ms / %.1f ms</td>
						</tr>
						<tr style="border-bottom: 1px solid #f1f5f9; height: 28px;">
							<td style="color: #64748b;">Consecutive Bad Probes:</td>
							<td style="text-align: right; font-weight: bold; color: #0f172a;">%d</td>
						</tr>
						<tr style="border-bottom: 1px solid #f1f5f9; height: 28px;">
							<td style="color: #64748b;">Last Alert Sent:</td>
							<td style="text-align: right; color: #334155;">%s</td>
						</tr>
						<tr style="height: 28px;">
							<td style="color: #64748b;">Next Eligible Alert:</td>
							<td style="text-align: right; color: #334155;">%s</td>
						</tr>
					</table>
				</div>

				%s

				<div style="font-size: 10px; color: #64748b; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.5;">
					<div>Detected At: %s</div>
					<div style="margin-top: 10px;">This is an automated monitoring alert sent by WebMetricsX. Please do not reply directly to this email.</div>
				</div>

			</div>
		</div>
	`, headerTitle, statusBg, statusText, statusBorder, alert.Status, alert.Website, alert.TTFB, alert.Threshold, alert.ResponseTime, alert.Status, alert.DNS, alert.TCP, alert.TLS, alert.Availability, alert.AvgResponseTime, alert.P95ResponseTime, alert.P99ResponseTime, alert.ConsecutiveViolations, lastAlertStr, nextAlertStr, formatRCAHTML(alert.LikelyCause, alert.RCAEvidence), alert.DetectedAt.Format("2006-01-02 15:04:05 MST"))

	url := "https://api.brevo.com/v3/smtp/email"

	toSlice := make([]map[string]string, 0, len(recipients))
	for _, r := range recipients {
		if r != "" {
			toSlice = append(toSlice, map[string]string{"email": r})
		}
	}
	if len(toSlice) == 0 {
		return nil
	}

	reqBody := map[string]interface{}{
		"sender": map[string]string{
			"name":  senderName,
			"email": senderEmail,
		},
		"to":          toSlice,
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

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read Brevo API response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Brevo API returned error status %d: %s", resp.StatusCode, string(respBytes))
	}

	var brevoResp struct {
		MessageID string `json:"messageId"`
	}
	_ = json.Unmarshal(respBytes, &brevoResp)

	fmt.Printf(" [BREVO SUCCESS] Email dispatched to %v | MessageID: %s\n", recipients, brevoResp.MessageID)
	return nil
}

func formatRCAHTML(cause, evidence string) string {
	if cause == "" {
		return ""
	}
	return fmt.Sprintf(`
		<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin-top: 20px; font-family: monospace;">
			<div style="font-weight: 800; color: #b45309; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Root Cause Analysis (RCA)</div>
			<div style="font-weight: bold; color: #0f172a; font-size: 12px; margin-bottom: 4px;">Likely Cause: %s</div>
			<div style="color: #475569; font-size: 11px; line-height: 1.5;">%s</div>
		</div>
	`, cause, evidence)
}
