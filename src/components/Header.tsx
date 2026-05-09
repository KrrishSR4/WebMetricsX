import { Activity, BarChart3, Github, Home, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b border-black/10 bg-card">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-1 text-white">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">WebMetricsX</h1>
                <p className="text-xs text-muted-foreground">Real-time Website Monitoring</p>
              </div>
            </Link>
            
            <Link to="/" className="hidden md:flex items-center gap-2 rounded-full border border-black bg-background px-4 py-1.5 text-sm font-semibold transition-all hover:bg-secondary">
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
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
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-secondary hover:shadow-sm">
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
          
          <Link to="/" className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-black bg-background transition-all hover:bg-secondary">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
