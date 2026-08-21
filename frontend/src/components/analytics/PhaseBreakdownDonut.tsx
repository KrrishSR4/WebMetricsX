import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { PieChart as PieIcon } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const PhaseBreakdownDonut: React.FC<Props> = ({ summary }) => {
  const pb = summary.phase_breakdown;

  const data = [
    { name: 'DNS Lookup', value: pb.dns_ms || 1, color: '#3b82f6' },
    { name: 'TCP Connect', value: pb.tcp_ms || 1, color: '#6366f1' },
    { name: 'TLS Handshake', value: pb.tls_ms || 1, color: '#ec4899' },
    { name: 'TTFB', value: pb.ttfb_ms || 1, color: '#f59e0b' },
    { name: 'Download', value: pb.download_ms || 1, color: '#22c55e' },
  ];

  const total = pb.total_ms || 1;

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-chart-1" />
          <h3 className="font-bold text-base text-foreground">Phase Breakdown</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">% Contribution</span>
      </div>

      <div className="relative h-44 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0];
                  const pct = total > 0 ? ((Number(d.value) / total) * 100).toFixed(1) : '0';
                  return (
                    <div className="rounded-xl border border-black/10 bg-card p-2 shadow-lg text-xs font-mono">
                      <div className="font-bold text-foreground">{d.name}</div>
                      <div style={{ color: d.color }}>
                        {d.value} ms ({pct}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Label */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="text-lg font-black text-foreground font-mono">{total} ms</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/5 text-[11px] font-mono">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground truncate">{item.name}:</span>
              <span className="font-bold text-foreground ml-auto">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
