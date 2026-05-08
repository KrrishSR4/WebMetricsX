import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Globe,
  LineChart,
  Lock,
  MousePointerClick,
  Search,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface LandingProps {
  onLaunch: () => void;
}

const productName = 'WebMetricsX';
const productTagline = 'Enterprise-Grade Website Monitoring & SEO Analytics';

const features = [
  { icon: Activity, title: 'Website Status', desc: 'Instantly see whether a website is up, down, or degraded.' },
  { icon: Server, title: 'HTTP Status Codes', desc: 'Track live HTTP response codes for each monitoring check.' },
  { icon: Zap, title: 'Current Response Time', desc: 'Measure the latest response time in milliseconds.' },
  { icon: Gauge, title: 'Average Response Time', desc: 'Understand response consistency across recent checks.' },
  { icon: Clock3, title: 'Time To First Byte', desc: 'Monitor TTFB to catch backend and server delay early.' },
  { icon: Globe, title: 'DNS Lookup Time', desc: 'See how long domain resolution takes before connection.' },
  { icon: Server, title: 'TCP Connect Time', desc: 'Track network connection setup time for each request.' },
  { icon: Lock, title: 'TLS Handshake Time', desc: 'Measure secure connection negotiation latency.' },
  { icon: Shield, title: 'SSL Validity & Expiry', desc: 'Check certificate validity, issuer details, and expiry dates.' },
  { icon: TrendingUp, title: 'Page Load Score', desc: 'Review a clear performance score for page loading quality.' },
  { icon: CheckCircle2, title: '24-Hour Uptime', desc: 'Track uptime percentage over the last 24 hours.' },
  { icon: LineChart, title: 'Response Timeline', desc: 'Visualize response time history across monitoring checks.' },
  { icon: Bell, title: 'Error Rate Detection', desc: 'Spot repeated failed responses and reliability issues.' },
  { icon: Activity, title: 'Latency Spike Detection', desc: 'Detect sudden response-time jumps before they become outages.' },
  { icon: BarChart3, title: 'Performance Breakdown', desc: 'Break down DNS, connect, TTFB, and download timing.' },
  { icon: Gauge, title: 'Core Web Vitals', desc: 'Track LCP, FID, and CLS for user experience quality.' },
  { icon: Globe, title: 'Mobile Performance', desc: 'Review mobile-focused performance scoring and signals.' },
  { icon: Server, title: 'Desktop Performance', desc: 'Measure desktop performance score for larger screens.' },
  { icon: CheckCircle2, title: 'Accessibility Score', desc: 'Audit accessibility quality with an easy-to-read score.' },
  { icon: Shield, title: 'Best Practices Score', desc: 'Check security, browser, and implementation best practices.' },
  { icon: Clock3, title: 'Last Checked Timestamp', desc: 'Know exactly when the latest monitoring result was captured.' },
];

const steps = [
  { icon: Globe, title: 'Paste the website', desc: 'Start with any public URL and keep recent checks close for repeat analysis.' },
  { icon: Gauge, title: 'Read the signal', desc: 'See live status, response trends, SSL, SEO and Core Web Vitals without tab-hopping.' },
  { icon: FileText, title: 'Share the report', desc: 'Turn the current result into a clean PDF for clients, teams or incident notes.' },
];

const stats = [
  { value: '5s', label: 'Live polling interval' },
  { value: '50+', label: 'Metrics tracked' },
  { value: 'PDF', label: 'Instant reports' },
  { value: '0', label: 'Setup friction' },
];

const useCases = [
  { icon: Server, title: 'Launch checks', desc: 'Verify uptime, SSL and SEO basics before shipping a new page.' },
  { icon: Clock3, title: 'Client reporting', desc: 'Convert live monitoring sessions into readable performance summaries.' },
  { icon: TrendingUp, title: 'Optimization work', desc: 'Compare response trends and identify slow network phases quickly.' },
];

export function Landing({ onLaunch }: LandingProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="#hero" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
              <img src="/favicon.png" alt="WebMetricsX" className="h-9 w-9 rounded-xl" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none tracking-tight">{productName}</div>
              <div className="mt-1 hidden text-xs font-semibold text-muted-foreground sm:block">{productTagline}</div>
            </div>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#workflow" className="transition-colors hover:text-foreground">Workflow</a>
            <a href="#reports" className="transition-colors hover:text-foreground">Reports</a>
          </nav>
          <Button onClick={onLaunch} size="sm" className="gap-2">
            Open Monitor
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <section id="hero" className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 opacity-60" style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(#000, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(#000, transparent 85%)',
        }} />
        <img
          src="/favicon.png"
          alt=""
          className="pointer-events-none absolute -right-16 top-12 -z-10 h-56 w-56 rounded-[2rem] opacity-[0.035] blur-[1px] sm:h-72 sm:w-72 lg:right-10 lg:top-20"
        />

        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-border bg-card py-1 pl-1 pr-4 text-xs font-semibold text-muted-foreground shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <img src="/favicon.png" alt="" className="h-6 w-6 rounded-md" />
                </span>
                Built for fast audits, uptime checks and client-ready reports
              </div>
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="inline-flex items-center gap-3">
                  {productName}
                  <Sparkles className="hidden h-8 w-8 text-chart-1 sm:inline-block" />
                </span>
                <br />
                turns any URL into
                <br />
                <span className="text-chart-1">live website intelligence.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Monitor uptime, response speed, SSL health, SEO readiness and Core Web Vitals from one
                enterprise-grade monitoring dashboard. Move from quick check to shareable PDF report in minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={onLaunch} className="h-12 gap-2 px-6 shadow-sm">
                  Start Monitoring Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                  Explore features
                </Button>
              </div>
              <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
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
                  <Lock className="h-4 w-4 text-chart-1" /> SSL aware
                </span>
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="relative overflow-hidden rounded-xl border border-foreground/35 bg-card p-4 shadow-xl shadow-foreground/[0.05] transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-4 flex items-center justify-between border-b border-foreground/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-status-down/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-degraded/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-status-up/70" />
                  </div>
                  <a
                    href="https://webmetricsx.web.app"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2 rounded-md bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Globe className="h-3 w-3" />
                    webmetricsx.web.app
                    <MousePointerClick className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                  <span className="inline-flex items-center gap-1.5 text-xs text-status-up">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-up animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Response', value: '142ms', color: 'text-chart-1', icon: Zap },
                    { label: 'Uptime', value: '99.98%', color: 'text-chart-2', icon: Activity },
                    { label: 'SEO', value: '92', color: 'text-chart-3', icon: Search },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-foreground/20 bg-background p-3">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase tracking-wide">{m.label}</span>
                        <m.icon className="h-3 w-3" />
                      </div>
                      <div className={`mt-1 text-xl font-semibold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-foreground/20 bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Response time (last 60s)</span>
                    <span className="inline-flex items-center gap-1 text-xs text-chart-2">
                      <LineChart className="h-3 w-3" /> stable
                    </span>
                  </div>
                  <div className="flex h-24 items-end gap-1">
                    {[35, 45, 30, 55, 40, 60, 35, 50, 25, 45, 30, 55, 40, 50, 35, 45].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-chart-1/80 transition-all duration-300 hover:bg-chart-1" style={{ height: `${h}%`, animationDelay: `${i * 45}ms` }} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-foreground/20 bg-background p-3">
                    <div className="mb-1 text-xs text-muted-foreground">SSL certificate</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-status-up">
                      <Shield className="h-4 w-4" /> Valid certificate
                    </div>
                  </div>
                  <div className="rounded-lg border border-foreground/20 bg-background p-3">
                    <div className="mb-1 text-xs text-muted-foreground">Report status</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-chart-1">
                      <FileText className="h-4 w-4" /> PDF ready
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-status-up" /> HTTP 200 · TTFB 68ms</span>
                  <span>Updated just now</span>
                </div>
                <div className="mt-4 grid gap-3 border-t border-foreground/15 pt-4 sm:grid-cols-3">
                  {[
                    { label: 'DNS', value: '18ms' },
                    { label: 'TCP', value: '24ms' },
                    { label: 'LCP', value: '1.8s' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-secondary/70 px-3 py-2">
                      <div className="text-[11px] font-medium text-muted-foreground">{item.label}</div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 text-center text-sm font-semibold text-muted-foreground">
            {productName} — {productTagline}
          </div>
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

      <section id="features" className="border-b border-border">
        <div className="container relative mx-auto px-4 py-16">
          <img
            src="/favicon.png"
            alt=""
            className="pointer-events-none absolute left-0 top-12 -z-10 h-44 w-44 rounded-[2rem] opacity-[0.025] lg:left-10"
          />
          <img
            src="/favicon.png"
            alt=""
            className="pointer-events-none absolute bottom-16 right-4 -z-10 h-56 w-56 rounded-[2rem] opacity-[0.025] lg:right-16"
          />
          <div className="max-w-2xl mb-10 mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
              Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A focused monitoring workspace for modern websites
            </h2>
            <p className="mt-4 text-muted-foreground">
              Reliability, diagnostics, search readiness, alerts and reporting in a single
              interface built for fast decisions.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-chart-1/30 hover:shadow-lg hover:shadow-foreground/[0.04]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-chart-1/10">
                  <f.icon className="h-5 w-5 text-chart-1" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-border bg-secondary/30">
        <div className="container relative mx-auto px-4 py-16">
          <div className="pointer-events-none absolute inset-x-4 top-10 -z-10 flex justify-between opacity-[0.035]">
            <img src="/favicon.png" alt="" className="h-28 w-28 rotate-[-8deg] rounded-[1.5rem]" />
            <img src="/favicon.png" alt="" className="hidden h-28 w-28 rotate-[8deg] rounded-[1.5rem] md:block" />
          </div>
          <div className="mb-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                Workflow
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From URL to decision in one flow</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {productName} keeps the path short: enter a site, inspect the live health profile,
              then share a clean report without stitching screenshots together.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background shadow-sm">
                  {i + 1}
                </div>
                <s.icon className="mb-3 h-6 w-6 text-chart-1" />
                <h3 className="mb-1.5 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reports" className="border-b border-border">
        <div className="container relative mx-auto px-4 py-16">
          <img
            src="/favicon.png"
            alt=""
            className="pointer-events-none absolute -right-4 top-1/2 -z-10 h-64 w-64 -translate-y-1/2 rounded-[2rem] opacity-[0.03]"
          />
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                Product use cases
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for teams that need quick signal</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Use {productName} for launch validation, client audits, production checks and recurring
                performance snapshots. It is lightweight enough for quick checks and detailed enough
                for real reporting.
              </p>
            </div>
            <div className="grid gap-4">
              {useCases.map((item) => (
                <div key={item.title} className="flex gap-4 rounded-lg border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-chart-1">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container mx-auto px-4 py-16">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 text-center shadow-xl shadow-foreground/[0.04] lg:p-12">
            <img
              src="/favicon.png"
              alt=""
              className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-[2rem] opacity-[0.04]"
            />
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-secondary shadow-sm">
              <img src="/favicon.png" alt="" className="h-14 w-14 rounded-2xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to monitor your site with {productName}?</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                {productTagline}. Open the monitor, paste a URL and get live uptime,
                performance, SEO and SSL insight in seconds.
              </p>
              <Button size="lg" onClick={onLaunch} className="mt-8 h-12 gap-2 px-8 shadow-sm">
                Start Monitoring
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
              <img src="/favicon.png" alt="" className="h-7 w-7 rounded-lg" />
            </div>
            <span className="text-base font-bold text-foreground">{productName}</span>
            <span>{productTagline}</span>
          </div>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#workflow" className="hover:text-foreground">Workflow</a>
            <button onClick={onLaunch} className="font-medium text-chart-1 hover:text-chart-1/80">Open Monitor</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
