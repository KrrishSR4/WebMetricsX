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

	// Construct subject based on alert status (Avoiding emojis)
	var subject string
	var statusBg string
	var statusText string
	var statusBorder string
	switch alert.Status {
	case "DOWN":
		subject = fmt.Sprintf("WebMetricsX Alert — Connection DOWN for %s", alert.Website)
		statusBg = "#fef2f2"
		statusText = "#dc2626"
		statusBorder = "#fecaca"
	case "DEGRADED":
		subject = fmt.Sprintf("WebMetricsX Alert — High TTFB / Slow Performance for %s", alert.Website)
		statusBg = "#fffbeb"
		statusText = "#d97706"
		statusBorder = "#fef3c7"
	default:
		subject = fmt.Sprintf("WebMetricsX Status — System Operational for %s", alert.Website)
		statusBg = "#f0fdf4"
		statusText = "#16a34a"
		statusBorder = "#dcfce7"
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
								Continuous Engine Active
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

				%s

				<div style="font-size: 10px; color: #64748b; font-family: monospace; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; line-height: 1.5;">
					<div>Detected At: %s</div>
					<div style="margin-top: 10px;">This is an automated monitoring alert sent by WebMetricsX. Please do not reply directly to this email.</div>
				</div>

			</div>
		</div>
	`, statusBg, statusText, statusBorder, alert.Status, alert.Website, alert.TTFB, alert.Threshold, alert.ResponseTime, alert.Status, alert.DNS, alert.TCP, alert.TLS, alert.Availability, formatRCAHTML(alert.LikelyCause, alert.RCAEvidence), alert.DetectedAt.Format("2006-01-02 15:04:05 MST"))

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
		<div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin-top: 20px; font-family: monospace;">
			<div style="font-weight: 800; color: #b45309; font-size: 10px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Root Cause Analysis (RCA)</div>
			<div style="font-weight: bold; color: #0f172a; font-size: 12px; margin-bottom: 4px;">Likely Cause: %s</div>
			<div style="color: #475569; font-size: 11px; line-height: 1.5;">%s</div>
		</div>
	`, cause, evidence)
}
