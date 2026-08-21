import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { ShieldAlert } from 'lucide-react';

interface Props {
  summary: AnalyticsSummary;
}

export const StatusCodeDistribution: React.FC<Props> = ({ summary }) => {
  const dist = summary.status_distribution || [];

  const getColor = (code: number) => {
    if (code >= 200 && code < 300) return '#22c55e'; // Green
    if (code >= 300 && code < 400) return '#3b82f6'; // Blue
    if (code >= 400 && code < 500) return '#f59e0b'; // Amber
    if (code >= 500) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const chartData = dist.map((item) => ({
    name: `HTTP ${item.status_code || 'Err'} (${item.category})`,
    value: item.count,
    color: getColor(item.status_code),
  }));

  const total = summary.total_checks || 1;

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-chart-4" />
          <h3 className="font-bold text-base text-foreground">HTTP Status Distribution</h3>
        </div>
        <span className="text-xs text-muted-foreground font-mono">Response Codes</span>
      </div>

      <div className="relative h-44 w-full flex items-center justify-center">
        {chartData.length === 0 ? (
          <div className="text-xs text-muted-foreground font-mono">No status codes logged</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0];
                    const pct = ((Number(d.value) / total) * 100).toFixed(1);
                    return (
                      <div className="rounded-xl border border-black/10 bg-card p-2 shadow-lg text-xs font-mono">
                        <div className="font-bold text-foreground">{d.name}</div>
                        <div style={{ color: d.color }}>
                          {d.value} Checks ({pct}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checks</span>
          <span className="text-lg font-black text-foreground font-mono">{summary.total_checks}</span>
        </div>
      </div>

      {/* Summary Rates */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/5 text-center text-xs font-mono">
        <div className="p-2 rounded-xl bg-status-up/10 text-status-up">
          <div className="text-[9px] uppercase tracking-wider font-sans font-bold">2xx Success</div>
          <div className="font-bold mt-0.5">{summary.successful_checks}</div>
        </div>
        <div className="p-2 rounded-xl bg-chart-3/10 text-chart-3">
          <div className="text-[9px] uppercase tracking-wider font-sans font-bold">Degraded</div>
          <div className="font-bold mt-0.5">{summary.degraded_checks}</div>
        </div>
        <div className="p-2 rounded-xl bg-status-down/10 text-status-down">
          <div className="text-[9px] uppercase tracking-wider font-sans font-bold">Failed / 5xx</div>
          <div className="font-bold mt-0.5">{summary.failed_checks}</div>
        </div>
      </div>
    </div>
  );
};
