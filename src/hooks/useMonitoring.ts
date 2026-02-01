import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MonitoringResult, WebsiteMetrics, SEOMetrics } from '@/types/metrics';

const POLLING_INTERVAL = 5000; // 5 seconds

const initialWebsiteMetrics: WebsiteMetrics = {
  url: '',
  timestamp: new Date().toISOString(),
  status: 'pending',
  httpStatusCode: null,
  responseTime: null,
  averageResponseTime: null,
  ttfb: null,
  dnsLookupTime: null,
  tcpConnectTime: null,
  tlsHandshakeTime: null,
  sslCertificate: null,
  performanceScore: null,
  uptime24h: null,
  errorRate: null,
  coreWebVitals: null,
  mobileScore: null,
  desktopScore: null,
  accessibilityScore: null,
  bestPracticesScore: null,
  responseTimeHistory: [],
  performanceBreakdown: null,
};

const initialSEOMetrics: SEOMetrics = {
  score: null,
  titleTag: { present: false, length: null, content: null },
  metaDescription: { present: false, length: null, content: null },
  headings: { h1Count: 0, h2Count: 0, hasProperStructure: false },
  images: { total: 0, withAlt: 0, missingAlt: 0 },
  canonicalTag: false,
  robotsTxt: false,
  sitemap: false,
  mobileFriendly: false,
  indexable: false,
  openGraph: { hasTitle: false, hasDescription: false, hasImage: false },
  twitterCard: { present: false, type: null },
  structuredData: false,
  language: null,
  favicon: false,
  compression: false,
  issues: [],
  recommendations: [],
  enhancedIssues: [],
};

export function useMonitoring() {
  const [url, setUrl] = useState<string>('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MonitoringResult>({
    website: initialWebsiteMetrics,
    seo: initialSEOMetrics,
    lastChecked: '',
    isMonitoring: false,
  });
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const responseHistoryRef = useRef<Array<{ timestamp: string; value: number }>>([]);
  const uptimeCheckRef = useRef<{ total: number; successful: number }>({ total: 0, successful: 0 });

  const fetchMetrics = useCallback(async (targetUrl: string) => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('monitor-website', {
        body: { url: targetUrl },
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        // Update response history
        if (data.website?.responseTime !== null) {
          responseHistoryRef.current = [
            ...responseHistoryRef.current.slice(-59),
            { timestamp: new Date().toISOString(), value: data.website.responseTime },
          ];
        }

        // Update uptime tracking
        uptimeCheckRef.current.total += 1;
        if (data.website?.status === 'up') {
          uptimeCheckRef.current.successful += 1;
        }
        const uptime24h = uptimeCheckRef.current.total > 0
          ? Math.round((uptimeCheckRef.current.successful / uptimeCheckRef.current.total) * 100 * 10) / 10
          : null;

        // Calculate average response time
        const avgResponseTime = responseHistoryRef.current.length > 0
          ? Math.round(responseHistoryRef.current.reduce((sum, item) => sum + item.value, 0) / responseHistoryRef.current.length)
          : null;

        setMetrics({
          website: {
            ...data.website,
            responseTimeHistory: responseHistoryRef.current,
            averageResponseTime: avgResponseTime,
            uptime24h,
          },
          seo: data.seo,
          lastChecked: new Date().toISOString(),
          isMonitoring: true,
        });
        setError(null);
      }
    } catch (err) {
      console.error('Monitoring error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  }, []);

  const startMonitoring = useCallback(async (targetUrl: string) => {
    // Validate and normalize URL
    let normalizedUrl = targetUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setUrl(normalizedUrl);
    setIsLoading(true);
    setIsMonitoring(true);
    setError(null);
    responseHistoryRef.current = [];
    uptimeCheckRef.current = { total: 0, successful: 0 };

    // Initial fetch
    await fetchMetrics(normalizedUrl);
    setIsLoading(false);

    // Start polling
    pollingRef.current = setInterval(() => {
      fetchMetrics(normalizedUrl);
    }, POLLING_INTERVAL);
  }, [fetchMetrics]);

  const stopMonitoring = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsMonitoring(false);
    setMetrics(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    url,
    isMonitoring,
    isLoading,
    error,
    metrics,
    startMonitoring,
    stopMonitoring,
  };
}
