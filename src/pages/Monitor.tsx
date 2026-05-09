import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useUrlHistory } from '@/hooks/useUrlHistory';
import { useNotifications } from '@/hooks/useNotifications';
import { UrlInput } from '@/components/UrlInput';
import { Dashboard } from '@/components/Dashboard';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Globe,
  Home,
  Search,
  Shield,
  Zap,
} from 'lucide-react';

const featureCards = [
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Continuous monitoring with 5-second intervals. Track uptime, response times, and status codes live.',
  },
  {
    icon: Zap,
    title: 'Performance Metrics',
    description: 'Core Web Vitals, TTFB, DNS lookup, TCP connect, and detailed performance breakdowns.',
  },
  {
    icon: Shield,
    title: 'SSL Validation',
    description: 'Certificate validity, expiry dates, and issuer information at a glance.',
  },
  {
    icon: BarChart3,
    title: 'Visual Analytics',
    description: 'Beautiful charts for response time history, performance trends, and metric comparisons.',
  },
  {
    icon: Search,
    title: 'SEO Analysis',
    description: 'Comprehensive SEO scoring with title tags, meta descriptions, heading structure, and more.',
  },
  {
    icon: Globe,
    title: 'Mobile Ready',
    description: 'Fully responsive design optimized for all devices. Monitor on the go.',
  },
];

const Monitor = () => {
  const navigate = useNavigate();
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
  }, [isMonitoring, metrics.website.url, metrics.website.status, metrics.website.responseTime, metrics.lastChecked, addToHistory, checkStatusChange]);

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
    navigate('/');
  };

  const currentUrl = metrics.website.url;
  const notificationsEnabled = currentUrl ? isNotificationEnabledForUrl(currentUrl) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col border-[12px] border-black">
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4">
          {!showStopped && (
            <>
              {!isMonitoring && (
                <section className="pt-20 pb-16 text-center animate-fade-in-up">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5 leading-[1.05]">
                    Monitor Any Website
                    <br />
                    <span className="text-chart-1">In Real-Time</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-20">
                    Professional website monitoring with live metrics, performance analysis, SSL
                    validation, and SEO insights. Updated every 5 seconds.
                  </p>
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
                </section>
              )}

              {isMonitoring && (
                <section className="max-w-4xl mx-auto py-10">
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
                </section>
              )}

              {error && (
                <div className="mt-4 text-center">
                  <p className="text-status-down">{error}</p>
                </div>
              )}
            </>
          )}

          {showStopped && (
            <div className="text-center space-y-6 py-16 animate-fade-in max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10">
                  <CheckCircle2 className="h-8 w-8 text-chart-2" />
                </div>
                <h1 className="text-2xl font-bold">Monitoring Stopped</h1>
                <p className="text-muted-foreground max-w-md">
                  You've stopped monitoring{' '}
                  <span className="font-medium text-foreground">
                    {(() => {
                      try {
                        return new URL(currentUrl).hostname;
                      } catch {
                        return currentUrl || 'the website';
                      }
                    })()}
                  </span>
                  . You can start monitoring another website or return to the home page.
                </p>
                <Button onClick={handleReturnHome} size="lg" className="h-12 px-8 gap-2 mt-2">
                  <Home className="h-5 w-5" />
                  Return to Home
                </Button>
              </div>
            </div>
          )}

          {isMonitoring && (
            <div className="max-w-4xl mx-auto animate-fade-in-up pb-12">
              <Dashboard data={metrics} />
            </div>
          )}

          {!isMonitoring && !showStopped && (
            <section className="pb-20">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featureCards.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-lg border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-chart-1">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="mb-4 text-base font-semibold text-foreground">{feature.title}</h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {!isMonitoring && !showStopped && (
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <p>WebMetricsX — Enterprise-Grade Website Monitoring & SEO Analytics</p>
            <div className="flex items-center gap-4 font-semibold">
              <a href="https://github.com/KrrishSR4" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">By Krish Mishra</a>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">View Repository</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Monitor;
