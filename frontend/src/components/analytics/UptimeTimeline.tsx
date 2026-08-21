import React from 'react';
import { AnalyticsSummary } from '@/services/monitoringApi';
import { ShieldCheck, AlertOctagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  summary: AnalyticsSummary;
}

export const UptimeTimeline: React.FC<Props> = ({ summary }) => {
  const history = summary.history || [];

  return (
    <div className="rounded-2xl border border-black/10 bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-status-up" />
          <h3 className="font-bold text-base text-foreground">Availability & Uptime Timeline</h3>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <Badge className="bg-status-up/20 text-status-up hover:bg-status-up/30">
            {summary.uptime_percentage ? summary.uptime_percentage.toFixed(2) : '100'}% UPTIME
          </Badge>
          <span className="text-muted-foreground">{summary.total_checks} Total Checks</span>
        </div>
      </div>

      {/* Segmented Timeline Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 h-8 w-full bg-muted/30 rounded-xl p-1 overflow-x-auto">
          {history.length === 0 ? (
            <div className="w-full text-center text-xs text-muted-foreground font-mono">
              No historical checks logged
            </div>
          ) : (
            history.map((pt, idx) => {
              let bg = 'bg-status-up';
              let statusText = 'UP (200 OK)';

              if (!pt.available || pt.status_code >= 500) {
                bg = 'bg-status-down';
                statusText = `DOWN (HTTP ${pt.status_code})`;
              } else if (pt.response_time_ms > 400 || pt.status_code >= 300) {
                bg = 'bg-amber-500';
                statusText = `DEGRADED (${pt.response_time_ms}ms)`;
              }

              return (
                <div
                  key={idx}
                  className={`flex-1 h-full rounded ${bg} transition-all hover:scale-110 cursor-pointer min-w-[6px]`}
                  title={`${new Date(pt.checked_at).toLocaleString()} - ${statusText}`}
                />
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>Oldest Check</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-up" /> UP</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> DEGRADED</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-down" /> DOWN</span>
          </div>
          <span>Latest Check</span>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-black/5 text-xs font-mono">
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Successful Checks</div>
          <div className="text-base font-bold text-status-up mt-0.5">{summary.successful_checks}</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Degraded Checks</div>
          <div className="text-base font-bold text-amber-500 mt-0.5">{summary.degraded_checks}</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Failed Checks</div>
          <div className="text-base font-bold text-status-down mt-0.5">{summary.failed_checks}</div>
        </div>
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="text-[10px] font-sans font-bold uppercase text-muted-foreground">Longest Outage</div>
          <div className="text-base font-bold text-foreground mt-0.5">
            {summary.longest_incident_sec > 0 ? `${summary.longest_incident_sec}s` : 'None (0s)'}
          </div>
        </div>
      </div>
    </div>
  );
};
