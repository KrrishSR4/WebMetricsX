import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreGauge } from './ScoreGauge';
import { Gauge, Smartphone, Monitor, Accessibility, CheckCircle } from 'lucide-react';

interface CoreWebVitalsProps {
  coreWebVitals: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
  } | null;
  mobileScore: number | null;
  desktopScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
}

function VitalMetric({ label, value, unit, threshold }: { label: string; value: number | null; unit: string; threshold: { good: number; poor: number } }) {
  const getColor = () => {
    if (value === null) return 'text-muted-foreground';
    if (label === 'CLS') {
      // CLS is reversed - lower is better
      if (value <= threshold.good) return 'text-status-up';
      if (value <= threshold.poor) return 'text-status-degraded';
      return 'text-status-down';
    }
    // For LCP and FID, lower is better
    if (value <= threshold.good) return 'text-status-up';
    if (value <= threshold.poor) return 'text-status-degraded';
    return 'text-status-down';
  };

  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${getColor()}`}>
        {value !== null ? value.toFixed(label === 'CLS' ? 3 : 0) : '—'}
      </p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </div>
  );
}

export function CoreWebVitals({ coreWebVitals, mobileScore, desktopScore, accessibilityScore, bestPracticesScore }: CoreWebVitalsProps) {
  return (
    <div className="space-y-4">
      {/* Core Web Vitals */}
      <Card className="chart-animate">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-chart-1" />
            <CardTitle className="text-base font-medium">Core Web Vitals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <VitalMetric
              label="LCP"
              value={coreWebVitals?.lcp ?? null}
              unit="ms"
              threshold={{ good: 2500, poor: 4000 }}
            />
            <VitalMetric
              label="FID"
              value={coreWebVitals?.fid ?? null}
              unit="ms"
              threshold={{ good: 100, poor: 300 }}
            />
            <VitalMetric
              label="CLS"
              value={coreWebVitals?.cls ?? null}
              unit=""
              threshold={{ good: 0.1, poor: 0.25 }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="text-center">Largest Contentful Paint</div>
            <div className="text-center">First Input Delay</div>
            <div className="text-center">Cumulative Layout Shift</div>
          </div>
        </CardContent>
      </Card>

      {/* Lighthouse Scores */}
      <Card className="chart-animate">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Lighthouse Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={mobileScore} label="Mobile" size="sm" />
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={desktopScore} label="Desktop" size="sm" />
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={accessibilityScore} label="Accessibility" size="sm" />
              <Accessibility className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={bestPracticesScore} label="Best Practices" size="sm" />
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
