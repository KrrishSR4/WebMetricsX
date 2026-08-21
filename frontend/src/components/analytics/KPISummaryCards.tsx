import React from 'react';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { Activity, Clock, ShieldCheck, Zap, BarChart3, Database } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const KPISummaryCards: React.FC<Props> = ({ summary }) => {
  const formatMs = (ms: number) => (ms !== undefined && ms !== null ? `${ms} ms` : '0 ms');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Availability */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">Availability</span>
          <ShieldCheck className="w-4 h-4 text-status-up" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {summary.uptime_percentage ? summary.uptime_percentage.toFixed(1) : '100'}%
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          {summary.successful_checks} / {summary.total_checks} Checks UP
        </div>
      </div>

      {/* Average Response Time */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">Avg Response</span>
          <Zap className="w-4 h-4 text-chart-1" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {formatMs(summary.avg_response_time_ms)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          Mean Latency
        </div>
      </div>

      {/* P50 Median */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">P50 (Median)</span>
          <BarChart3 className="w-4 h-4 text-chart-2" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {formatMs(summary.p50_response_time_ms)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          50th Percentile
        </div>
      </div>

      {/* P95 Latency */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">P95 Latency</span>
          <Activity className="w-4 h-4 text-chart-3" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {formatMs(summary.p95_response_time_ms)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          95th Percentile
        </div>
      </div>

      {/* P99 Latency */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">P99 Latency</span>
          <Clock className="w-4 h-4 text-chart-4" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {formatMs(summary.p99_response_time_ms)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          99th Percentile
        </div>
      </div>

      {/* Avg TTFB */}
      <div className="rounded-2xl border border-black/10 bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">Avg TTFB</span>
          <Database className="w-4 h-4 text-chart-1" />
        </div>
        <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
          {formatMs(summary.avg_ttfb_ms)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-semibold">
          Time To First Byte
        </div>
      </div>
    </div>
  );
};
