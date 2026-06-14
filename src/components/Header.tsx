import { Activity, BarChart3, Github, Home, Zap, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="border-b border-black/10 bg-card">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex flex-col items-start text-left transition-opacity hover:opacity-90">
              <span className="text-2xl font-black tracking-tight text-foreground">WebMetricsX</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-chart-1">Real-time Website Monitoring</span>
            </Link>
            
            <Link to="/" className="hidden md:flex items-center gap-2 rounded-full border border-black bg-background px-4 py-1.5 text-sm font-semibold transition-all hover:bg-black hover:text-white">
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
            <a href="#downtime-alerts" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
            </a>
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-black hover:text-white hover:shadow-sm">
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
          
          <Link to="/" className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-black bg-background transition-all hover:bg-black hover:text-white">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
