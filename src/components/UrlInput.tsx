import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, StopCircle, Search, History, X, Clock, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff } from 'lucide-react';
import type { HistoryItem } from '@/hooks/useUrlHistory';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  onStop: () => void;
  isMonitoring: boolean;
  isLoading: boolean;
  history?: HistoryItem[];
  onSelectHistory?: (url: string) => void;
  onRemoveHistory?: (url: string) => void;
  onClearHistory?: () => void;
}

export function UrlInput({
  onSubmit,
  onStop,
  isMonitoring,
  isLoading,
  history = [],
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
}: UrlInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const { token, enableNotifications, isSupported } = useNotifications();

  // REPLACE THIS WITH ACTUAL VAPID KEY FROM USER
  const VAPID_KEY = "BBoovMWQMAx1yoUjgIr8ym1RyPJEBTdKNM5tkQj77chTcs6uKDJsz7SAaQRYorthEJHLmi26XRGqy5lf3Ung3Wc";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue);
    }
  };

  const handleSelectFromHistory = (url: string) => {
    setInputValue(url);
    setHistoryOpen(false);
    if (onSelectHistory) {
      onSelectHistory(url);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      case 'degraded': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Enter website URL (e.g., example.com)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-12 pr-12 h-14 text-base border-2 bg-card focus:border-chart-1 transition-colors"
              disabled={isMonitoring}
            />
            {/* History Button */}
            {!isMonitoring && history.length > 0 && (
              <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-sm font-medium">Recent URLs</span>
                    {onClearHistory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          onClearHistory();
                          setHistoryOpen(false);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.url}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer group"
                        onClick={() => handleSelectFromHistory(item.url)}
                      >
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)} bg-current`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{new URL(item.url).hostname}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(item.lastChecked)}
                            </span>
                            {item.responseTime && (
                              <span>{item.responseTime}ms</span>
                            )}
                          </div>
                        </div>
                        {onRemoveHistory && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveHistory(item.url);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {isMonitoring ? (
            <Button
              type="button"
              onClick={onStop}
              variant="destructive"
              size="lg"
              className="h-14 px-8 text-base font-medium"
            >
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Monitoring
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="h-14 px-8 text-base font-medium bg-chart-1 hover:bg-chart-1/90"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Start Monitoring
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Quick Help Text & Notifications */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs text-muted-foreground">
          {isMonitoring ? (
            <>
              📊 Monitoring active • Click <span className="font-medium text-destructive">Stop Monitoring</span> to analyze a different URL
            </>
          ) : (
            <>
              💡 Enter any URL to start • Metrics update every 5s • Click <History className="inline h-3 w-3" /> for recent URLs
            </>
          )}
        </p>

        {isSupported && (
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-2 ${token ? 'text-green-500' : 'text-muted-foreground'}`}
            onClick={() => enableNotifications(VAPID_KEY)}
          >
            {token ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            {token ? 'Notifications Enabled' : 'Enable Downtime Alerts'}
          </Button>
        )}
      </div>
    </div>
  );
}
