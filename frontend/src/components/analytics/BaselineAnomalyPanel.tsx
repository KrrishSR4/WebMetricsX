import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import {
  fetchBaseline,
  fetchAnomalyStatus,
  fetchAnalysis,
  MetricBaseline,
  AnomalyEvent,
  GoMonitoringResult,
  TargetBaseline,
  AnomalyStatus,
  AnalysisResponse,
} from '@/services/monitoringApi';

interface BaselineAnomalyPanelProps {
  url: string;
  latestCheck: GoMonitoringResult | null; // Real-time tick to update baseline panel
}

export const BaselineAnomalyPanel: React.FC<BaselineAnomalyPanelProps> = ({
  url,
  latestCheck,
}) => {
  const [windowRange, setWindowRange] = useState<string>('24h');
  const [baselineData, setBaselineData] = useState<TargetBaseline | null>(null);
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load baseline, anomaly status and analysis results
  const loadData = useCallback(async () => {
    if (!url) return;
    try {
      setLoading(true);
      const [baseline, status, analysis] = await Promise.all([
        fetchBaseline(url, windowRange),
        fetchAnomalyStatus(url),
        fetchAnalysis(url),
      ]);
      setBaselineData(baseline);
      setAnomalyStatus(status);
      setAnalysisData(analysis);
    } catch (err) {
      console.warn('Failed to load baseline and anomaly status:', err);
    } finally {
      setLoading(false);
    }
  }, [url, windowRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh status and baseline on new real-time SSE tick
  useEffect(() => {
    if (latestCheck) {
      if (latestCheck.rca || latestCheck.regressions) {
        setAnalysisData({
          rca: latestCheck.rca || null,
          regressions: latestCheck.regressions || null,
        });
      }
      // Small delayed refresh to let DB save complete
      const timeout = setTimeout(() => {
        loadData();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [latestCheck, loadData]);

  if (loading && !baselineData) {
    return (
      <div className="flex items-center justify-center p-8 bg-card border border-black/10 rounded-2xl shadow-sm min-h-[200px]">
        <Loader2 className="w-8 h-8 text-chart-1 animate-spin" />
        <span className="ml-3 text-sm text-muted-foreground font-mono">Fetching baseline metrics...</span>
      </div>
    );
  }

  const isInsufficient = !baselineData || baselineData.insufficient_data;

  // Determine current system status
  const currentStatus = anomalyStatus?.status || 'NORMAL';
  const activeAnomalies: AnomalyEvent[] = anomalyStatus?.active_anomalies || [];

  return (
    <div className="space-y-6">
      {/* Target Status Header Card */}
      <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-chart-1" />
            Performance Baseline & Anomalies
          </h3>
          <p className="text-xs text-muted-foreground font-mono max-w-xl">
            Live anomaly detection comparing real-time probes with statistical limits calculated from historical data.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1 bg-background border border-black/10 rounded-xl p-1 font-mono text-[10px] md:text-xs">
          {['1h', '6h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setWindowRange(r)}
              className={`px-2.5 py-1.5 rounded-lg font-bold uppercase transition-all ${
                windowRange === r
                  ? 'bg-chart-1 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isInsufficient ? (
        <Card className="border border-amber-500/20 bg-amber-500/5 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
            <h4 className="font-bold text-base text-amber-800">Building baseline — more monitoring data required</h4>
            <p className="text-sm text-amber-700/80 max-w-md font-mono leading-relaxed">
              We require at least 10 historical checks for this target to compute normal performance standard deviations. Please keep continuous monitoring running.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status widget */}
          <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider">Overall Status</h4>
              <div className="flex items-center gap-3">
                {currentStatus === 'NORMAL' && (
                  <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                )}
                {currentStatus === 'DEGRADED' && (
                  <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                )}
                {currentStatus === 'ANOMALY' && (
                  <div className="p-3 bg-destructive/10 rounded-2xl border border-destructive/20 text-destructive">
                    <ShieldAlert className="w-10 h-10 animate-bounce" />
                  </div>
                )}
                <div>
                  <div
                    className={`text-2xl font-black font-mono tracking-tight ${
                      currentStatus === 'NORMAL'
                        ? 'text-emerald-600'
                        : currentStatus === 'DEGRADED'
                        ? 'text-amber-500'
                        : 'text-destructive'
                    }`}
                  >
                    {currentStatus}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {currentStatus === 'NORMAL' && 'Operation performance within expected limits.'}
                    {currentStatus === 'DEGRADED' && 'Performance degradation detected.'}
                    {currentStatus === 'ANOMALY' && 'Confirmed active performance anomalies!'}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Anomalies List */}
            <div className="space-y-3 pt-4 border-t border-black/5">
              <div className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Active Anomalies ({activeAnomalies.length})
              </div>
              {activeAnomalies.length === 0 ? (
                <div className="text-xs font-mono text-emerald-600/80 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                  No active anomalies recorded. System functioning cleanly.
                </div>
              ) : (
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {activeAnomalies.map((an) => (
                    <div
                      key={an.id}
                      className={`text-xs font-mono border rounded-xl p-2.5 flex justify-between items-center ${
                        an.severity === 'CRITICAL'
                          ? 'border-destructive/30 bg-destructive/5 text-destructive'
                          : 'border-amber-500/30 bg-amber-500/5 text-amber-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold uppercase flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
                          {an.metric_type.replace('_', ' ')}
                        </div>
                        <div className="text-[9px] opacity-80">
                          Expected {Math.round(an.expected_value)}ms vs Observed {Math.round(an.observed_value)}ms
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/10 font-black text-[9px]">
                          {an.severity}
                        </span>
                        <div className="text-[8px] opacity-80">
                          {new Date(an.detected_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Performance Comparison grid */}
          <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider">Baseline Deviations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Response Time Card */}
              {baselineData.metrics?.response_time && (
                <div className="bg-background border border-black/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold font-mono text-muted-foreground uppercase">Response Time</span>
                    {latestCheck && (
                      <DeviationBadge
                        observed={latestCheck.response_time_ms}
                        baseline={baselineData.metrics.response_time.mean}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Current</div>
                      <div className="text-base font-black text-foreground">
                        {latestCheck ? `${latestCheck.response_time_ms} ms` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Baseline (Mean)</div>
                      <div className="text-base font-bold text-muted-foreground/80">
                        {Math.round(baselineData.metrics.response_time.mean)} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TTFB Card */}
              {baselineData.metrics?.ttfb && (
                <div className="bg-background border border-black/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold font-mono text-muted-foreground uppercase">TTFB</span>
                    {latestCheck && (
                      <DeviationBadge
                        observed={latestCheck.ttfb_ms}
                        baseline={baselineData.metrics.ttfb.mean}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Current</div>
                      <div className="text-base font-black text-foreground">
                        {latestCheck ? `${latestCheck.ttfb_ms} ms` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Baseline (Mean)</div>
                      <div className="text-base font-bold text-muted-foreground/80">
                        {Math.round(baselineData.metrics.ttfb.mean)} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DNS Latency Card */}
              {baselineData.metrics?.dns_latency && (
                <div className="bg-background border border-black/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold font-mono text-muted-foreground uppercase">DNS Lookup</span>
                    {latestCheck && (
                      <DeviationBadge
                        observed={latestCheck.dns_latency_ms}
                        baseline={baselineData.metrics.dns_latency.mean}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Current</div>
                      <div className="text-base font-black text-foreground">
                        {latestCheck ? `${latestCheck.dns_latency_ms} ms` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Baseline (Mean)</div>
                      <div className="text-base font-bold text-muted-foreground/80">
                        {Math.round(baselineData.metrics.dns_latency.mean)} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Cards */}
              {baselineData.metrics?.tcp_latency && (
                <div className="bg-background border border-black/10 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold font-mono text-muted-foreground uppercase">TCP / TLS Latency</span>
                    {latestCheck && (
                      <DeviationBadge
                        observed={latestCheck.tcp_latency_ms + latestCheck.tls_latency_ms}
                        baseline={baselineData.metrics.tcp_latency.mean + baselineData.metrics.tls_latency.mean}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Current Connect</div>
                      <div className="text-base font-black text-foreground">
                        {latestCheck ? `${latestCheck.tcp_latency_ms + latestCheck.tls_latency_ms} ms` : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Baseline (Mean)</div>
                      <div className="text-base font-bold text-muted-foreground/80">
                        {Math.round(baselineData.metrics.tcp_latency.mean + baselineData.metrics.tls_latency.mean)} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RCA & Performance Regression Row (Phase 2.6) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RCA Card */}
          <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-chart-1" />
                Root Cause Diagnosis (RCA)
              </h4>
              <p className="text-[10px] text-muted-foreground font-mono">
                Automated rule-based diagnostics correlating performance phases to locate the primary bottleneck.
              </p>
            </div>

            {!analysisData?.rca ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center space-y-2 min-h-[160px]">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
                <div className="text-xs font-bold text-emerald-800 font-mono">No Latency Bottlenecks</div>
                <p className="text-[10px] text-emerald-700/80 font-mono max-w-[220px]">
                  All components (DNS, TCP, TLS, TTFB) are operating within expected limits.
                </p>
              </div>
            ) : (
              <div
                className={`flex-1 p-4 border rounded-xl space-y-3 min-h-[160px] flex flex-col justify-between ${
                  analysisData.rca.severity === 'CRITICAL'
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-black/15 font-mono">
                        {analysisData.rca.severity}
                      </span>
                      <h5 className="font-black text-sm font-mono mt-1.5 tracking-tight uppercase">
                        {analysisData.rca.likely_cause}
                      </h5>
                    </div>
                    <span className="text-[10px] font-black font-mono px-2 py-1 rounded-lg bg-black/10">
                      Conf: {Math.round(analysisData.rca.confidence)}%
                    </span>
                  </div>

                  <p className="text-[10px] font-mono leading-relaxed opacity-90">
                    {analysisData.rca.evidence}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-current/10 flex items-center justify-between text-[10px] font-mono font-bold">
                  <span>Affected Metric:</span>
                  <span className="uppercase underline decoration-2">{analysisData.rca.affected_metric.replace('_', ' ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Performance Regression Table Card */}
          <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-chart-1" />
                Performance Regression Scanning
              </h4>
              <p className="text-[10px] text-muted-foreground font-mono">
                Statistical regression analysis comparing current metrics against baseline mean averages.
              </p>
            </div>

            {!analysisData?.regressions || analysisData.regressions.length === 0 ? (
              <div className="flex items-center justify-center p-8 border border-dashed border-black/10 rounded-xl text-muted-foreground font-mono text-xs">
                Awaiting regression telemetry checks...
              </div>
            ) : (
              <div className="border border-black/5 rounded-xl overflow-hidden font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/5 text-[10px] uppercase font-bold text-muted-foreground border-b border-black/5">
                      <th className="p-3">Metric</th>
                      <th className="p-3">Baseline Mean</th>
                      <th className="p-3">Observed</th>
                      <th className="p-3">Change</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.regressions.map((reg) => {
                      const isReg = reg.status === 'Performance Regression';
                      const isUp = reg.percentage_change > 0;
                      const absPct = Math.round(Math.abs(reg.percentage_change));

                      return (
                        <tr key={reg.metric_type} className="border-b border-black/5 hover:bg-black/[0.01] transition-colors">
                          <td className="p-3 font-bold uppercase">{reg.metric_type.replace('_', ' ')}</td>
                          <td className="p-3 text-muted-foreground">{Math.round(reg.baseline_value)}ms</td>
                          <td className="p-3 font-black text-foreground">{Math.round(reg.current_value)}ms</td>
                          <td className="p-3">
                            <span
                              className={`font-black flex items-center gap-0.5 ${
                                isUp
                                  ? reg.percentage_change > 30
                                    ? 'text-destructive'
                                    : 'text-amber-500'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {isUp ? '+' : '-'}
                              {absPct}%
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                                isReg
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              }`}
                            >
                              {isReg ? 'Regression' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

// Deviation calculation helper badge
const DeviationBadge: React.FC<{ observed: number; baseline: number }> = ({
  observed,
  baseline,
}) => {
  if (baseline === 0) return null;
  const diff = observed - baseline;
  const pct = (diff / baseline) * 100;
  const isUp = pct > 0;
  const absPct = Math.round(Math.abs(pct));

  if (Math.abs(diff) < 20) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        Normal
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-0.5 border ${
        isUp
          ? pct > 50
            ? 'bg-destructive/10 text-destructive border-destructive/20'
            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
      }`}
    >
      {isUp ? (
        <ArrowUpRight className="w-3.5 h-3.5" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5" />
      )}
      {isUp ? '+' : '-'}
      {absPct}%
    </span>
  );
};
