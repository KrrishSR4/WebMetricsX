import { useEffect } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useUrlHistory } from '@/hooks/useUrlHistory';
import { Header } from '@/components/Header';
import { UrlInput } from '@/components/UrlInput';
import { Dashboard } from '@/components/Dashboard';
import { Activity, BarChart3, Shield, Zap, Globe, Search } from 'lucide-react';

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

  // Save to history when monitoring data updates
  useEffect(() => {
    if (isMonitoring && metrics.website.url && metrics.lastChecked) {
      addToHistory({
        url: metrics.website.url,
        lastChecked: metrics.lastChecked,
        status: metrics.website.status,
        responseTime: metrics.website.responseTime,
      });
    }
  }, [isMonitoring, metrics.website.url, metrics.website.status, metrics.website.responseTime, metrics.lastChecked, addToHistory]);

  const handleSelectFromHistory = (url: string) => {
    startMonitoring(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8 space-y-8">
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
            onSubmit={startMonitoring}
            onStop={stopMonitoring}
            isMonitoring={isMonitoring}
            isLoading={isLoading}
            history={history}
            onSelectHistory={handleSelectFromHistory}
            onRemoveHistory={removeFromHistory}
            onClearHistory={clearHistory}
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
                title="Mobile Ready"
                description="Fully responsive design optimized for all devices. Monitor on the go."
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container text-center text-sm text-muted-foreground">
          <p>WebMetrics — Enterprise-Grade Website Monitoring & SEO Analytics</p>
        </div>
      </footer>
    </div>
  );
};

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          <Icon className="h-5 w-5 text-chart-1" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
