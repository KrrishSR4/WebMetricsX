import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  Globe,
  LineChart,
  Lock,
  MousePointerClick,
  RefreshCcw,
  Search,
  Server,
  Share2,
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
  const [workflowReplayKey, setWorkflowReplayKey] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased [text-rendering:optimizeLegibility]">
      <header className="sticky top-0 z-40 border-b border-foreground/25 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <a href="#hero" className="group flex items-center gap-3">
            <img src="/favicon.png" alt="WebMetricsX" className="h-12 w-12 object-contain" />
            <div>
              <div className="text-xl font-extrabold leading-none tracking-tight transition-colors group-hover:text-chart-1">{productName}</div>
              <div className="mt-1 hidden max-w-[360px] text-xs font-semibold leading-snug text-muted-foreground sm:block">{productTagline}</div>
            </div>
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#features" className="relative transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:text-foreground hover:after:w-full">Features</a>
            <a href="#workflow" className="relative transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:text-foreground hover:after:w-full">Workflow</a>
            <a href="#reports" className="relative transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:text-foreground hover:after:w-full">Reports</a>
          </nav>
          <Button onClick={onLaunch} size="sm" className="group gap-2 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            Open Monitor
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </header>

      <section id="hero" className="relative overflow-hidden border-b border-foreground/20">
        <div className="absolute inset-0 -z-10 opacity-60" style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(#000, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(#000, transparent 85%)',
        }} />
        <img
          src="/favicon.png"
          alt=""
          className="wmx-floaty pointer-events-none absolute -right-16 top-12 -z-10 h-56 w-56 rounded-[2rem] opacity-[0.035] blur-[1px] sm:h-72 sm:w-72 lg:right-10 lg:top-20"
        />

        <div className="container mx-auto px-4 py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-foreground/30 bg-card py-1.5 pl-2 pr-4 text-xs font-semibold text-muted-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/50 hover:shadow-md">
                <img src="/favicon.png" alt="" className="h-7 w-7 object-contain drop-shadow-sm" />
                Built for fast audits, uptime checks and client-ready reports
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-tight [text-wrap:balance] sm:text-5xl lg:text-7xl">
                <span className="inline-flex items-center gap-3">
                  {productName}
                  <Sparkles className="hidden h-8 w-8 animate-pulse text-chart-1 sm:inline-block" />
                </span>
                <br />
                turns any URL into
                <br />
                <span className="text-chart-1">live website insights.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-muted-foreground">
                Monitor uptime, response speed, SSL health, SEO readiness and Core Web Vitals from one
                enterprise-grade monitoring dashboard. Move from quick check to shareable PDF report in minutes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={onLaunch} className="group h-12 gap-2 px-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  Start Monitoring Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/50" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
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
              <div className="relative overflow-hidden rounded-xl border border-foreground/45 bg-card p-4 shadow-xl shadow-foreground/[0.05] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-foreground/[0.08]">
                <div className="mb-4 flex items-center justify-between border-b border-foreground/25 pb-3">
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
                    <div key={m.label} className="rounded-lg border border-foreground/35 bg-background p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/55">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-[11px] uppercase tracking-wide">{m.label}</span>
                        <m.icon className="h-3 w-3" />
                      </div>
                      <div className={`mt-1 text-xl font-semibold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-foreground/35 bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Response time (last 60s)</span>
                    <span className="inline-flex items-center gap-1 text-xs text-chart-2">
                      <LineChart className="h-3 w-3" /> stable
                    </span>
                  </div>
                  <div className="flex h-24 items-end gap-1">
                    {[35, 45, 30, 55, 40, 60, 35, 50, 25, 45, 30, 55, 40, 50, 35, 45].map((h, i) => (
                      <div key={i} className="animate-fade-in-up flex-1 rounded-sm bg-chart-1/80 transition-all duration-300 hover:bg-chart-1" style={{ height: `${h}%`, animationDelay: `${i * 45}ms` }} />
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-foreground/35 bg-background p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/55">
                    <div className="mb-1 text-xs text-muted-foreground">SSL certificate</div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-status-up">
                      <Shield className="h-4 w-4" /> Valid certificate
                    </div>
                  </div>
                  <div className="rounded-lg border border-foreground/35 bg-background p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/55">
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
                <div className="mt-4 grid gap-3 border-t border-foreground/25 pt-4 sm:grid-cols-3">
                  {[
                    { label: 'DNS', value: '18ms' },
                    { label: 'TCP', value: '24ms' },
                    { label: 'LCP', value: '1.8s' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-foreground/25 bg-secondary/70 px-3 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/45">
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

      <section className="border-b border-foreground/20 bg-secondary/40">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 text-center text-sm font-semibold text-muted-foreground">
            {productName} — {productTagline}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, index) => (
              <div
                key={s.label}
                className="animate-fade-in-up rounded-lg border border-foreground/20 bg-background/70 p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/45 hover:shadow-md"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{s.value}</div>
                <div className="mt-1 text-sm font-medium text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-foreground/20">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/30 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground mb-4">
              Features
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl">
              A focused monitoring workspace for modern websites
            </h2>
            <p className="mt-4 text-base font-medium leading-7 text-muted-foreground">
              Reliability, diagnostics, search readiness, alerts and reporting in a single
              interface built for fast decisions.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, index) => (
              <div
                key={f.title}
                className="group animate-fade-in-up rounded-lg border border-foreground/30 bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-foreground/55 hover:shadow-lg hover:shadow-foreground/[0.04]"
                style={{ animationDelay: `${(index % 6) * 55}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-chart-1/10">
                  <f.icon className="h-5 w-5 text-chart-1 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h3 className="mb-1.5 text-[15px] font-bold tracking-tight">{f.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-foreground/20 bg-secondary/30">
        <div className="container relative mx-auto px-4 py-16">
          <div className="pointer-events-none absolute inset-x-4 top-10 -z-10 flex justify-between opacity-[0.035]">
            <img src="/favicon.png" alt="" className="h-28 w-28 rotate-[-8deg] rounded-[1.5rem]" />
            <img src="/favicon.png" alt="" className="hidden h-28 w-28 rotate-[8deg] rounded-[1.5rem] md:block" />
          </div>
          <div className="mb-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/30 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                Workflow
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl">Watch a site become a shareable report</h2>
            </div>
            <div className="flex flex-col gap-4 lg:items-end">
              <p className="max-w-2xl font-medium leading-7 text-muted-foreground lg:text-right">
                See the product flow in motion: enter google.com, generate analytics, read the signal,
                export the PDF and share the report.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWorkflowReplayKey((key) => key + 1)}
                className="group w-fit gap-2 border-foreground/35 font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/60"
              >
                <RefreshCcw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                Replay Animation
              </Button>
            </div>
          </div>
          <div
            key={workflowReplayKey}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-foreground/35 bg-card p-4 shadow-xl shadow-foreground/[0.04] lg:p-5"
          >
            <div className="mx-auto grid max-w-4xl gap-3">
              <div className="grid animate-fade-in-up gap-3 rounded-lg border border-foreground/30 bg-background p-3 shadow-sm md:grid-cols-[140px_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-1 text-white">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 01</div>
                    <div className="text-base font-extrabold tracking-tight">Enter URL</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_130px] md:items-center">
                  <div className="flex items-center gap-2 rounded-lg border border-foreground/25 bg-secondary/70 px-3 py-2.5 text-sm font-bold text-foreground">
                    <Search className="h-4 w-4 text-chart-1" />
                    <span className="inline-block animate-[type-webmetrics-url_0.6s_steps(19)_0.15s_both] overflow-hidden whitespace-nowrap">webmetricsx.web.app</span>
                  </div>
                  <div className="animate-[fade-in_0.3s_ease-out_0.8s_both] text-sm font-semibold text-muted-foreground">URL accepted</div>
                </div>
              </div>

              <div className="grid animate-fade-in-up gap-3 rounded-lg border border-foreground/30 bg-background p-3 shadow-sm [animation-delay:1200ms] md:grid-cols-[140px_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-1">
                    <BarChart3 className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 02</div>
                    <div className="text-base font-extrabold tracking-tight">Analytics Running</div>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-center">
                  <div className="rounded-lg border border-foreground/25 bg-secondary/60 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Response time graph</span>
                      <span className="animate-[fade-in_0.3s_ease-out_2.5s_both] text-chart-2">stable</span>
                    </div>
                    <div className="relative h-20 overflow-hidden rounded-md bg-background/70">
                      <div className="absolute inset-x-0 top-1/3 border-t border-foreground/10" />
                      <div className="absolute inset-x-0 top-2/3 border-t border-foreground/10" />
                      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 96" preserveAspectRatio="none" aria-hidden="true">
                        <path
                          d="M0 80 L20 75 L40 85 L60 30 L80 45 L100 40 L120 75 L140 55 L160 50 L180 25 L200 35 L220 30 L240 70 L260 45 L280 40 L300 75 L320 50 L340 55 L360 40"
                          fill="none"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-[draw-line_1.2s_ease-out_1.5s_both]"
                        />
                        <path
                          d="M0 80 L20 75 L40 85 L60 30 L80 45 L100 40 L120 75 L140 55 L160 50 L180 25 L200 35 L220 30 L240 70 L260 45 L280 40 L300 75 L320 50 L340 55 L360 40 L360 96 L0 96 Z"
                          fill="hsl(var(--chart-1) / 0.1)"
                          className="animate-[fade-in_0.6s_ease-out_2s_both]"
                        />
                      </svg>
                      {[60, 100, 180, 220, 360].map((x, index) => (
                        <span
                          key={x}
                          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-4 ring-chart-1/15 animate-[pop-in_0.3s_ease-out_both]"
                          style={{
                            left: `${(x / 360) * 100}%`,
                            top: `${[30, 40, 25, 30, 40][index]}%`,
                            animationDelay: `${2.1 + index * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {[
                      ['DNS', '18ms', '1.6s'],
                      ['TCP', '24ms', '1.9s'],
                      ['TTFB', '68ms', '2.2s'],
                      ['LCP', '1.8s', '2.5s'],
                    ].map(([label, value, delay]) => (
                      <div key={label} className="animate-[fade-in_0.3s_ease-out_both] flex items-center justify-between rounded-md bg-secondary/70 px-3 py-1.5 text-sm" style={{ animationDelay: delay }}>
                        <span className="font-semibold text-muted-foreground">{label}</span>
                        <span className="font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid animate-fade-in-up gap-3 rounded-lg border border-foreground/30 bg-background p-3 shadow-sm [animation-delay:3000ms] md:grid-cols-[140px_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-2">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 03</div>
                    <div className="text-base font-extrabold tracking-tight">Read Signal</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Status', 'Healthy', 'text-status-up'],
                    ['SEO', '92', 'text-chart-3'],
                    ['SSL', 'Valid', 'text-status-up'],
                  ].map(([label, value, color], index) => (
                    <div key={label} className="animate-[pop-in_0.35s_ease-out_both] rounded-lg border border-foreground/25 bg-secondary/70 p-2.5" style={{ animationDelay: `${3.3 + index * 0.2}s` }}>
                      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
                      <div className={`mt-0.5 text-base font-extrabold ${color}`}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid animate-fade-in-up gap-3 rounded-lg border border-foreground/30 bg-background p-3 shadow-sm [animation-delay:4500ms] md:grid-cols-[140px_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-1">
                    <Download className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 04</div>
                    <div className="text-base font-extrabold tracking-tight">Export PDF</div>
                  </div>
                </div>
                <div className="rounded-lg border border-foreground/25 bg-secondary/70 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <FileText className="h-4 w-4 text-chart-1" />
                      webmetricsx-report.pdf
                    </div>
                    <span className="animate-[fade-in_0.3s_ease-out_5.5s_both] text-xs font-bold text-muted-foreground">charts + scores included</span>
                  </div>
                  <div className="h-2 rounded-full bg-background">
                    <div className="h-full animate-[fill-bar_1.2s_ease-out_4.8s_both] rounded-full bg-chart-1" />
                  </div>
                </div>
              </div>

              <div className="grid animate-fade-in-up gap-3 rounded-lg border border-foreground/30 bg-background p-3 shadow-sm [animation-delay:6000ms] md:grid-cols-[140px_1fr] md:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-2">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step 05</div>
                    <div className="text-base font-extrabold tracking-tight">Share Report</div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="rounded-lg border border-foreground/25 bg-secondary/70 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-muted-foreground">Report ready for client or team</span>
                      <span className="flex h-8 w-8 animate-[pop-in_0.3s_ease-out_6.8s_both] items-center justify-center rounded-full bg-status-up text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="pointer-events-none gap-2 border-foreground/35 font-semibold animate-[fade-in_0.3s_ease-out_7s_both]">
                    <Share2 className="h-4 w-4" />
                    Share PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="reports" className="border-b border-foreground/20">
        <div className="container relative mx-auto px-4 py-16">
          <img
            src="/favicon.png"
            alt=""
            className="pointer-events-none absolute -right-4 top-1/2 -z-10 h-64 w-64 -translate-y-1/2 rounded-[2rem] opacity-[0.03]"
          />
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/30 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                Product use cases
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl">Built for teams that need quick signal</h2>
              <p className="mt-4 font-medium leading-7 text-muted-foreground">
                Use {productName} for launch validation, client audits, production checks and recurring
                performance snapshots. It is lightweight enough for quick checks and detailed enough
                for real reporting.
              </p>
            </div>
            <div className="grid gap-4">
              {useCases.map((item, index) => (
                <div
                  key={item.title}
                  className="group animate-fade-in-up flex gap-4 rounded-lg border border-foreground/30 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/55 hover:shadow-md"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-chart-1">
                    <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div>
                    <h3 className="font-bold tracking-tight">{item.title}</h3>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container mx-auto px-4 py-16">
          <div className="relative overflow-hidden rounded-xl border border-foreground/35 bg-card p-8 text-center shadow-xl shadow-foreground/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-foreground/[0.07] lg:p-12">
            <img
              src="/favicon.png"
              alt=""
              className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-[2rem] opacity-[0.04]"
            />
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-foreground/30 bg-secondary shadow-sm">
              <img src="/favicon.png" alt="" className="h-14 w-14 rounded-2xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight [text-wrap:balance] sm:text-4xl">Ready to monitor your site with {productName}?</h2>
              <p className="mx-auto mt-4 max-w-xl font-medium leading-7 text-muted-foreground">
                {productTagline}. Open the monitor, paste a URL and get live uptime,
                performance, SEO and SSL insight in seconds.
              </p>
              <Button size="lg" onClick={onLaunch} className="group mt-8 h-12 gap-2 px-8 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                Start Monitoring
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-foreground/20 bg-background/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="text-2xl" role="img" aria-label="laptop">💻</span>
            <span className="text-2xl font-bold tracking-tight text-[#00875A]">Krish Mishra</span>
          </div>
          <p className="mb-4 text-lg font-medium text-muted-foreground flex items-center justify-center gap-2">
            Built with <span className="text-red-500 animate-pulse">❤️</span> using React, Tailwind CSS, and Framer Motion
          </p>
          <div className="text-sm font-semibold text-muted-foreground/80">
            © 2026 NO rights reserved — Let's build something amazing together!
          </div>
          <div className="mt-8 flex justify-center gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#workflow" className="transition-colors hover:text-foreground">Workflow</a>
            <button onClick={onLaunch} className="text-chart-1 transition-colors hover:text-chart-1/80">Open Monitor</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
