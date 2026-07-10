import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SSLCertificateCardProps {
  data: {
    valid: boolean;
    expiryDate: string | null;
    daysUntilExpiry: number | null;
    issuer: string | null;
  } | null;
}

export function SSLCertificateCard({ data }: SSLCertificateCardProps) {
  if (!data) {
    return (
      <Card className="chart-animate border-l-4 border-l-muted-foreground">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">SSL Certificate</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No SSL data available</p>
        </CardContent>
      </Card>
    );
  }

  const isExpiringSoon = data.daysUntilExpiry !== null && data.daysUntilExpiry < 30;
  const isExpired = data.daysUntilExpiry !== null && data.daysUntilExpiry <= 0;

  const getStatus = () => {
    if (!data.valid || isExpired) return 'error';
    if (isExpiringSoon) return 'warning';
    return 'good';
  };

  const status = getStatus();
  const borderColor = {
    good: 'border-l-status-up',
    warning: 'border-l-status-degraded',
    error: 'border-l-status-down',
  };

  return (
    <Card className={cn('chart-animate border-l-4', borderColor[status])}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={cn('h-5 w-5', status === 'good' ? 'text-status-up' : status === 'warning' ? 'text-status-degraded' : 'text-status-down')} />
            <CardTitle className="text-base font-medium">SSL Certificate</CardTitle>
          </div>
          {data.valid ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-up bg-status-up/10 px-2 py-1 rounded-full">
              <Check className="h-3 w-3" /> Valid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-down bg-status-down/10 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" /> Invalid
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Expires</span>
          <span className={cn('text-sm font-medium', isExpiringSoon && 'text-status-degraded', isExpired && 'text-status-down')}>
            {data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Days Until Expiry</span>
          <span className={cn('text-sm font-medium', isExpiringSoon && 'text-status-degraded', isExpired && 'text-status-down')}>
            {data.daysUntilExpiry !== null ? (isExpired ? 'Expired' : `${data.daysUntilExpiry} days`) : 'Unknown'}
          </span>
        </div>
        {data.issuer && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Issuer</span>
            <span className="text-sm font-medium truncate max-w-[150px]">{data.issuer}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
