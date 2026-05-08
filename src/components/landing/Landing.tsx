import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Globe,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LandingProps {
  onLaunch: () => void;
}

const features = [
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    desc: 'Live polling every 5 seconds. Track uptime, response times and HTTP status as it happens.',
  },
  {
    icon: Zap,
    title: 'Performance Metrics',
    desc: 'Core Web Vitals, TTFB, DNS lookup and TCP connect — measured on real network probes.',
  },
  {
    icon: Shield,
    title: 'Reliability Insights',
    desc: 'Detect degradations early with status history and per-site downtime alerts.',
  },
  {
    icon: BarChart3,
    title: 'Visual Analytics',
    desc: 'Clean charts for response trends, performance breakdowns and metric comparisons.',
  },
  {
    icon: Search,
    title: 'SEO Analysis',
    desc: 'Title tags, meta descriptions, Open Graph, schema and heading structure scoring.',
  },
  {
    icon: Globe,
    title: 'Mobile Ready',
    desc: 'Fully responsive — monitor from desktop, tablet or phone without losing detail.',
  },
];

const steps = [
  { icon: Globe, title: 'Enter a URL', desc: 'Paste any website you want to monitor.' },
  { icon: Activity, title: 'See live metrics', desc: 'Performance, uptime and SEO update every 5 seconds.' },
  { icon: FileText, title: 'Export a report', desc: 'Download a polished two-page PDF report instantly.' },
];

export function Landing({ onLaunch }: LandingProps) {
  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 -z-10 opacity-[0.4]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%)',
          }}
        />
        <div className="container mx-auto px-4 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-6">
                <Sparkles className="h-3.5 w-3.5 text-chart-1" />
                Real-time website intelligence
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                Monitor any website
                <br />
                <span className="text-muted-foreground">in real time.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                WebMetricsX gives you live uptime, performance and SEO insights for any URL —
                with clean visuals and a one-click PDF report.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={onLaunch} className="h-12 px-6 gap-2">
                  Start Monitoring
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn more
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
              <div className="relative rounded-xl border border-border bg-card shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-up" />
                    <span className="text-sm font-medium">webmetricsx.app</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Response', value: '142ms', color: 'text-chart-1' },
                    { label: 'Uptime', value: '99.98%', color: 'text-chart-2' },
                    { label: 'SEO', value: '92', color: 'text-chart-3' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-border bg-background p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                      <div className={`mt-1 text-lg font-semibold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Response time (last 60s)</span>
                    <span className="text-xs text-chart-2">▲ stable</span>
                  </div>
                  <svg viewBox="0 0 320 90" className="w-full h-24">
                    <defs>
                      <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,60 L30,52 L60,58 L90,40 L120,46 L150,30 L180,38 L210,22 L240,34 L270,26 L300,32 L320,24"
                      fill="none"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth="2"
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
                  <span>HTTP 200 · TTFB 68ms</span>
                  <span>Updated just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything you need to monitor a site</h2>
            <p className="mt-3 text-muted-foreground">
              Performance, reliability and SEO — measured continuously and presented clearly.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-lg border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary mb-4">
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
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-muted-foreground">From URL to report in under a minute.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative p-6 rounded-lg border border-border bg-card">
                <div className="absolute -top-3 -left-3 h-7 w-7 rounded-full bg-foreground text-background text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </div>
                <s.icon className="h-5 w-5 text-chart-1 mb-3" />
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container mx-auto px-4 py-20">
          <div className="rounded-2xl border border-border bg-card p-10 lg:p-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready to monitor your site?</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Paste a URL, get live metrics in seconds, and download a polished PDF report.
            </p>
            <Button size="lg" onClick={onLaunch} className="mt-7 h-12 px-7 gap-2">
              Start Monitoring
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
