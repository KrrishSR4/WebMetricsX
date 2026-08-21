import React from 'react';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { Layers } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const PerformanceWaterfall: React.FC<Props> = ({ summary }) => {
  const latest = summary.history.length > 0 ? summary.history[summary.history.length - 1] : null;

  const dns = latest ? latest.dns_latency_ms : summary.phase_breakdown.dns_ms || 0;
  const tcp = latest ? latest.tcp_latency_ms : summary.phase_breakdown.tcp_ms || 0;
  const tls = latest ? latest.tls_latency_ms : summary.phase_breakdown.tls_ms || 0;
  const ttfb = latest ? latest.ttfb_ms : summary.phase_breakdown.ttfb_ms || 0;
  const total = latest ? latest.response_time_ms : summary.phase_breakdown.total_ms || 1;
  
  const download = total > ttfb ? total - ttfb : 0;

  const phases = [
    { name: '1. DNS Resolution', duration: dns, color: 'bg-chart-3', text: 'text-chart-3' },
    { name: '2. TCP Socket Connection', duration: tcp, color: 'bg-chart-4', text: 'text-chart-4' },
    { name: '3. TLS Handshake', duration: tls, color: 'bg-chart-1', text: 'text-chart-1' },
    { name: '4. Time To First Byte (TTFB)', duration: ttfb, color: 'bg-chart-2', text: 'text-chart-2' },
    { name: '5. Content Download', duration: download, color: 'bg-status-up', text: 'text-status-up' },
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-chart-3" />
          <h3 className="font-bold text-base text-foreground">Performance Waterfall</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Latest Probe Breakdown</span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {phases.map((phase, idx) => {
          const widthPct = total > 0 ? Math.max(5, Math.min(100, (phase.duration / total) * 100)) : 5;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-foreground">{phase.name}</span>
                <span className={`font-bold ${phase.text}`}>{phase.duration} ms</span>
              </div>
              <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden relative">
                <div
                  className={`h-full ${phase.color} rounded-full transition-all duration-500`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs font-mono">
        <span className="text-muted-foreground font-sans font-bold">Total Request Duration:</span>
        <span className="text-lg font-black text-chart-1">{total} ms</span>
      </div>
    </div>
  );
};
