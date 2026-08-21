import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { BarChart3 } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const LatencyDistribution: React.FC<Props> = ({ summary }) => {
  const buckets = summary.latency_buckets || [];

  const colors = [
    '#22c55e', // 0-50ms (Green)
    '#10b981', // 50-100ms
    '#3b82f6', // 100-200ms (Blue)
    '#6366f1', // 200-300ms (Indigo)
    '#f59e0b', // 300-500ms (Amber)
    '#f97316', // 500ms-1s (Orange)
    '#ef4444', // 1s+ (Red)
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-chart-2" />
          <h3 className="font-bold text-base text-foreground">Response Time Distribution</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Frequency Histogram</span>
      </div>

      {/* Histogram Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'currentColor' }} />
            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-black/10 bg-card p-2.5 shadow-lg text-xs font-mono">
                      <div className="font-bold text-foreground mb-1">{d.label} Bucket</div>
                      <div className="text-chart-2 font-bold">{d.count} Probing Checks</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {buckets.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latency Percentile Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 text-center text-xs font-mono">
        <div className="p-2 rounded-xl bg-muted/30">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-sans font-bold">Min / Max</div>
          <div className="font-bold text-foreground mt-0.5">{summary.min_response_time_ms} - {summary.max_response_time_ms} ms</div>
        </div>
        <div className="p-2 rounded-xl bg-muted/30">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-sans font-bold">P50 / P75</div>
          <div className="font-bold text-foreground mt-0.5">{summary.p50_response_time_ms} / {summary.p75_response_time_ms} ms</div>
        </div>
        <div className="p-2 rounded-xl bg-muted/30">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-sans font-bold">P95 / P99</div>
          <div className="font-bold text-chart-1 mt-0.5">{summary.p95_response_time_ms} / {summary.p99_response_time_ms} ms</div>
        </div>
      </div>
    </div>
  );
};
