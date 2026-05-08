import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileText,
  Gauge,
  Globe,
  LineChart,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LandingProps {
  onLaunch: () => void;
}

const features = [
  { icon: Activity, title: 'Real-Time Monitoring', desc: 'Live polling every 5 seconds. Track uptime, response times and HTTP status as it happens.' },
  { icon: Zap, title: 'Performance Metrics', desc: 'Core Web Vitals, TTFB, DNS lookup and TCP connect — measured on real network probes.' },
  { icon: Shield, title: 'Reliability Insights', desc: 'Detect degradations early with status history and per-site downtime alerts.' },
  { icon: BarChart3, title: 'Visual Analytics', desc: 'Clean charts for response trends, performance breakdowns and metric comparisons.' },
  { icon: Search, title: 'SEO Analysis', desc: 'Title tags, meta descriptions, Open Graph, schema and heading structure scoring.' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Per-website browser notifications when uptime drops or status changes occur.' },
  { icon: Gauge, title: 'Core Web Vitals', desc: 'LCP, FID, CLS and INP — measured continuously and visualized clearly.' },
  { icon: FileText, title: 'PDF Reports', desc: 'One-click polished two-page report with charts, scores and recommendations.' },
  { icon: Globe, title: 'Mobile Ready', desc: 'Fully responsive — monitor from desktop, tablet or phone without losing detail.' },
];

const steps = [
  { icon: Globe, title: 'Enter a URL', desc: 'Paste any website you want to monitor. No signup required.' },
  { icon: Activity, title: 'See live metrics', desc: 'Performance, uptime and SEO scores update every 5 seconds.' },
  { icon: FileText, title: 'Export a report', desc: 'Download a polished two-page PDF report instantly.' },
];

const stats = [
  { value: '5s', label: 'Live polling interval' },
  { value: '50+', label: 'Metrics tracked' },
  { value: '24/7', label: 'Uptime monitoring' },
  { value: '0', label: 'Setup required' },
];

export function Landing({ onLaunch }: LandingProps) {
  return (
    <div className="bg-background text-foreground">
      {/* Hero — full viewport */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 35%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 35%, transparent 100%)',
          }}
        />
        {/* soft accent blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-chart-1/10 blur-3xl -z-10" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-chart-4/10 blur-3xl -z-10" />

        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-6 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-chart-1" />
                Real-time website intelligence
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.02]">
                Monitor any website
                <br />
                in <span className="text-chart-1">real time.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                WebMetricsX gives you live uptime, performance, SEO and Core Web Vitals
                for any URL — with clean visuals and a one-click PDF report.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={onLaunch} className="h-12 px-6 gap-2 shadow-sm">
                  Start Monitoring
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore features
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-status-up opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-status-up" />
                  </span>
                  Live · 5s polling
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-chart-2" /> No signup required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-chart-1" /> Instant PDF export
                </span>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="relative rounded-2xl border border-border bg-card shadow-xl shadow-foreground/[0.04] p-5">
                {/* window chrome */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-down/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-degraded/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-up/70" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" /> webmetricsx.app
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-status-up">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-up animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Response', value: '142ms', color: 'text-chart-1', icon: Zap },
                    { label: 'Uptime', value: '99.98%', color: 'text-chart-2', icon: Activity },
                    { label: 'SEO', value: '92', color: 'text-chart-3', icon: Search },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase tracking-wide">{m.label}</span>
                        <m.icon className="h-3 w-3" />
                      </div>
                      <div className={`mt-1 text-xl font-semibold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Response time (last 60s)</span>
                    <span className="text-xs text-chart-2 inline-flex items-center gap-1">
                      <LineChart className="h-3 w-3" /> stable
                    </span>
                  </div>
                  <svg viewBox="0 0 320 90" className="w-full h-24">
                    <defs>
                      <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[20, 40, 60, 80].map((y) => (
                      <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="2 4" />
                    ))}
                    <path
                      d="M0,60 L30,52 L60,58 L90,40 L120,46 L150,30 L180,38 L210,22 L240,34 L270,26 L300,32 L320,24"
                      fill="none"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0,60 L30,52 L60,58 L90,40 L120,46 L150,30 L180,38 L210,22 L240,34 L270,26 L300,32 L320,24 L320,90 L0,90 Z"
                      fill="url(#chart-fill)"
                    />
                  </svg>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-up" /> HTTP 200 · TTFB 68ms
                  </span>
                  <span>Updated just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <button
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 inline-flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll down"
        >
          Scroll
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mb-14 mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-4">
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Everything you need to monitor a site
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Performance, reliability and SEO — measured continuously and presented clearly.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-lg hover:shadow-foreground/[0.03] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-secondary mb-4 group-hover:bg-chart-1/10 transition-colors">
                  <f.icon className="h-5 w-5 text-chart-1" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-secondary/30">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-2xl mb-14 mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-4">
              Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">How it works</h2>
            <p className="mt-4 text-muted-foreground text-lg">From URL to report in under a minute.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3 relative">
            {steps.map((s, i) => (
              <div key={s.title} className="relative p-7 rounded-xl border border-border bg-card hover:shadow-md transition-all">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-foreground text-background text-sm font-semibold flex items-center justify-center shadow-sm">
                  {i + 1}
                </div>
                <s.icon className="h-6 w-6 text-chart-1 mb-3" />
                <h3 className="font-semibold mb-1.5 text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container mx-auto px-4 py-24">
          <div className="relative rounded-3xl border border-border bg-card p-10 lg:p-16 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.4] -z-0"
              style={{
                backgroundImage:
                  'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, #000 30%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, #000 30%, transparent 100%)',
              }}
            />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Ready to monitor your site?</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
                Paste a URL, get live metrics in seconds, and download a polished PDF report.
              </p>
              <Button size="lg" onClick={onLaunch} className="mt-8 h-12 px-8 gap-2 shadow-sm">
                Start Monitoring
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
