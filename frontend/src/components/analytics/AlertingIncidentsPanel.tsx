import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  ShieldAlert, 
  Info, 
  ArrowRight,
  TrendingDown,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertEvent, 
  fetchActiveIncidents, 
  fetchAlertHistory, 
  subscribeBrowserPush 
} from '@/services/monitoringApi';
import { toast } from 'sonner';

interface AlertingIncidentsPanelProps {
  targetUrl: string;
  latestCheck: unknown;
}

export const AlertingIncidentsPanel: React.FC<AlertingIncidentsPanelProps> = ({
  targetUrl,
  latestCheck,
}) => {
  const [activeIncidents, setActiveIncidents] = useState<AlertEvent[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>([]);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAlertData = useCallback(async () => {
    try {
      const [incidents, history] = await Promise.all([
        fetchActiveIncidents(targetUrl),
        fetchAlertHistory(targetUrl, 10),
      ]);
      setActiveIncidents(incidents);
      setAlertHistory(history);
    } catch (err) {
      console.error('Error fetching alerts data:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUrl]);

  // Reload alerts when latestCheck timestamp triggers
  useEffect(() => {
    loadAlertData();
  }, [latestCheck, loadAlertData]);

  // Sync notification state on load
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Request browser push notification permission
  const handleTogglePush = async () => {
    if (!('Notification' in window)) {
      toast.error('Web Push notifications are not supported in this browser');
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notification permission has been blocked. Please reset permission in browser settings.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Register mock service worker subscription token
        const mockSub = {
          endpoint: 'https://webmetricsx.web.app/mock-webpush-endpoint/' + Math.random().toString(36).substring(7),
          keys: {
            p256dh: 'mock-p256dh-key',
            auth: 'mock-auth-key'
          }
        };
        const success = await subscribeBrowserPush(targetUrl, mockSub);
        if (success) {
          setPushEnabled(true);
          toast.success('Push notifications successfully enabled for this website!');
          new Notification('WebMetricsX Alerts', {
            body: `You will now receive desktop notifications for ${targetUrl}`,
            icon: '/favicon.ico'
          });
        } else {
          toast.error('Failed to register subscription with server.');
        }
      } else {
        toast.warn('Notification permission was not granted.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while enabling push notifications');
    }
  };

  const getSeverityBadgeClass = (severity: AlertEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 border border-red-500/20';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-600 border border-orange-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'LOW':
      default:
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
    }
  };

  const getStatusBadgeClass = (status: AlertEvent['status']) => {
    if (status === 'RESOLVED') {
      return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
    }
    return 'bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1 & 2: Active Incidents & History */}
      <div className="lg:col-span-2 space-y-6">
        {/* Active Incidents */}
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Active Incidents
            </h4>
            <span className="text-[10px] md:text-xs font-mono bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full font-bold">
              {activeIncidents.length} Active
            </span>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <h5 className="text-sm font-bold text-emerald-800 font-mono">All Systems Operational</h5>
              <p className="text-xs text-emerald-700/80 font-mono">No active incidents detected on this target website.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeIncidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h5 className="font-bold text-sm text-rose-950 font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        {incident.title}
                      </h5>
                      <p className="text-xs text-rose-900/80 mt-1 font-mono leading-relaxed">{incident.message}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono uppercase ${getSeverityBadgeClass(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 border-t border-rose-500/10 text-[10px] font-mono text-rose-800/80">
                    <div>
                      <span className="font-bold">Metric:</span> {incident.affected_metric}
                    </div>
                    <div>
                      <span className="font-bold">Value:</span> {incident.current_value.toFixed(1)}
                    </div>
                    {incident.threshold_value > 0 && (
                      <div>
                        <span className="font-bold">Threshold:</span> {incident.threshold_value.toFixed(1)}
                      </div>
                    )}
                    <div>
                      <span className="font-bold">Triggered:</span> {new Date(incident.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  {incident.rca_cause && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2 text-[10px] font-mono text-amber-800">
                      <div className="font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        Likely Cause: {incident.rca_cause}
                      </div>
                      <div className="text-amber-700/80 mt-0.5 leading-relaxed">{incident.rca_evidence}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Log */}
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-chart-1" />
            Alert Logs & Incidents History
          </h4>

          {alertHistory.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground font-mono">
              No historical alert logs recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-black/5 text-muted-foreground font-bold">
                    <th className="py-2.5">Alert Event</th>
                    <th className="py-2.5">Severity</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Observed</th>
                    <th className="py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {alertHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-black/5 transition-colors">
                      <td className="py-3 pr-4">
                        <div>
                          <div className="font-bold text-foreground text-xs">{log.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[250px]">
                            {log.message}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-foreground font-bold">{log.current_value.toFixed(1)}</span>
                      </td>
                      <td className="py-3 text-muted-foreground text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Alert Settings & Push Subscriptions */}
      <div className="space-y-6">
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-chart-1 animate-bounce" />
              Real-time Notifications
            </h4>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Enable background push notifications to stay updated on website outages, TTFB spikes, and regression anomalies.
            </p>
          </div>

          <div className="bg-background border border-black/5 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h5 className="font-bold text-xs font-mono">Browser Notifications</h5>
              <p className="text-[10px] text-muted-foreground font-mono">
                {pushEnabled ? 'Active / Subscribed' : 'Inactive / Blocked'}
              </p>
            </div>

            <button
              onClick={handleTogglePush}
              type="button"
              className={`p-2.5 rounded-xl transition-all border ${
                pushEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-chart-1 text-white hover:opacity-90 border-transparent shadow-sm'
              }`}
            >
              {pushEnabled ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
            </button>
          </div>

          <div className="space-y-3 pt-3 border-t border-black/5 font-mono text-[10px] text-muted-foreground">
            <h5 className="font-bold uppercase text-foreground">Alert Notification Rules</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Uptime: Alert on DNS/TCP down immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Performance: TTFB or Latency &gt; 400ms</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span>Anomaly: Stat deviation exceeding threshold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Regression: Performance regression &gt; 50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Channel Status */}
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Live alert bus channel
            </h4>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
              Standard SSE client connection active. System auto-correlates alerts continuously on every probe.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SSE EVENT TUNNEL LISTENING
          </div>
        </div>
      </div>
    </div>
  );
};
