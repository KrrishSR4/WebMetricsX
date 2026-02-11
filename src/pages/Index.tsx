import { useEffect, useState } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useUrlHistory } from '@/hooks/useUrlHistory';
import { useNotifications } from '@/hooks/useNotifications';
import { Header } from '@/components/Header';
import { UrlInput } from '@/components/UrlInput';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Shield, Zap, Globe, Search, Home, CheckCircle2 } from 'lucide-react';

const Index = () => {
  const {
    isMonitoring,
    isLoading,
    error,
    metrics,
    startMonitoring,
    stopMonitoring,
  } = useMonitoring();

  const {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useUrlHistory();

  const {
    isSupported,
    toggleNotificationForUrl,
    isNotificationEnabledForUrl,
    checkStatusChange,
  } = useNotifications();

  // Track "stopped" state to show Return to Home
  const [showStopped, setShowStopped] = useState(false);

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

  const handleSelectFromHistory = (url: string) => {
    setShowStopped(false);
    startMonitoring(url);
  };

  const handleStart = (url: string) => {
    setShowStopped(false);
    startMonitoring(url);
  };

  const handleStop = () => {
    stopMonitoring();
    setShowStopped(true);
  };

  const handleReturnHome = () => {
    setShowStopped(false);
  };

  const currentUrl = metrics.website.url;
  const notificationsEnabled = currentUrl ? isNotificationEnabledForUrl(currentUrl) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-8 space-y-8 flex-1">
        {/* Hero Section */}
        {!isMonitoring && !showStopped && (
          <section className="text-center space-y-6 py-16 animate-fade-in">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-4">
                <Activity className="h-3 w-3 text-chart-1" />
                Enterprise-Grade Monitoring
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Monitor Any Website
                <br />
                <span className="text-chart-1">In Real-Time</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Professional website monitoring with live metrics, performance analysis,
                SSL validation, and SEO insights. Updated every 5 seconds.
              </p>
            </div>
          </section>
        )}

        {/* Stopped state - Return to Home */}
        {showStopped && !isMonitoring && (
          <section className="text-center space-y-6 py-16 animate-fade-in">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
                <CheckCircle2 className="h-8 w-8 text-chart-2" />
              </div>
              <h2 className="text-2xl font-bold">Monitoring Stopped</h2>
              <p className="text-muted-foreground max-w-md">
                You've stopped monitoring <span className="font-medium text-foreground">{(() => { try { return new URL(currentUrl).hostname; } catch { return currentUrl || 'the website'; } })()}</span>. 
                You can start monitoring another website or return to the home page.
              </p>
              <Button
                onClick={handleReturnHome}
                size="lg"
                className="h-12 px-8 gap-2 mt-2"
              >
                <Home className="h-5 w-5" />
                Return to Home
              </Button>
            </div>
          </section>
        )}

        {/* URL Input */}
        {!showStopped && (
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
        )}

        {/* Dashboard */}
        {isMonitoring && (
          <section className="animate-fade-in-up">
            <Dashboard data={metrics} />
          </section>
        )}

        {/* Features Grid */}
        {!isMonitoring && !showStopped && (
          <section className="py-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Activity}
                title="Real-Time Monitoring"
                description="Continuous monitoring with 5-second intervals. Track uptime, response times, and status codes live."
              />
              <FeatureCard
                icon={Zap}
                title="Performance Metrics"
                description="Core Web Vitals, TTFB, DNS lookup, TCP connect, and detailed performance breakdowns."
              />
              <FeatureCard
                icon={Shield}
                title="SSL Validation"
                description="Certificate validity, expiry dates, and issuer information at a glance."
              />
              <FeatureCard
                icon={BarChart3}
                title="Visual Analytics"
                description="Beautiful charts for response time history, performance trends, and metric comparisons."
              />
              <FeatureCard
                icon={Search}
                title="SEO Analysis"
                description="Comprehensive SEO scoring with title tags, meta descriptions, heading structure, and more."
              />
              <FeatureCard
                icon={Globe}
                title="Per-Site Alerts"
                description="Enable downtime notifications per website. Get instant alerts when any monitored site goes down."
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>WebMetricsX — Enterprise-Grade Website Monitoring & SEO Analytics</p>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary group-hover:bg-chart-1/10 transition-colors">
          <Icon className="h-5 w-5 text-chart-1" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default Index;
