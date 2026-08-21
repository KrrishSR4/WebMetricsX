import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { Database, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  summary: AnalyticsSummary;
}

export const TTFBAnalysis: React.FC<Props> = ({ summary }) => {
  const data = summary.history.map((pt) => ({
    timestamp: new Date(pt.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ttfb: pt.ttfb_ms,
    isSpike: pt.ttfb_ms > 300,
  }));

  const isServerBackendSpike = summary.avg_ttfb_ms > 300;

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-chart-1" />
          <h3 className="font-bold text-base text-foreground">TTFB Server Latency Analysis</h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <Badge variant="outline">Avg: {summary.avg_ttfb_ms} ms</Badge>
          <Badge variant="outline">P95: {summary.p95_ttfb_ms} ms</Badge>
        </div>
      </div>

      <div className="h-48 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            No TTFB telemetry recorded
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: 'currentColor' }} />
              <YAxis unit="ms" tick={{ fontSize: 10, fill: 'currentColor' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-black/10 bg-card p-2.5 shadow-lg text-xs font-mono">
                        <div className="font-bold text-foreground mb-1">{d.timestamp}</div>
                        <div className="text-chart-1 font-bold">TTFB: {d.ttfb} ms</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={200} label={{ value: 'Good TTFB (200ms)', fill: '#22c55e', fontSize: 10 }} stroke="#22c55e" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="ttfb" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Backend Detector Alert */}
      <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-3 ${
        isServerBackendSpike
          ? 'bg-status-down/10 border-status-down/30 text-status-down'
          : 'bg-status-up/10 border-status-up/30 text-status-up'
      }`}>
        <AlertCircle className="w-4 h-4 shrink-0" />
        <div>
          {isServerBackendSpike ? (
            <span><strong>Backend Bottleneck Warning:</strong> Average TTFB ({summary.avg_ttfb_ms}ms) exceeds recommended 200ms threshold. Inspect database query speed or origin server CPU load.</span>
          ) : (
            <span><strong>Server Response Health:</strong> Excellent TTFB ({summary.avg_ttfb_ms}ms avg). Origin web server is processing requests efficiently.</span>
          )}
        </div>
      </div>
    </div>
  );
};
