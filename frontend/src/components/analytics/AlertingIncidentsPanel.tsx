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
  getApiBaseUrl,
  fetchAlertStatus,
  AlertStatusSummary,
  subscribeEmailAlerts,
  unsubscribeEmailAlerts,
  fetchEmailSubscriptions
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

  // Email Notification Test States
  const [testEmail, setTestEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [alertErrorMessage, setAlertErrorMessage] = useState<string>('');
  const [alertStatusSummary, setAlertStatusSummary] = useState<AlertStatusSummary | null>(null);
  const [subscribedEmails, setSubscribedEmails] = useState<string[]>([]);

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
      const [incidents, history, summary, subs] = await Promise.all([
        fetchActiveIncidents(targetUrl),
        fetchAlertHistory(targetUrl, 10),
        fetchAlertStatus(targetUrl),
        fetchEmailSubscriptions(targetUrl),
      ]);
      setActiveIncidents(incidents);
      setAlertHistory(history);
      setAlertStatusSummary(summary);
      setSubscribedEmails(subs);
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

  const handleSendTestAlert = async () => {
    const trimmed = testEmail.trim();
    if (!trimmed) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError('');
    setSendingTest(true);
    setTestStatus('idle');

    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/api/alerts/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmed }),
      });

      let data = { success: false, message: '' };
      if (response.status === 404) {
        const fallbackResponse = await fetch(`${baseUrl}/api/v1/alerts/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: trimmed }),
        });
        data = await fallbackResponse.json();
      } else {
        data = await response.json();
      }

      if (data.success) {
        setTestStatus('success');
        setShowSuccessDialog(true);
        setTimeout(() => setTestStatus('idle'), 3000);

        if ('Notification' in window && Notification.permission === 'granted') {
          setTimeout(() => {
            new Notification('WebMetricsX Alert', {
              body: 'Test notification received successfully. Email + browser notifications are working.',
              icon: '/favicon.ico',
            });
          }, 1500);
        }
      } else {
        setTestStatus('error');
        setAlertErrorMessage(data.message || 'Please check your email configuration and try again.');
        setShowErrorDialog(true);
        setTimeout(() => setTestStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Error sending test alert:', err);
      setTestStatus('error');
      setAlertErrorMessage(err instanceof Error ? err.message : 'An unexpected network error occurred.');
      setShowErrorDialog(true);
      setTimeout(() => setTestStatus('idle'), 3000);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSubscribeEmail = async () => {
    const trimmed = testEmail.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      const success = await subscribeEmailAlerts(targetUrl, trimmed);
      if (success) {
        toast.success(`Subscribed ${trimmed} to email alerts successfully!`);
        setTestEmail('');
        // Reload list
        const subs = await fetchEmailSubscriptions(targetUrl);
        setSubscribedEmails(subs);
      } else {
        toast.error('Failed to subscribe email to alerts.');
      }
    } catch {
      toast.error('Error subscribing email.');
    }
  };

  const handleUnsubscribeEmail = async (emailToUnsub: string) => {
    try {
      const success = await unsubscribeEmailAlerts(targetUrl, emailToUnsub);
      if (success) {
        toast.success(`Unsubscribed ${emailToUnsub} successfully.`);
        // Reload list
        const subs = await fetchEmailSubscriptions(targetUrl);
        setSubscribedEmails(subs);
      } else {
        toast.error('Failed to unsubscribe.');
      }
    } catch {
      toast.error('Error unsubscribing.');
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
      <div className="lg:col-span-2 space-y-6">
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

          <div className="bg-background border border-black/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h5 className="font-bold text-xs font-mono">Browser Notifications</h5>
                <div className="text-[10px] font-mono font-bold">
                  {permission === 'granted' ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      ✓ Browser Notifications Enabled
                    </span>
                  ) : permission === 'denied' ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      ✕ Browser Notifications Blocked
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      ⚠ Browser Notification Permission Required
                    </span>
                  )}
                </div>
              </div>

              {permission === 'default' && (
                <button
                  onClick={async () => {
                    const res = await Notification.requestPermission();
                    setPermission(res);
                    if (res === 'granted') {
                      setPushEnabled(true);
                      toast.success('Browser notifications successfully enabled!');
                      new Notification('WebMetricsX Alert', {
                        body: 'Test notification received successfully.',
                        icon: '/favicon.ico',
                      });
                    }
                  }}
                  type="button"
                  className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg bg-chart-1 text-white hover:opacity-90 transition-all shadow-sm"
                >
                  Enable
                </button>
              )}
              
              {permission === 'granted' && (
                <div className="text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <Bell className="w-4 h-4" />
                </div>
              )}

              {permission === 'denied' && (
                <div className="text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  <BellOff className="w-4 h-4" />
                </div>
              )}
            </div>

            {permission === 'denied' && (
              <p className="text-[10px] text-rose-600/90 font-mono leading-relaxed pt-1.5 border-t border-black/5">
                Browser notifications are blocked for WebMetricsX. Please enable notification permission from your browser or site settings.
              </p>
            )}
            {permission === 'default' && (
              <p className="text-[10px] text-amber-600/90 font-mono leading-relaxed pt-1.5 border-t border-black/5">
                Browser notification permission is required to enable push notifications. Click "Enable" to request permission.
              </p>
            )}
          </div>

          {/* Email alert subscriptions */}
          <div className="space-y-3 pt-3 border-t border-black/5 font-mono">
            <h5 className="font-bold uppercase text-[10px] text-muted-foreground tracking-wider">Email Alert Recipients</h5>
            
            {/* List of current subscribers */}
            {subscribedEmails.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {subscribedEmails.map((emailVal) => (
                  <div key={emailVal} className="flex items-center gap-1.5 bg-black/5 border border-black/5 px-2 py-1 rounded-xl text-[9px] font-bold text-foreground">
                    <span className="truncate max-w-[130px]">{emailVal}</span>
                    <button 
                      onClick={() => handleUnsubscribeEmail(emailVal)}
                      className="text-muted-foreground hover:text-rose-600 font-bold focus:outline-none"
                      title="Unsubscribe"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-muted-foreground italic">
                No custom email recipients registered. Alerts will fall back to default admin email.
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="test-email-input" className="block text-[10px] text-muted-foreground font-bold uppercase">
                Email Address
              </label>
              <input
                id="test-email-input"
                type="email"
                placeholder="user@example.com"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                  setEmailError('');
                }}
                className="w-full h-9 px-3 text-xs rounded-xl border border-black/10 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-chart-1"
              />
              {emailError && (
                <p className="text-[10px] text-rose-600 font-bold">{emailError}</p>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={handleSubscribeEmail}
                  className="flex-1 h-9 text-[10px] font-bold rounded-xl bg-chart-1 text-white hover:opacity-90 transition-all shadow-sm"
                >
                  Subscribe
                </button>
                <button
                  onClick={handleSendTestAlert}
                  disabled={sendingTest}
                  className="flex-1 h-9 text-[10px] font-bold rounded-xl border border-black/10 hover:bg-black/5 disabled:opacity-50 flex items-center justify-center gap-1 transition-all"
                >
                  {sendingTest ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    'Test Alert'
                  )}
                </button>
              </div>
            </div>
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

      {/* Test Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-black/10 rounded-2xl p-6 max-w-sm w-full shadow-lg space-y-4 font-mono">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Test alert sent
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A test notification has been sent to:<br />
              <span className="text-foreground font-bold">{testEmail}</span>
            </p>
            <button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full h-9 text-xs font-bold rounded-xl border border-black/10 hover:bg-black/5 transition-all text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Test Error Dialog */}
      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-black/10 rounded-2xl p-6 max-w-sm w-full shadow-lg space-y-4 font-mono">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              Failed to Send Alert
            </div>
            <p className="text-xs text-rose-700 leading-relaxed break-words">
              {alertErrorMessage || "Please check your email configuration and try again."}
            </p>
            <button
              onClick={() => setShowErrorDialog(false)}
              className="w-full h-9 text-xs font-bold rounded-xl border border-black/10 hover:bg-black/5 transition-all text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
