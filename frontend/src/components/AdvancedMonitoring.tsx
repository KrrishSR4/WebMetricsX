import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Cpu,
  Globe,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
  Clock,
  Play,
  Square,
  Pause,
  CheckCircle2,
} from 'lucide-react';
import {
  runGoMonitoringCheck,
  startContinuousMonitoring,
  stopContinuousMonitoring,
  pauseContinuousMonitoring,
  resumeContinuousMonitoring,
  fetchMonitorStatus,
  listContinuousMonitors,
  connectMonitoringSSE,
  fetchAnalyticsSummary,
  fetchMonitoredTargets,
  GoMonitoringResult,
  AnalyticsSummary,
  HeatmapCell,
} from '@/services/monitoringApi';

import { KPISummaryCards } from '@/components/analytics/KPISummaryCards';
import { ResponseTimeTimeline } from '@/components/analytics/ResponseTimeTimeline';
import { LatencyDistribution } from '@/components/analytics/LatencyDistribution';
import { PerformanceWaterfall } from '@/components/analytics/PerformanceWaterfall';
import { PhaseBreakdownDonut } from '@/components/analytics/PhaseBreakdownDonut';
import { StatusCodeDistribution } from '@/components/analytics/StatusCodeDistribution';
import { D3PerformanceRadar } from '@/components/analytics/D3PerformanceRadar';
import { D3PerformanceHeatmap } from '@/components/analytics/D3PerformanceHeatmap';
import { TTFBAnalysis } from '@/components/analytics/TTFBAnalysis';
import { UptimeTimeline } from '@/components/analytics/UptimeTimeline';

export const AdvancedMonitoring: React.FC = () => {
  const [url, setUrl] = useState<string>('https://google.com');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [monitoringInterval, setMonitoringInterval] = useState<number>(3); // 3s default
  const [monitoringStatus, setMonitoringStatus] = useState<'ACTIVE' | 'PAUSED' | 'STOPPED'>('STOPPED');
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<string | null>(null);
  const [targetsList, setTargetsList] = useState<string[]>([]);

  const [loadingToggle, setLoadingToggle] = useState<boolean>(false);
  
  const [latestCheck, setLatestCheck] = useState<GoMonitoringResult | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [localHistory, setLocalHistory] = useState<GoMonitoringResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isMonitoringActive = monitoringStatus === 'ACTIVE';

  // Clear local history when url changes to keep data clean
  useEffect(() => {
    setLocalHistory([]);
    setLatestCheck(null);
  }, [url]);

  const handleCheckReceived = useCallback((check: GoMonitoringResult) => {
    setLatestCheck(check);
    setLocalHistory((prev) => {
      // Prevent duplicate timestamps in local history state
      if (prev.some((p) => p.checked_at === check.checked_at)) {
        return prev;
      }
      const updated = [...prev, check];
      if (updated.length > 50) {
        updated.shift();
      }
      return updated;
    });
  }, []);

  // Fetch current monitor status for the URL
  const loadMonitorStatus = useCallback(async () => {
    if (!url) return;
    try {
      const list = await listContinuousMonitors();
      const matched = list.find((m) => m.url === url);
      if (matched) {
        setMonitoringStatus(matched.status as any);
        setLastCheckTime(matched.last_checked_at || null);
        setNextCheckTime(matched.next_checked_at || null);
      } else {
        setMonitoringStatus('STOPPED');
        setLastCheckTime(null);
        setNextCheckTime(null);
      }
    } catch {
      // Fallback
    }
  }, [url]);

  // Load target list on mount
  useEffect(() => {
    fetchMonitoredTargets().then((list) => {
      if (list && list.length > 0) {
        setTargetsList(list);
      }
    });
  }, []);

  // Refresh status on URL change and periodically
  useEffect(() => {
    loadMonitorStatus();
    const interval = setInterval(loadMonitorStatus, 4000);
    return () => clearInterval(interval);
  }, [loadMonitorStatus]);

  // Fetch Analytics Summary for current URL and timeRange
  const loadAnalytics = useCallback(async (targetUrl: string, range: string) => {
    if (!targetUrl) return;
    try {
      const data = await fetchAnalyticsSummary(targetUrl, range);
      setSummary(data);
    } catch (err: any) {
      console.warn('Analytics fetch error:', err.message);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(url, timeRange);
  }, [url, timeRange, loadAnalytics]);

  // Connect Server-Sent Events (SSE) Live Telemetry Stream when Monitoring is Active
  useEffect(() => {
    if (!isMonitoringActive || !url) return;

    console.log(`[SSE] Establishing live telemetry stream for ${url}`);
    const cleanupSSE = connectMonitoringSSE(url, (newCheck) => {
      console.log('[SSE] Live probe tick received:', newCheck);
      handleCheckReceived(newCheck);
      loadAnalytics(url, timeRange);
      loadMonitorStatus();
    });

    return () => {
      console.log(`[SSE] Closing stream for ${url}`);
      cleanupSSE();
    };
  }, [isMonitoringActive, url, timeRange, loadAnalytics, handleCheckReceived, loadMonitorStatus]);

  // Start/Stop Continuous Backend Monitoring
  const handleToggleMonitoring = async () => {
    if (!url || url.trim() === '') return;
    setLoadingToggle(true);
    setError(null);

    try {
      if (monitoringStatus === 'ACTIVE' || monitoringStatus === 'PAUSED') {
        await stopContinuousMonitoring(url);
        setMonitoringStatus('STOPPED');
      } else {
        await startContinuousMonitoring(url, monitoringInterval);
        setMonitoringStatus('ACTIVE');
        await loadAnalytics(url, timeRange);
      }
      await loadMonitorStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to update continuous monitoring state.');
    } finally {
      setLoadingToggle(false);
    }
  };

  // Pause continuous checks
  const handlePauseMonitoring = async () => {
    if (!url || url.trim() === '') return;
    setLoadingToggle(true);
    setError(null);

    try {
      await pauseContinuousMonitoring(url);
      setMonitoringStatus('PAUSED');
      await loadMonitorStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to pause monitoring.');
    } finally {
      setLoadingToggle(false);
    }
  };

  // Resume continuous checks
  const handleResumeMonitoring = async () => {
    if (!url || url.trim() === '') return;
    setLoadingToggle(true);
    setError(null);

    try {
      await resumeContinuousMonitoring(url, monitoringInterval);
      setMonitoringStatus('ACTIVE');
      await loadMonitorStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to resume monitoring.');
    } finally {
      setLoadingToggle(false);
    }
  };



  // Dynamically calculate full AnalyticsSummary from local history state if backend DB has no data
  const computeAnalyticsSummary = (historyList: GoMonitoringResult[], targetUrl: string, range: string): AnalyticsSummary => {
    const total = historyList.length;
    if (total === 0) {
      return {
        target_url: targetUrl,
        time_range: range,
        total_checks: 0,
        successful_checks: 0,
        failed_checks: 0,
        degraded_checks: 0,
        uptime_percentage: 100,
        avg_response_time_ms: 0,
        p50_response_time_ms: 0,
        p75_response_time_ms: 0,
        p95_response_time_ms: 0,
        p99_response_time_ms: 0,
        min_response_time_ms: 0,
        max_response_time_ms: 0,
        avg_ttfb_ms: 0,
        p50_ttfb_ms: 0,
        p95_ttfb_ms: 0,
        p99_ttfb_ms: 0,
        longest_incident_sec: 0,
        latency_buckets: [
          { label: '0-50ms', min_ms: 0, max_ms: 50, count: 0 },
          { label: '50-100ms', min_ms: 50, max_ms: 100, count: 0 },
          { label: '100-200ms', min_ms: 100, max_ms: 200, count: 0 },
          { label: '200-300ms', min_ms: 200, max_ms: 300, count: 0 },
          { label: '300-500ms', min_ms: 300, max_ms: 500, count: 0 },
          { label: '500ms-1s', min_ms: 500, max_ms: 1000, count: 0 },
          { label: '1s+', min_ms: 1000, max_ms: 999999, count: 0 },
        ],
        phase_breakdown: {
          dns_ms: 0, dns_pct: 0, tcp_ms: 0, tcp_pct: 0, tls_ms: 0, tls_pct: 0,
          ttfb_ms: 0, ttfb_pct: 0, download_ms: 0, download_pct: 0, total_ms: 0
        },
        status_distribution: [],
        heatmap: [],
        history: [],
      };
    }

    const sortedLatency = [...historyList].map((h) => h.response_time_ms).sort((a, b) => a - b);
    const sortedTTFB = [...historyList].map((h) => h.ttfb_ms).sort((a, b) => a - b);

    const getPercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    const successful = historyList.filter((h) => h.available && h.status_code < 400).length;
    const failed = historyList.filter((h) => !h.available || h.status_code >= 500).length;
    const degraded = historyList.filter((h) => h.response_time_ms > 400 && h.status_code < 500).length;

    const uptime = (successful / total) * 100;

    const avgResponse = Math.round(historyList.reduce((sum, h) => sum + h.response_time_ms, 0) / total);
    const avgTTFB = Math.round(historyList.reduce((sum, h) => sum + h.ttfb_ms, 0) / total);

    const avgDNS = Math.round(historyList.reduce((sum, h) => sum + h.dns_latency_ms, 0) / total);
    const avgTCP = Math.round(historyList.reduce((sum, h) => sum + h.tcp_latency_ms, 0) / total);
    const avgTLS = Math.round(historyList.reduce((sum, h) => sum + h.tls_latency_ms, 0) / total);

    const buckets = [
      { label: '0-50ms', min_ms: 0, max_ms: 50, count: historyList.filter(h => h.response_time_ms <= 50).length },
      { label: '50-100ms', min_ms: 50, max_ms: 100, count: historyList.filter(h => h.response_time_ms > 50 && h.response_time_ms <= 100).length },
      { label: '100-200ms', min_ms: 100, max_ms: 200, count: historyList.filter(h => h.response_time_ms > 100 && h.response_time_ms <= 200).length },
      { label: '200-300ms', min_ms: 200, max_ms: 300, count: historyList.filter(h => h.response_time_ms > 200 && h.response_time_ms <= 300).length },
      { label: '300-500ms', min_ms: 300, max_ms: 500, count: historyList.filter(h => h.response_time_ms > 300 && h.response_time_ms <= 500).length },
      { label: '500ms-1s', min_ms: 500, max_ms: 1000, count: historyList.filter(h => h.response_time_ms > 500 && h.response_time_ms <= 1000).length },
      { label: '1s+', min_ms: 1000, max_ms: 999999, count: historyList.filter(h => h.response_time_ms > 1000).length },
    ];

    const statusMap: Record<number, number> = {};
    historyList.forEach((h) => {
      statusMap[h.status_code] = (statusMap[h.status_code] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusMap).map(([code, count]) => ({
      status_code: Number(code),
      category: Number(code) >= 200 && Number(code) < 300 ? '2xx Success' : 'Error',
      count,
    }));

    // Heatmap calculation
    const heatmap: HeatmapCell[] = [];
    const heatmapMap: Record<string, { sum: number; p95s: number[]; count: number }> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    historyList.forEach((h) => {
      const d = new Date(h.checked_at);
      const day = days[d.getDay()];
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      if (!heatmapMap[key]) {
        heatmapMap[key] = { sum: 0, p95s: [], count: 0 };
      }
      heatmapMap[key].sum += h.response_time_ms;
      heatmapMap[key].p95s.push(h.response_time_ms);
      heatmapMap[key].count++;
    });
    Object.entries(heatmapMap).forEach(([key, val]) => {
      const [day, hour] = key.split('-');
      val.p95s.sort((a, b) => a - b);
      const p95 = getPercentile(val.p95s, 95);
      heatmap.push({
        day_of_week: day,
        hour_of_day: Number(hour),
        avg_ms: Math.round(val.sum / val.count),
        p95_ms: p95,
        count: val.count,
      });
    });

    return {
      target_url: targetUrl,
      time_range: range,
      total_checks: total,
      successful_checks: successful,
      failed_checks: failed,
      degraded_checks: degraded,
      uptime_percentage: uptime,
      avg_response_time_ms: avgResponse,
      p50_response_time_ms: getPercentile(sortedLatency, 50),
      p75_response_time_ms: getPercentile(sortedLatency, 75),
      p95_response_time_ms: getPercentile(sortedLatency, 95),
      p99_response_time_ms: getPercentile(sortedLatency, 99),
      min_response_time_ms: sortedLatency[0],
      max_response_time_ms: sortedLatency[sortedLatency.length - 1],
      avg_ttfb_ms: avgTTFB,
      p50_ttfb_ms: getPercentile(sortedTTFB, 50),
      p95_ttfb_ms: getPercentile(sortedTTFB, 95),
      p99_ttfb_ms: getPercentile(sortedTTFB, 99),
      longest_incident_sec: 0,
      latency_buckets: buckets,
      phase_breakdown: {
        dns_ms: avgDNS, dns_pct: 0,
        tcp_ms: avgTCP, tcp_pct: 0,
        tls_ms: avgTLS, tls_pct: 0,
        ttfb_ms: avgTTFB, ttfb_pct: 0,
        download_ms: Math.max(0, avgResponse - avgTTFB), download_pct: 0,
        total_ms: avgResponse,
      },
      status_distribution: statusDistribution,
      heatmap,
      history: historyList,
    };
  };

  const activeSummary: AnalyticsSummary = summary && summary.total_checks > 0
    ? summary
    : computeAnalyticsSummary(localHistory, url, timeRange);

  return (
    <div className="w-full space-y-8 animate-fade-in pb-16">
      {/* Top Control Bar Header */}
      <div className="relative overflow-hidden rounded-2xl border border-chart-1/30 bg-gradient-to-br from-card via-card/90 to-chart-1/5 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu className="w-64 h-64 text-chart-1" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chart-1/30 bg-chart-1/10 text-xs font-bold uppercase tracking-wider text-chart-1 mb-3">
              <Zap className="w-3.5 h-3.5" />
              Go Continuous Monitoring Engine (V2.0 Scheduler)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Real-Time Continuous Monitoring
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Background Go worker tickers execute continuous network probes and stream telemetry live via SSE.
            </p>
          </div>

          <div className="flex items-center gap-3">
          {/* Live Worker Status Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 border font-mono text-xs px-3 py-1.5 rounded-xl font-bold ${
              monitoringStatus === 'ACTIVE'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : monitoringStatus === 'PAUSED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-muted/60 border-black/10 text-muted-foreground'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                monitoringStatus === 'ACTIVE'
                  ? 'bg-emerald-500 animate-pulse'
                  : monitoringStatus === 'PAUSED'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`} />
              <span>{monitoringStatus === 'ACTIVE' ? `ACTIVE (${monitoringInterval}s Ticker)` : monitoringStatus}</span>
            </div>

            {lastCheckTime && (
              <div className="flex items-center gap-2 bg-muted/40 border border-black/5 rounded-xl px-3 py-1.5 text-xs font-mono text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-chart-1" />
                <span>Last Check: {new Date(lastCheckTime).toLocaleTimeString()}</span>
              </div>
            )}

            {nextCheckTime && monitoringStatus === 'ACTIVE' && (
              <div className="flex items-center gap-2 bg-muted/40 border border-black/5 rounded-xl px-3 py-1.5 text-xs font-mono text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-chart-2 animate-spin-slow" />
                <span>Next Check: {new Date(nextCheckTime).toLocaleTimeString()}</span>
              </div>
            )}

            <div className="flex items-center gap-2 bg-muted/40 border border-black/5 rounded-xl px-4 py-1.5 text-xs font-mono text-muted-foreground">
              <Server className="w-4 h-4 text-chart-2" />
              <span>API: {import.meta.env.VITE_API_URL || 'http://localhost:8081'}</span>
            </div>
          </div>
        </div>
      </div>

        {/* Input & Filter Controls Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleToggleMonitoring(); }} className="mt-6 flex flex-wrap items-stretch gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter website URL (e.g. https://google.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-11 h-12 text-sm bg-background border-black/10 focus:border-chart-1 rounded-xl shadow-inner font-mono w-full"
            />
          </div>

          {/* Target Selector Dropdown */}
          {targetsList.length > 0 && (
            <select
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 px-3 text-xs bg-background border border-black/10 rounded-xl font-mono cursor-pointer min-w-[160px] shrink-0"
            >
              <option value={url}>Select Saved Target...</option>
              {targetsList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          {/* Monitoring Interval Selector */}
          <div className="flex items-center gap-1.5 bg-background border border-black/10 rounded-xl px-3 py-2 font-mono text-xs shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Interval:</span>
            <select
              value={monitoringInterval}
              onChange={(e) => setMonitoringInterval(Number(e.target.value))}
              disabled={monitoringStatus !== 'STOPPED'}
              className="bg-transparent font-bold focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value={3}>3 sec</option>
              <option value={30}>30 sec</option>
              <option value={60}>1 min</option>
              <option value={300}>5 min</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-background border border-black/10 rounded-xl p-1 font-mono text-xs shrink-0">
            {['1h', '6h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-2 rounded-lg font-bold uppercase transition-all ${
                  timeRange === range
                    ? 'bg-chart-1 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Continuous Worker Controls: Start, Pause, Resume, Stop */}
          {monitoringStatus === 'STOPPED' ? (
            <Button
              type="button"
              onClick={handleToggleMonitoring}
              disabled={loadingToggle}
              className="h-12 px-5 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loadingToggle ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Continuous Monitoring
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {monitoringStatus === 'ACTIVE' ? (
                <Button
                  type="button"
                  onClick={handlePauseMonitoring}
                  disabled={loadingToggle}
                  className="h-12 px-4 font-bold rounded-xl shadow-md transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {loadingToggle ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      Pause
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleResumeMonitoring}
                  disabled={loadingToggle}
                  className="h-12 px-4 font-bold rounded-xl shadow-md transition-all flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loadingToggle ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Resume
                    </>
                  )}
                </Button>
              )}

              <Button
                type="button"
                onClick={handleToggleMonitoring}
                disabled={loadingToggle}
                className="h-12 px-4 font-bold rounded-xl shadow-md transition-all flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {loadingToggle ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    Stop
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 flex items-start gap-4 text-destructive animate-fade-in shadow-md">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-base">Monitoring Operation Error</h3>
            <p className="text-sm opacity-90 leading-relaxed font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* 1. KPI SUMMARY CARDS */}
      <KPISummaryCards summary={activeSummary} />

      {/* 2. REAL-TIME RESPONSE TIME TIMELINE */}
      <ResponseTimeTimeline summary={activeSummary} />

      {/* 3. TWO-COLUMN: LATENCY DISTRIBUTION + TTFB ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyDistribution summary={activeSummary} />
        <TTFBAnalysis summary={activeSummary} />
      </div>

      {/* 4. THREE-COLUMN: WATERFALL + PHASE BREAKDOWN + STATUS DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PerformanceWaterfall summary={activeSummary} />
        <PhaseBreakdownDonut summary={activeSummary} />
        <StatusCodeDistribution summary={activeSummary} />
      </div>

      {/* 5. TWO-COLUMN: D3 PERFORMANCE RADAR + D3 HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <D3PerformanceRadar summary={activeSummary} />
        <D3PerformanceHeatmap summary={activeSummary} />
      </div>

      {/* 6. AVAILABILITY / UPTIME TIMELINE */}
      <UptimeTimeline summary={activeSummary} />
    </div>
  );
};
