import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';
import { ResponseTimeChart } from './ResponseTimeChart';
import { PerformanceBreakdown } from './PerformanceBreakdown';
import { CoreWebVitals } from './CoreWebVitals';
import { SEOAnalysis } from './SEOAnalysis';
import { PDFExportButton } from './PDFExportButton';
import { PieChartCard } from './PieChartCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Clock,
  Server,
  Zap,
  Wifi,
  Shield,
  TrendingUp,
  AlertCircle,
  Globe,
  Timer,
  Network,
  Lock,
  Gauge,
  Search,
} from 'lucide-react';
import type { MonitoringResult } from '@/types/metrics';

interface DashboardProps {
  data: MonitoringResult;
}

export function Dashboard({ data }: DashboardProps) {
  const { website, seo } = data;

  const getResponseTimeStatus = (time: number | null): 'good' | 'warning' | 'error' | 'neutral' => {
    if (time === null) return 'neutral';
    if (time < 200) return 'good';
    if (time < 500) return 'warning';
    return 'error';
  };

  const getUptimeStatus = (uptime: number | null): 'good' | 'warning' | 'error' | 'neutral' => {
    if (uptime === null) return 'neutral';
    if (uptime >= 99.5) return 'good';
    if (uptime >= 95) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-chart-1" />
            <h2 className="text-xl font-semibold truncate max-w-md">{website.url}</h2>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <StatusBadge status={website.status} size="md" />
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last checked: {data.lastChecked ? new Date(data.lastChecked).toLocaleTimeString() : '—'}
            </span>
          </div>
        </div>
        <PDFExportButton
          data={data}
          url={website.url}
          disabled={!data.isMonitoring}
        />
      </div>

      <div className="space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">SEO</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="HTTP Status"
                value={website.httpStatusCode}
                icon={Server}
                status={website.httpStatusCode === 200 ? 'good' : website.httpStatusCode ? 'error' : 'neutral'}
              />
              <MetricCard
                title="Response Time"
                value={website.responseTime}
                unit="ms"
                icon={Zap}
                status={getResponseTimeStatus(website.responseTime)}
              />
              <MetricCard
                title="Average Response"
                value={website.averageResponseTime}
                unit="ms"
                icon={TrendingUp}
                status={getResponseTimeStatus(website.averageResponseTime)}
              />
              <MetricCard
                title="Uptime (Session)"
                value={website.uptime24h}
                unit="%"
                icon={Activity}
                status={getUptimeStatus(website.uptime24h)}
              />
            </div>

            {/* Timing Metrics */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="TTFB"
                value={website.ttfb}
                unit="ms"
                icon={Timer}
                description="Time to First Byte"
                status={website.ttfb ? (website.ttfb < 100 ? 'good' : website.ttfb < 300 ? 'warning' : 'error') : 'neutral'}
              />
              <MetricCard
                title="DNS Lookup"
                value={website.dnsLookupTime}
                unit="ms"
                icon={Globe}
                status={website.dnsLookupTime ? (website.dnsLookupTime < 50 ? 'good' : 'warning') : 'neutral'}
              />
              <MetricCard
                title="TCP Connect"
                value={website.tcpConnectTime}
                unit="ms"
                icon={Network}
                status={website.tcpConnectTime ? (website.tcpConnectTime < 100 ? 'good' : 'warning') : 'neutral'}
              />
              <MetricCard
                title="TLS Handshake"
                value={website.tlsHandshakeTime}
                unit="ms"
                icon={Lock}
                status={website.tlsHandshakeTime ? (website.tlsHandshakeTime < 100 ? 'good' : 'warning') : 'neutral'}
              />
            </div>

            {/* Response Time Chart */}
            <ResponseTimeChart data={website.responseTimeHistory} />

            {/* Performance Breakdown & Pie Chart */}
            <div className="grid gap-4 lg:grid-cols-2">
              <PerformanceBreakdown data={website.performanceBreakdown} />
              <PieChartCard data={website.performanceBreakdown} />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <CoreWebVitals
              coreWebVitals={website.coreWebVitals}
              mobileScore={website.mobileScore}
              desktopScore={website.desktopScore}
              accessibilityScore={website.accessibilityScore}
              bestPracticesScore={website.bestPracticesScore}
            />
          </TabsContent>

          <TabsContent value="seo" className="mt-6">
            <SEOAnalysis data={seo} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
