import { Activity, BarChart3, Github, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-1 text-white">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WebMetricsX</h1>
              <p className="text-xs text-muted-foreground">Real-time Website Monitoring</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>SEO Insights</span>
            </div>
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="flex items-center gap-2 transition-colors hover:text-foreground">
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
