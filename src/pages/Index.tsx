import { useEffect, useRef, useState } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';
import { useUrlHistory } from '@/hooks/useUrlHistory';
import { useNotifications } from '@/hooks/useNotifications';
import { UrlInput } from '@/components/UrlInput';
import { Dashboard } from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { Home, CheckCircle2 } from 'lucide-react';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentUrl = metrics.website.url;
  const notificationsEnabled = currentUrl ? isNotificationEnabledForUrl(currentUrl) : false;

  const handleLaunchMonitor = () => {
    setShowStopped(false);
    requestAnimationFrame(() => {
      monitorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Marketing landing rendered inline; scroll past it to reach the monitor */}
      {!isMonitoring && !showStopped && (
        <Landing onLaunch={handleLaunchMonitor} />
      )}

      {/* Monitor / dashboard surface */}
      <section
        ref={monitorRef}
        className={`bg-background ${!isMonitoring && !showStopped ? 'min-h-screen flex items-center border-t border-border' : ''}`}
      >
        <div className="container mx-auto px-4 py-12 w-full">
          <div className="max-w-4xl mx-auto">
            {!showStopped && (
              <>
                {!isMonitoring && (
                  <div className="text-center mb-10 animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-status-up opacity-60 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-up" />
                      </span>
                      Start a new session
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 leading-[1.05]">
                      Monitor any website
                      <br />
                      <span className="text-chart-1">in real time.</span>
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
                      Paste a URL below to begin live monitoring. Metrics update every 5 seconds.
                    </p>
                  </div>
                )}

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
                  <div className="mt-4 text-center">
                    <p className="text-status-down">{error}</p>
                  </div>
                )}

              </>
            )}

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

            {isMonitoring && (
              <div className="animate-fade-in-up">
                <Dashboard data={metrics} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
