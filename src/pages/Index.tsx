import { useEffect, useRef, useState } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useUrlHistory } from '@/hooks/useUrlHistory';
import { useNotifications } from '@/hooks/useNotifications';
import { UrlInput } from '@/components/UrlInput';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Home, CheckCircle2, Activity, Zap, Shield, BarChart3, Search, Globe } from 'lucide-react';
import { Landing } from '@/components/landing/Landing';

const Index = () => {
  const {
    isMonitoring,
    isLoading,
    error,
    metrics,
    startMonitoring,
    stopMonitoring,
  } = useMonitoring();

  const { history, addToHistory, removeFromHistory, clearHistory } = useUrlHistory();
  const { isSupported, toggleNotificationForUrl, isNotificationEnabledForUrl, checkStatusChange } = useNotifications();

  const [showStopped, setShowStopped] = useState(false);
  const [landingOpacity, setLandingOpacity] = useState(1);
  const [monitorSectionOpacity, setMonitorSectionOpacity] = useState(0);
  const monitorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMonitoring && metrics.website.url && metrics.lastChecked) {
      addToHistory({
        url: metrics.website.url,
        lastChecked: metrics.lastChecked,
        status: metrics.website.status,
        responseTime: metrics.website.responseTime,
      });
      checkStatusChange(metrics.website.url, metrics.website.status);
    }
  }, [isMonitoring, metrics.website.url, metrics.website.status, metrics.lastChecked, addToHistory, checkStatusChange]);

  const scrollToMonitor = () => {
    monitorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectFromHistory = (url: string) => {
    setShowStopped(false);
    startMonitoring(url);
    // Don't scroll - let the monitoring section appear naturally
  };

  const handleStart = (url: string) => {
    setShowStopped(false);
    startMonitoring(url);
    // Don't scroll - let the monitoring section appear naturally
  };

  const handleStop = () => {
    stopMonitoring();
    setShowStopped(true);
  };

  const handleReturnHome = () => {
    setShowStopped(false);
    setLandingOpacity(1);
    setMonitorSectionOpacity(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentUrl = metrics.website.url;
  const notificationsEnabled = currentUrl ? isNotificationEnabledForUrl(currentUrl) : false;

  const handleLaunchMonitor = () => {
    // Show monitoring section
    setShowStopped(false);
    // Smooth transition effect
    setLandingOpacity(0);
    setMonitorSectionOpacity(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {!isMonitoring && (
        <section className="text-center space-y-6 py-12 animate-fade-in">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Monitor Any Website
              <br />
              <span className="text-chart-1">In Real-Time</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional website monitoring with live metrics, performance analysis,
              SSL validation, and SEO insights. Updated every 5 seconds.
            </p>
          </div>
        </section>
      )}

      {/* URL Input */}
      <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <UrlInput
          onSubmit={handleStart}
          onStop={handleStop}
          isMonitoring={isMonitoring}
          isLoading={isLoading}
          history={history}
          onSelectHistory={handleSelectFromHistory}
          onRemoveHistory={removeFromHistory}
          onClearHistory={clearHistory}
          currentUrl={currentUrl}
          notificationsEnabled={notificationsEnabled}
          onToggleNotification={() => currentUrl && toggleNotificationForUrl(currentUrl)}
          isNotificationSupported={isSupported}
        />
        {error && (
          <p className="text-center text-status-down text-sm mt-3">{error}</p>
        )}
      </section>

      {/* Dashboard */}
      {isMonitoring && (
        <section className="animate-fade-in-up">
          <Dashboard data={metrics} />
        </section>
      )}

      {/* Features Grid - Show only when not monitoring */}
      {!isMonitoring && (
        <section className="py-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="container">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <Activity className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">Real-Time Monitoring</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Continuous monitoring with 5-second intervals. Track uptime, response times, and status codes live.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <Zap className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">Performance Metrics</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Core Web Vitals, TTFB, DNS lookup, TCP connect, and detailed performance breakdowns.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <Shield className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">SSL Validation</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Certificate validity, expiry dates, and issuer information at a glance.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <BarChart3 className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">Visual Analytics</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Beautiful charts for response time history, performance trends, and metric comparisons.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <Search className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">SEO Analysis</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Comprehensive SEO scoring with title tags, meta descriptions, heading structure, and more.
                </p>
              </div>
              <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                    <Globe className="h-5 w-5 text-chart-1" />
                  </div>
                  <h3 className="font-semibold">Mobile Ready</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fully responsive design optimized for all devices. Monitor on the go.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>WebMetrics — Enterprise-Grade Website Monitoring & SEO Analytics</p>
        </div>
      </footer>

      {/* Marketing landing as overlay */}
      {!isMonitoring && !showStopped && (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-500 ease-in-out"
          style={{ opacity: landingOpacity }}
        >
          <div className="h-full overflow-auto">
            <Landing onLaunch={handleLaunchMonitor} />
          </div>
        </div>
      )}

      {/* Monitor / dashboard surface */}
      <section
        ref={monitorRef}
        className={
          isMonitoring || showStopped
            ? 'min-h-screen bg-background'
            : 'min-h-screen bg-background'
        }
        style={{ opacity: monitorSectionOpacity, transition: 'opacity 0.5s ease-in-out' }}
      >
        {showStopped && (
          <div className="text-center space-y-6 py-16 animate-fade-in">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
                <CheckCircle2 className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-2xl font-bold">Monitoring Stopped</h2>
              <p className="text-muted-foreground max-w-md">
                You've stopped monitoring{' '}
                <span className="font-medium text-foreground">
                  {(() => { try { return new URL(currentUrl).hostname; } catch { return currentUrl || 'the website'; } })()}
                </span>
                . You can start monitoring another website or return to home page.
              </p>
              <Button onClick={handleReturnHome} size="lg" className="h-12 px-8 gap-2 mt-2">
                <Home className="h-5 w-5" />
                Return to Home
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
