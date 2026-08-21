import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'good' | 'warning' | 'error' | 'neutral';
  description?: string;
  children?: ReactNode;
  className?: string;
}

const statusColors = {
  good: 'border-l-status-up',
  warning: 'border-l-status-degraded',
  error: 'border-l-status-down',
  neutral: 'border-l-muted-foreground',
};

export function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  status = 'neutral',
  description,
  children,
  className,
}: MetricCardProps) {
  const displayValue = value === null || value === undefined ? '—' : value;

  return (
    <Card
      className={cn(
        'metric-card-hover border-2 border-black border-l-4 shadow-metric hover:shadow-metric-hover',
        statusColors[status],
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              <span className="text-sm font-medium text-muted-foreground truncate">{title}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight number-animate">
                {displayValue}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {description && (
              <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
            )}
            {trend && trendValue && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up' && 'text-status-up',
                    trend === 'down' && 'text-status-down',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </span>
              </div>
            )}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
