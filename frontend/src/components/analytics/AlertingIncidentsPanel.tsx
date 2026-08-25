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
  Activity,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertEvent, 
  fetchActiveIncidents, 
  fetchAlertHistory, 
  subscribeBrowserPush,
  fetchAlertStatus,
  AlertStatusSummary,
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

  const [alertStatusSummary, setAlertStatusSummary] = useState<AlertStatusSummary | null>(null);

  // Browser Permission State
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Defensive check to avoid TypeError if states are not arrays
  const activeList = Array.isArray(activeIncidents) ? activeIncidents : [];
  const historyList = Array.isArray(alertHistory) ? alertHistory : [];

  const formatTime = (timeStr: string | undefined | null) => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
  };

  // Find all critical alerts
  const criticalProbes = [...activeList, ...historyList].filter(
    (log) => log.severity === 'CRITICAL'
  );

  const sortedCriticals = [...criticalProbes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const earliestTime = sortedCriticals.length > 0
    ? formatTime(sortedCriticals[0].timestamp)
    : '';

  const latestTime = sortedCriticals.length > 0
    ? formatTime(sortedCriticals[sortedCriticals.length - 1].timestamp)
    : '';

  // Filter logs list to display only CRITICAL events
  const criticalLogs = historyList.filter((log) => log.severity === 'CRITICAL');

  const loadAlertData = useCallback(async () => {
    try {
      const [incidents, history, summary] = await Promise.all([
        fetchActiveIncidents(targetUrl),
        fetchAlertHistory(targetUrl, 10),
        fetchAlertStatus(targetUrl),
      ]);
      setActiveIncidents(incidents);
      setAlertHistory(history);
      setAlertStatusSummary(summary);
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
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
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
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult === 'granted') {
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
        toast.warning('Notification permission was not granted.');
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

  const getCooldownCountdown = (alertType: 'HIGH_LATENCY' | 'WEBSITE_DOWN') => {
    if (!alertStatusSummary || !alertStatusSummary.cooldowns) return null;
    const cd = alertStatusSummary.cooldowns[alertType];
    if (!cd || !cd.in_cooldown || !cd.remaining_sec) return null;
    
    const minutes = Math.floor(cd.remaining_sec / 60);
    const seconds = cd.remaining_sec % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getAlertStatusState = () => {
    if (!alertStatusSummary) return { status: 'healthy', label: 'Monitoring Healthy', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' };

    const activeInc = alertStatusSummary.active_incidents || [];
    const isDownActive = activeInc.some(i => i.alert_type === 'WEBSITE_DOWN' && i.status !== 'RESOLVED');
    const isLatencyActive = activeInc.some(i => i.alert_type === 'HIGH_LATENCY' && i.status !== 'RESOLVED');

    if (isDownActive) {
      const countdown = getCooldownCountdown('WEBSITE_DOWN');
      const nextEligibleStr = countdown ? ` (Next email eligible in ${countdown})` : '';
      return {
        status: 'down',
        label: `Website Down${nextEligibleStr}`,
        color: 'text-rose-600 bg-rose-500/10 border-rose-500/20 animate-pulse',
      };
    }

    if (isLatencyActive) {
      const countdown = getCooldownCountdown('HIGH_LATENCY');
      const nextEligibleStr = countdown ? ` (Next email eligible in ${countdown})` : '';
      return {
        status: 'degraded',
        label: `High Latency Detected${nextEligibleStr}`,
        color: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
      };
    }

    const hasRecentRecovery = historyList.length > 0 && historyList[0].status === 'RESOLVED';
    if (hasRecentRecovery) {
      return {
        status: 'recovered',
        label: 'Recovered',
        color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
      };
    }

    return {
      status: 'healthy',
      label: 'Monitoring Healthy',
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    };
  };

  const statusState = getAlertStatusState();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1 & 2: Alert History */}
      <div className="lg:col-span-3 space-y-6">
        {/* Active Alerting Policy Status */}
        <div className="bg-card border border-black/10 rounded-2xl p-6 shadow-sm space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-chart-1 animate-pulse" />
              Active Alerting Policy Status
            </h4>
            <div className={`text-[10px] font-bold px-3 py-1 rounded-full border ${statusState.color}`}>
              {statusState.status === 'healthy' || statusState.status === 'recovered' ? '🟢' : statusState.status === 'degraded' ? '🟠' : '🔴'} {statusState.label}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs">
            <div className="bg-black/5 rounded-xl py-3 space-y-1">
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Last Alert Sent</div>
              <div className="font-bold text-foreground text-xs">
                {alertStatusSummary?.last_alert_sent_at ? formatTime(alertStatusSummary.last_alert_sent_at) : 'N/A'}
              </div>
            </div>
            <div className="bg-black/5 rounded-xl py-3 space-y-1">
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Alert Count</div>
              <div className="font-bold text-foreground text-xs">
                {alertStatusSummary?.sent_count ?? 0}
              </div>
            </div>
            <div className="bg-black/5 rounded-xl py-3 space-y-1">
              <div className="text-muted-foreground text-[10px] uppercase font-bold">Suppressed Alerts</div>
              <div className="font-bold text-foreground text-xs">
                {alertStatusSummary?.suppressed_count ?? 0}
              </div>
            </div>
          </div>
        </div>

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

          {historyList.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground font-mono">
              No historical alert logs recorded.
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
                  {historyList.map((log) => (
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
                        {formatTime(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
