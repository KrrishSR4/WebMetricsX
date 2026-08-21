import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Cpu,
  Globe,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  runGoMonitoringCheck,
  fetchAnalyticsSummary,
  fetchMonitoredTargets,
  GoMonitoringResult,
  AnalyticsSummary,
} from '@/services/monitoringApi';

import { KPISummaryCards } from '@/components/analytics/KPISummaryCards';
import { ResponseTimeTimeline } from '@/components/analytics/ResponseTimeTimeline';
import { LatencyDistribution } from '@/components/analytics/LatencyDistribution';
import { PerformanceWaterfall } from '@/components/analytics/PerformanceWaterfall';
import { PhaseBreakdownDonut } from '@/components/analytics/PhaseBreakdownDonut';
import { StatusCodeDistribution } from '@/components/analytics/StatusCodeDistribution';
import { D3LatencyScatterPlot } from '@/components/analytics/D3LatencyScatterPlot';
import { D3PerformanceHeatmap } from '@/components/analytics/D3PerformanceHeatmap';
import { TTFBAnalysis } from '@/components/analytics/TTFBAnalysis';
import { UptimeTimeline } from '@/components/analytics/UptimeTimeline';

export const AdvancedMonitoring: React.FC = () => {
  const [url, setUrl] = useState<string>('https://google.com');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = Off
  const [targetsList, setTargetsList] = useState<string[]>([]);

  const [loadingCheck, setLoadingCheck] = useState<boolean>(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  const [latestCheck, setLatestCheck] = useState<GoMonitoringResult | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load target list on mount
  useEffect(() => {
    fetchMonitoredTargets().then((list) => {
      if (list && list.length > 0) {
        setTargetsList(list);
      }
    });
  }, []);

  // Fetch Analytics Summary for current URL and timeRange
  const loadAnalytics = useCallback(async (targetUrl: string, range: string) => {
    if (!targetUrl) return;
    setLoadingAnalytics(true);
    try {
      const data = await fetchAnalyticsSummary(targetUrl, range);
      setSummary(data);
    } catch (err: any) {
      console.warn('Analytics fetch error:', err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(url, timeRange);
  }, [url, timeRange, loadAnalytics]);

  // Auto-Refresh Effect
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadAnalytics(url, timeRange);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, url, timeRange, loadAnalytics]);

  // Execute Live Check
  const handleRunCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url || url.trim() === '') return;

    setLoadingCheck(true);
    setError(null);

    setLoadingStep('Resolving DNS target...');
    const t1 = setTimeout(() => setLoadingStep('Establishing TCP connection...'), 300);
    const t2 = setTimeout(() => setLoadingStep('Performing TLS handshake & SSL check...'), 600);
    const t3 = setTimeout(() => setLoadingStep('Sending HTTP GET & measuring TTFB...'), 900);

    try {
      const data = await runGoMonitoringCheck(url);
      setLatestCheck(data);
      // Immediately reload analytics to include this new probe result
      await loadAnalytics(url, timeRange);
    } catch (err: any) {
      setError(err.message || 'An error occurred while probing the website.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setLoadingCheck(false);
      setLoadingStep('');
    }
  };

  // Construct fallback summary if database has 0 historical points yet
  const activeSummary: AnalyticsSummary = summary && summary.total_checks > 0 ? summary : {
    target_url: url,
    time_range: timeRange,
    total_checks: latestCheck ? 1 : 0,
    successful_checks: latestCheck && latestCheck.available ? 1 : 0,
    failed_checks: latestCheck && !latestCheck.available ? 1 : 0,
    degraded_checks: 0,
    uptime_percentage: latestCheck && latestCheck.available ? 100 : 0,
    avg_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    p50_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    p75_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    p95_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    p99_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    min_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    max_response_time_ms: latestCheck ? latestCheck.response_time_ms : 0,
    avg_ttfb_ms: latestCheck ? latestCheck.ttfb_ms : 0,
    p50_ttfb_ms: latestCheck ? latestCheck.ttfb_ms : 0,
    p95_ttfb_ms: latestCheck ? latestCheck.ttfb_ms : 0,
    p99_ttfb_ms: latestCheck ? latestCheck.ttfb_ms : 0,
    longest_incident_sec: 0,
    latency_buckets: [
      { label: '0-50ms', min_ms: 0, max_ms: 50, count: latestCheck && latestCheck.response_time_ms <= 50 ? 1 : 0 },
      { label: '50-100ms', min_ms: 50, max_ms: 100, count: latestCheck && latestCheck.response_time_ms > 50 && latestCheck.response_time_ms <= 100 ? 1 : 0 },
      { label: '100-200ms', min_ms: 100, max_ms: 200, count: latestCheck && latestCheck.response_time_ms > 100 && latestCheck.response_time_ms <= 200 ? 1 : 0 },
      { label: '200-300ms', min_ms: 200, max_ms: 300, count: latestCheck && latestCheck.response_time_ms > 200 && latestCheck.response_time_ms <= 300 ? 1 : 0 },
      { label: '300-500ms', min_ms: 300, max_ms: 500, count: latestCheck && latestCheck.response_time_ms > 300 && latestCheck.response_time_ms <= 500 ? 1 : 0 },
      { label: '500ms-1s', min_ms: 500, max_ms: 1000, count: latestCheck && latestCheck.response_time_ms > 500 && latestCheck.response_time_ms <= 1000 ? 1 : 0 },
      { label: '1s+', min_ms: 1000, max_ms: 999999, count: latestCheck && latestCheck.response_time_ms > 1000 ? 1 : 0 },
    ],
    phase_breakdown: {
      dns_ms: latestCheck ? latestCheck.dns_latency_ms : 0,
      dns_pct: 0,
      tcp_ms: latestCheck ? latestCheck.tcp_latency_ms : 0,
      tcp_pct: 0,
      tls_ms: latestCheck ? latestCheck.tls_latency_ms : 0,
      tls_pct: 0,
      ttfb_ms: latestCheck ? latestCheck.ttfb_ms : 0,
      ttfb_pct: 0,
      download_ms: latestCheck ? Math.max(0, latestCheck.response_time_ms - latestCheck.ttfb_ms) : 0,
      download_pct: 0,
      total_ms: latestCheck ? latestCheck.response_time_ms : 1,
    },
    status_distribution: latestCheck ? [{ status_code: latestCheck.status_code, category: '2xx Success', count: 1 }] : [],
    heatmap: [],
    history: latestCheck ? [latestCheck] : [],
  };

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
              Go Observability Engine (V2.0 Analytics)
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Real-Time Monitoring Dashboard
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Live HTTP, TTFB, DNS, TCP, and TLS metrics powered by Go probes &amp; Neon PostgreSQL telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 border border-black/5 rounded-xl px-4 py-2 text-xs font-mono text-muted-foreground">
            <Server className="w-4 h-4 text-chart-2 animate-pulse" />
            <span>API: {import.meta.env.VITE_API_URL || 'http://localhost:8081'}</span>
          </div>
        </div>

        {/* Input & Filter Controls Form */}
        <form onSubmit={handleRunCheck} className="mt-6 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter website URL (e.g. https://google.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-11 h-12 text-sm bg-background border-black/10 focus:border-chart-1 rounded-xl shadow-inner font-mono"
            />
          </div>

          {/* Target Selector Dropdown */}
          {targetsList.length > 0 && (
            <select
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-12 px-3 text-xs bg-background border border-black/10 rounded-xl font-mono cursor-pointer"
            >
              <option value={url}>Select Saved Target...</option>
              {targetsList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

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

          {/* Auto Refresh Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-black/10 rounded-xl px-3 py-2 font-mono text-xs shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              <option value={0}>Auto-Refresh: Off</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={loadingCheck}
            className="h-12 px-6 bg-chart-1 hover:bg-chart-1/90 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0"
          >
            {loadingCheck ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Probing...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                Run Go Check
              </>
            )}
          </Button>
        </form>

        {/* Loading Step Animation */}
        {loadingCheck && (
          <div className="mt-4 p-3 rounded-xl bg-chart-1/10 border border-chart-1/20 flex items-center gap-3 text-xs font-mono text-chart-1 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{loadingStep || 'Executing Go probes...'}</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 flex items-start gap-4 text-destructive animate-fade-in shadow-md">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-base">Monitoring Probe Failed</h3>
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

      {/* 5. TWO-COLUMN: D3 SCATTER PLOT + D3 HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <D3LatencyScatterPlot summary={activeSummary} />
        <D3PerformanceHeatmap summary={activeSummary} />
      </div>

      {/* 6. AVAILABILITY / UPTIME TIMELINE */}
      <UptimeTimeline summary={activeSummary} />
    </div>
  );
};
