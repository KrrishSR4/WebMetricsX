import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number | null;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const getScoreColor = (score: number | null): string => {
  if (score === null) return 'text-muted-foreground';
  if (score >= 90) return 'text-status-up';
  if (score >= 50) return 'text-status-degraded';
  return 'text-status-down';
};

const sizeConfig = {
  sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
  md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm' },
  lg: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-base' },
};

export function ScoreGauge({ score, label, size = 'md' }: ScoreGaugeProps) {
  const displayScore = score ?? 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative', config.container)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={score === null ? circumference : strokeDashoffset}
            className={cn('transition-all duration-500', getScoreColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', config.text, getScoreColor(score))}>
            {score === null ? '—' : score}
          </span>
        </div>
      </div>
      <span className={cn('text-muted-foreground font-medium', config.label)}>{label}</span>
    </div>
  );
}
