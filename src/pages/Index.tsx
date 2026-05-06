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
    setTimeout(scrollToMonitor, 100);
  };

  const handleStart = (url: string) => {
    setShowStopped(false);
    startMonitoring(url);
    setTimeout(scrollToMonitor, 100);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Marketing landing only when not actively monitoring */}
      {!isMonitoring && !showStopped && <Landing onLaunch={scrollToMonitor} />}

      {/* Monitor / dashboard surface */}
      <section
        ref={monitorRef}
        className={
          isMonitoring || showStopped
            ? 'min-h-screen bg-background'
            : 'bg-background border-t border-border'
        }
      >
        <div className="container py-16 space-y-8">
          {!showStopped && (
            <>
              {!isMonitoring && (
                <div className="max-w-2xl mx-auto text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Start monitoring in seconds</h2>
                  <p className="text-muted-foreground mt-3">Enter any URL below — we'll begin live checks every 5 seconds.</p>
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
              {error && <p className="text-center text-status-down text-sm mt-3">{error}</p>}
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
            <div className="animate-fade-in-up">
              <Dashboard data={metrics} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
