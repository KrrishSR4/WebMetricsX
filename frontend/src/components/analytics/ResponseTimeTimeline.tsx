import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { Activity, Sliders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  summary: AnalyticsSummary;
  threshold?: number;
  onThresholdChange?: (val: number) => void;
}

export const ResponseTimeTimeline: React.FC<Props> = ({ 
  summary, 
  threshold: propThreshold, 
  onThresholdChange 
}) => {
  const [localThreshold, setLocalThreshold] = useState<number>(400);

  const threshold = propThreshold !== undefined ? propThreshold : localThreshold;

  const handleThresholdSelect = (val: number) => {
    if (onThresholdChange) {
      onThresholdChange(val);
    } else {
      setLocalThreshold(val);
    }
  };

  const data = summary.history.map((pt) => ({
    timestamp: new Date(pt.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    fullDate: new Date(pt.checked_at).toLocaleString(),
    responseTime: pt.response_time_ms,
    ttfb: pt.ttfb_ms,
    statusCode: pt.status_code,
    isSpike: pt.response_time_ms > threshold || pt.status_code >= 400,
  }));

  const latestVal = data.length > 0 ? data[data.length - 1].responseTime : summary.avg_response_time_ms;

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-chart-1" />
            <h3 className="font-bold text-lg text-foreground tracking-tight">
              Real-Time Response Time Timeline
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Continuous latency telemetry with dynamic spike threshold detection
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs border-chart-1/30 bg-chart-1/5 text-chart-1">
            Current: {latestVal} ms
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Avg: {summary.avg_response_time_ms} ms
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            P50: {summary.p50_response_time_ms} ms
          </Badge>
          <Badge variant="outline" className="font-mono text-xs border-chart-3/30 text-chart-3">
            P95: {summary.p95_response_time_ms} ms
          </Badge>
          <Badge variant="outline" className="font-mono text-xs border-chart-4/30 text-chart-4">
            P99: {summary.p99_response_time_ms} ms
          </Badge>

          {/* Threshold Selector */}
          <div className="flex items-center gap-1.5 ml-2 bg-muted/40 px-2 py-1 rounded-lg border border-black/5">
            <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Threshold:</span>
            <select
              value={threshold}
              onChange={(e) => handleThresholdSelect(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value={100}>100 ms</option>
              <option value={200}>200 ms</option>
              <option value={300}>300 ms</option>
              <option value={400}>400 ms</option>
              <option value={600}>600 ms</option>
              <option value={800}>800 ms</option>
              <option value={1000}>1000 ms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
            No telemetry points recorded yet for this time range. Click "Run Go Check" to generate live points.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: 'currentColor' }} opacity={0.6} />
              <YAxis unit="ms" tick={{ fontSize: 11, fill: 'currentColor' }} opacity={0.6} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-black/10 bg-card/95 p-3 shadow-xl text-xs space-y-1 font-mono">
                        <div className="text-[10px] text-muted-foreground border-b border-black/5 pb-1 font-sans font-bold">
                          {d.fullDate}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Response Time:</span>
                          <span className="font-bold text-chart-1">{d.responseTime} ms</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">TTFB:</span>
                          <span className="font-bold text-foreground">{d.ttfb} ms</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">HTTP Status:</span>
                          <span className={d.statusCode === 200 ? 'text-status-up font-bold' : 'text-status-down font-bold'}>
                            {d.statusCode}
                          </span>
                        </div>
                        {d.isSpike && (
                          <div className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded mt-1">
                            ⚠ Latency Spike Detected (&gt;{threshold}ms)
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={threshold} label={{ value: `Threshold (${threshold}ms)`, fill: '#ef4444', fontSize: 11 }} stroke="#ef4444" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="responseTime" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLatency)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
