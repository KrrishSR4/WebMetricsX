package monitoring

import (
	"context"
	"io"
	"net/http"
	"net/http/httptrace"
	"time"
)

// ProbeHTTP executes an HTTP/HTTPS request measuring status code, TTFB, and total latency
func ProbeHTTP(ctx context.Context, targetURL string, options CheckOptions) HTTPResult {
	start := time.Now()
	var ttfbTime time.Time

	trace := &httptrace.ClientTrace{
		GotFirstResponseByte: func() {
			ttfbTime = time.Now()
		},
	}

	traceCtx := httptrace.WithClientTrace(ctx, trace)

	req, err := http.NewRequestWithContext(traceCtx, http.MethodGet, targetURL, nil)
	if err != nil {
		return HTTPResult{
			ErrorMessage: err.Error(),
		}
	}

	req.Header.Set("User-Agent", "WebMetricsX/2.0 (Website Health & Performance Monitor)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	client := &http.Client{
		Timeout: options.Timeout,
	}

	if !options.FollowRedirects {
		client.CheckRedirect = func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		totalMs := time.Since(start).Milliseconds()
		return HTTPResult{
			ResponseTimeMs: totalMs,
			ErrorMessage:   err.Error(),
		}
	}
	defer resp.Body.Close()

	if ttfbTime.IsZero() {
		ttfbTime = time.Now()
	}

	ttfbMs := ttfbTime.Sub(start).Milliseconds()

	// Drain body up to 512KB for accurate download timing
	_, _ = io.CopyN(io.Discard, resp.Body, 512*1024)
	end := time.Now()

	totalMs := end.Sub(start).Milliseconds()
	downloadMs := end.Sub(ttfbTime).Milliseconds()

	return HTTPResult{
		StatusCode:     resp.StatusCode,
		TTFBMs:         ttfbMs,
		ResponseTimeMs: totalMs,
		DownloadTimeMs: downloadMs,
	}
}
