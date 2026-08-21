import React from 'react';
import { AnalyticsSummary, HeatmapCell } from '@/services/monitoringApi';
import { Calendar } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const D3PerformanceHeatmap: React.FC<Props> = ({ summary }) => {
  const cells = summary.heatmap || [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getCellColor = (avgMs: number, count: number) => {
    if (count === 0 || avgMs === 0) return 'bg-muted/20'; // Empty cell
    if (avgMs < 200) return 'bg-emerald-500/80 text-white'; // Fast
    if (avgMs < 400) return 'bg-amber-500/80 text-white'; // Degraded
    return 'bg-rose-500/90 text-white'; // Slow
  };

  const getCellData = (day: string, hour: number): HeatmapCell => {
    const match = cells.find((c) => c.day_of_week === day && c.hour_of_day === hour);
    return match || { day_of_week: day, hour_of_day: hour, avg_ms: 0, p95_ms: 0, count: 0 };
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-chart-2" />
          <h3 className="font-bold text-base text-foreground">Performance Heatmap</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Hour x Day Latency Matrix</span>
      </div>

      <div className="overflow-x-auto pt-2">
        <div className="min-w-[550px] space-y-1">
          {/* Hours Header */}
          <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground pl-10 mb-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center font-bold">
                {h % 3 === 0 ? `${h}h` : ''}
              </div>
            ))}
          </div>

          {/* Days Rows */}
          {days.map((day) => (
            <div key={day} className="flex items-center gap-1">
              <span className="w-9 text-[10px] font-mono font-bold text-muted-foreground text-right pr-2 shrink-0">
                {day}
              </span>
              <div className="flex-1 flex gap-1">
                {hours.map((hour) => {
                  const cell = getCellData(day, hour);
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-5 rounded ${getCellColor(
                        cell.avg_ms,
                        cell.count
                      )} transition-all hover:scale-110 cursor-pointer relative group`}
                      title={`${day} ${hour}:00 - Avg: ${cell.avg_ms}ms, P95: ${cell.p95_ms}ms (${cell.count} checks)`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[10px] font-mono text-muted-foreground">
        <span>Identifies recurring hourly slowdowns</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" /> &lt;200ms
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/80" /> 200-400ms
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500/90" /> &gt;400ms
          </span>
        </div>
      </div>
    </div>
  );
};
