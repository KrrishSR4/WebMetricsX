export interface GoMonitoringResult {
  target_id?: string;
  url: string;
  available: boolean;
  status_code: number;
  dns_latency_ms: number;
  tcp_latency_ms: number;
  tls_latency_ms: number;
  ttfb_ms: number;
  response_time_ms: number;
  ssl_valid: boolean;
  ssl_expiry_date?: string;
  ssl_issuer?: string;
  error_message?: string;
  checked_at: string;
  anomaly_state?: string;
  anomaly_severity?: string;
  rca?: RCAData | null;
  regressions?: PerformanceRegression[] | null;
}

export interface LatencyBucket {
  label: string;
  min_ms: number;
  max_ms: number;
  count: number;
}

export interface PhaseBreakdown {
  dns_ms: number;
  dns_pct: number;
  tcp_ms: number;
  tcp_pct: number;
  tls_ms: number;
  tls_pct: number;
  ttfb_ms: number;
  ttfb_pct: number;
  download_ms: number;
  download_pct: number;
  total_ms: number;
}

export interface StatusDistribution {
  status_code: number;
  category: string;
  count: number;
}

export interface HeatmapCell {
  day_of_week: string;
  hour_of_day: number;
  avg_ms: number;
  p95_ms: number;
  count: number;
}

export interface AnalyticsSummary {
  target_url: string;
  time_range: string;
  total_checks: number;
  successful_checks: number;
  failed_checks: number;
  degraded_checks: number;
  uptime_percentage: number;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p75_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  avg_ttfb_ms: number;
  p50_ttfb_ms: number;
  p95_ttfb_ms: number;
  p99_ttfb_ms: number;
  longest_incident_sec: number;
  latency_buckets: LatencyBucket[];
  phase_breakdown: PhaseBreakdown;
  status_distribution: StatusDistribution[];
  heatmap: HeatmapCell[];
  history: GoMonitoringResult[];
}

export interface GoApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8081';
};

export const runGoMonitoringCheck = async (
  targetUrl: string,
  targetId?: string
): Promise<GoMonitoringResult> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/check`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        target_id: targetId,
      }),
    });

    const data: GoApiResponse<GoMonitoringResult> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to run monitoring check`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export const startContinuousMonitoring = async (
  targetUrl: string,
  intervalSec: number = 30
): Promise<{ target_id: string; status: string }> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/start`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        interval_sec: intervalSec,
      }),
    });

    const data: GoApiResponse<{ target_id: string; status: string }> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to start continuous monitoring`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export const stopContinuousMonitoring = async (
  targetUrl: string
): Promise<{ status: string }> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/stop`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
      }),
    });

    const data: GoApiResponse<{ status: string }> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to stop continuous monitoring`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export const connectMonitoringSSE = (
  targetUrl: string,
  onCheckResult: (res: GoMonitoringResult) => void
): (() => void) => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/stream?url=${encodeURIComponent(targetUrl)}`;

  const eventSource = new EventSource(endpoint);

  eventSource.addEventListener('telemetry', (event: MessageEvent) => {
    try {
      const data: GoMonitoringResult = JSON.parse(event.data);
      onCheckResult(data);
    } catch (err) {
      console.warn('Failed to parse SSE telemetry event:', err);
    }
  });

  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) {
      console.debug('[SSE] Connection closed');
    }
  };

  return () => {
    eventSource.close();
  };
};

export const fetchAnalyticsSummary = async (
  targetUrl: string,
  timeRange: string = '24h'
): Promise<AnalyticsSummary> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/analytics?url=${encodeURIComponent(targetUrl)}&range=${encodeURIComponent(timeRange)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AnalyticsSummary> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to fetch analytics summary`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export const fetchMonitoredTargets = async (): Promise<string[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/targets`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<string[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export const pauseContinuousMonitoring = async (
  targetUrl: string
): Promise<{ status: string }> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/pause`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
      }),
    });

    const data: GoApiResponse<{ status: string }> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to pause monitoring`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export const resumeContinuousMonitoring = async (
  targetUrl: string,
  intervalSec: number = 30
): Promise<{ target_id: string; status: string }> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/resume`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        interval_sec: intervalSec,
      }),
    });

    const data: GoApiResponse<{ target_id: string; status: string }> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      const errorMsg = data.error?.message || `HTTP ${response.status}: Failed to resume monitoring`;
      throw new Error(errorMsg);
    }

    return data.data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Backend service unreachable at ${baseUrl}. Ensure the Go backend server is running.`
      );
    }
    throw err;
  }
};

export interface TargetDetails {
	id: string;
	url: string;
	name: string;
	is_active: boolean;
	status: string;
	interval_sec: number;
	latency_threshold_ms?: number;
	last_checked_at?: string;
	next_checked_at?: string;
	created_at: string;
	updated_at: string;
}

export const fetchMonitorStatus = async (
  targetId: string
): Promise<TargetDetails | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/status/${encodeURIComponent(targetId)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<TargetDetails> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export const listContinuousMonitors = async (): Promise<TargetDetails[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/list`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<TargetDetails[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export interface MetricBaseline {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  stddev: number;
  sample_count: number;
}

export interface TargetBaseline {
  target_id: string;
  time_window: string;
  metrics: {
    response_time: MetricBaseline;
    ttfb: MetricBaseline;
    dns_latency: MetricBaseline;
    tcp_latency: MetricBaseline;
    tls_latency: MetricBaseline;
  };
  insufficient_data: boolean;
  calculated_at: string;
}

export interface AnomalyEvent {
  id: string;
  target_id: string;
  metric_type: string;
  lifecycle_state: string;
  severity: string;
  observed_value: number;
  expected_value: number;
  deviation_percentage: number;
  consecutive_count: number;
  detected_at: string;
  resolved_at: string | null;
  status: string;
}

export interface AnomalyStatus {
  status: 'NORMAL' | 'DEGRADED' | 'ANOMALY';
  active_anomalies: AnomalyEvent[];
}

export interface AnomalyStats {
  total_detected: number;
  total_resolved: number;
  mean_resolution_sec: number;
  severity_counts: Record<string, number>;
  metric_counts: Record<string, number>;
}

export const fetchBaseline = async (
  targetUrl: string,
  timeRange: string = '24h'
): Promise<TargetBaseline | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/baseline?url=${encodeURIComponent(targetUrl)}&range=${encodeURIComponent(timeRange)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<TargetBaseline> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export const fetchAnomalyStatus = async (
  targetUrl: string
): Promise<AnomalyStatus | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/anomalies/status?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AnomalyStatus> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export const fetchRecentAnomalies = async (
  targetUrl: string
): Promise<AnomalyEvent[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/anomalies/recent?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AnomalyEvent[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export const fetchAnomalyStats = async (
  targetUrl: string
): Promise<AnomalyStats | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/anomalies/stats?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AnomalyStats> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export interface RCAData {
  likely_cause: string;
  affected_metric: string;
  evidence: string;
  confidence: number;
  severity: string;
}

export interface PerformanceRegression {
  metric_type: string;
  baseline_value: number;
  current_value: number;
  percentage_change: number;
  status: string;
}

export interface AnalysisResponse {
  rca: RCAData | null;
  regressions: PerformanceRegression[] | null;
}

export const fetchAnalysis = async (
  targetUrl: string
): Promise<AnalysisResponse | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/analysis?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AnalysisResponse> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export interface AlertEvent {
  id: string;
  target_id: string;
  alert_type: string; // DOWN, HIGH_TTFB, HIGH_LATENCY, ANOMALY, REGRESSION, SERVER_ERROR
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  affected_metric: string;
  current_value: number;
  threshold_value: number;
  rca_cause?: string | null;
  rca_evidence?: string | null;
  timestamp: string;
  status: 'TRIGGERED' | 'ACTIVE' | 'RESOLVED';
  notification_status: 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED';
  resolved_at?: string | null;
}

export const fetchAlertHistory = async (
  targetUrl: string,
  limit: number = 20
): Promise<AlertEvent[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/history?url=${encodeURIComponent(targetUrl)}&limit=${limit}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AlertEvent[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export const fetchActiveIncidents = async (
  targetUrl: string
): Promise<AlertEvent[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/active?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AlertEvent[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export const subscribeBrowserPush = async (
  targetUrl: string,
  subscription: unknown
): Promise<boolean> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/subscribe`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        subscription,
      }),
    });

    const data: GoApiResponse<{ status: string }> = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
};

export interface AlertCooldownDetails {
  in_cooldown: boolean;
  remaining_sec?: number;
  next_eligible?: string;
}

export interface AlertStatusSummary {
  active_incidents: AlertEvent[];
  triggered_count: number;
  sent_count: number;
  suppressed_count: number;
  last_alert_sent_at?: string;
  cooldowns: {
    HIGH_LATENCY: AlertCooldownDetails;
    WEBSITE_DOWN: AlertCooldownDetails;
  };
}

export const fetchAlertStatus = async (
  targetUrl: string
): Promise<AlertStatusSummary | null> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/status?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<AlertStatusSummary> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return null;
    }

    return data.data;
  } catch {
    return null;
  }
};

export const subscribeEmailAlerts = async (
  targetUrl: string,
  email: string
): Promise<boolean> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/subscribe/email`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        email,
      }),
    });

    const data: GoApiResponse<unknown> = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
};

export const unsubscribeEmailAlerts = async (
  targetUrl: string,
  email: string
): Promise<boolean> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/unsubscribe/email`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        email,
      }),
    });

    const data: GoApiResponse<unknown> = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
};

export const fetchEmailSubscriptions = async (
  targetUrl: string
): Promise<string[]> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/alerts/subscribe/email/list?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(endpoint);
    const data: GoApiResponse<string[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data;
  } catch {
    return [];
  }
};

export const updateLatencyThreshold = async (
  targetUrl: string,
  thresholdMs: number
): Promise<boolean> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/monitoring/threshold`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        threshold_ms: thresholdMs,
      }),
    });

    const data: GoApiResponse<unknown> = await response.json();
    return response.ok && data.success;
  } catch {
    return false;
  }
};
