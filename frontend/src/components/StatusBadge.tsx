import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'up' | 'down' | 'degraded' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const statusConfig = {
  up: {
    label: 'Operational',
    className: 'bg-status-up text-status-up-foreground',
    dotClass: 'bg-status-up',
  },
  down: {
    label: 'Down',
    className: 'bg-status-down text-status-down-foreground',
    dotClass: 'bg-status-down',
  },
  degraded: {
    label: 'Degraded',
    className: 'bg-status-degraded text-status-degraded-foreground',
    dotClass: 'bg-status-degraded',
  },
  pending: {
    label: 'Pending',
    className: 'bg-status-pending text-status-pending-foreground',
    dotClass: 'bg-status-pending',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-medium',
        config.className,
        sizeConfig[size]
      )}
    >
      {showDot && (
        <span className={cn('h-2 w-2 rounded-full', config.dotClass, status === 'up' && 'animate-pulse')} />
      )}
      {config.label}
    </span>
  );
}
