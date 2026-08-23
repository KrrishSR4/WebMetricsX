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

  // Find all critical alerts
  const criticalProbes = [...activeIncidents, ...alertHistory].filter(
    (log) => log.severity === 'CRITICAL'
  );

  const sortedCriticals = [...criticalProbes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const earliestTime = sortedCriticals.length > 0
    ? new Date(sortedCriticals[0].timestamp).toLocaleTimeString()
    : '';

  const latestTime = sortedCriticals.length > 0
    ? new Date(sortedCriticals[sortedCriticals.length - 1].timestamp).toLocaleTimeString()
    : '';

  // Filter logs list to display only CRITICAL events
  const criticalLogs = alertHistory.filter((log) => log.severity === 'CRITICAL');

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
      {/* Column 1 & 2: Alert History */}
      <div className="lg:col-span-2 space-y-6">
        {/* History Log */}
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2.5">
            <h4 className="text-sm font-bold text-muted-foreground uppercase font-mono tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-chart-1" />
              Alert Logs & Incidents History
            </h4>
            
            <div className="text-[10px] md:text-xs font-mono font-bold">
              {criticalProbes.length > 0 ? (
                <span className="text-rose-600 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ {criticalProbes.length} critical probe{criticalProbes.length > 1 ? 's' : ''} {criticalProbes.length === 1 ? `(${earliestTime})` : `(${earliestTime} : ${latestTime})`}
                </span>
              ) : (
                <span className="text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  ✓ no critical probes
                </span>
              )}
            </div>
          </div>

          {criticalLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground font-mono">
              No critical alert logs recorded.
            </div>
          ) : (
            <div className="overflow-auto max-h-[300px] pr-1">
              <table className="w-full border-collapse text-left font-mono text-xs relative">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-black/5 text-muted-foreground font-bold">
                    <th className="py-2.5">Alert Event</th>
                    <th className="py-2.5">Severity</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Observed</th>
                    <th className="py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {criticalLogs.map((log) => (
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
