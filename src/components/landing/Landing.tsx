import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Gauge,
  Github,
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
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface LandingProps {
  onLaunch: () => void;
}

const productName = 'WebMetricsX';
const productTagline = 'Enterprise-Grade Website Monitoring & SEO Analytics';

const features = [
  { icon: BellRing, title: 'Downtime Alerts', desc: 'Get instant notifications if your website goes down or experiences outages.' },
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
  { value: '3s', label: 'Live polling interval' },
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

  const [workflowInView, setWorkflowInView] = useState(false);
  const workflowRef = React.useRef<HTMLDivElement>(null);

  // Downtime alerts section
  const [alertsInView, setAlertsInView] = useState(false);
  const [alertsReplayKey, setAlertsReplayKey] = useState(0);
  const [alertPhase, setAlertPhase] = useState(0); // 0=monitoring, 1=detecting, 2=alerting, 3=notified
  const alertsRef = React.useRef<HTMLDivElement>(null);

  // Downtime alerts state loop
  React.useEffect(() => {
    if (!alertsInView) return;

    let timer: NodeJS.Timeout;

    if (alertPhase === 0) {
      // Phase 0: Normal operation (UP) - runs for 2.2 seconds (exactly 2 heartbeats)
      timer = setTimeout(() => {
        setAlertPhase(1);
      }, 2200);
    } else if (alertPhase === 1) {
      // Phase 1: Detecting outage (degraded/checking) - runs for 2 seconds
      timer = setTimeout(() => {
        setAlertPhase(2);
      }, 2000);
    } else if (alertPhase === 2) {
      // Phase 2: Alert triggered (DOWN) - runs for 2 seconds
      timer = setTimeout(() => {
        setAlertPhase(3);
      }, 2000);
    } else if (alertPhase === 3) {
      // Phase 3: Notification delivered - runs for 5 seconds then loops back
      timer = setTimeout(() => {
        setAlertPhase(0);
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [alertsInView, alertPhase]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWorkflowInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (workflowRef.current) {
      observer.observe(workflowRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Downtime alerts observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !alertsInView) {
          setAlertsInView(true);
          setAlertPhase(0);
        }
      },
      { threshold: 0.25 }
    );

    if (alertsRef.current) {
      observer.observe(alertsRef.current);
    }

    return () => observer.disconnect();
  }, [alertsInView]);

  const handleReplayAlerts = () => {
    setAlertsReplayKey(k => k + 1);
    setAlertPhase(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased [text-rendering:optimizeLegibility]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <a href="#hero" className="group flex flex-col">
            <div className="text-2xl font-extrabold leading-none tracking-tight bg-gradient-to-r from-foreground to-foreground/85 bg-clip-text text-transparent group-hover:text-chart-1 transition-colors">{productName}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-chart-1">{productTagline}</div>
          </a>
          <nav className="hidden items-center gap-4 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#features" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-black hover:text-white hover:shadow-sm">Features</a>
            <a href="#workflow" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-black hover:text-white hover:shadow-sm">Workflow</a>
            <a href="#downtime-alerts" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-black hover:text-white hover:shadow-sm">Alerts</a>
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 transition-all hover:bg-black hover:text-white hover:shadow-sm">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
          <Button onClick={onLaunch} size="sm" className="group h-10 gap-2 rounded-full border border-black bg-foreground px-5 text-background shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-md">
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
                <Button size="lg" variant="outline" className="h-12 px-6 font-semibold border-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
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
            {features.map((f, index) => {
              const isDowntimeAlerts = f.title === 'Downtime Alerts';
              const isStatus = f.title === 'Website Status';
              const isHttpCodes = f.title === 'HTTP Status Codes';
              const isResponseTime = f.title === 'Current Response Time';
              const isCoreFeature = isStatus || isHttpCodes || isResponseTime;
              
              // Custom labels
              let badgeText = '';
              if (isDowntimeAlerts) badgeText = 'CRITICAL ALERT';
              else if (isStatus) badgeText = 'LIVE STATUS';
              else if (isHttpCodes) badgeText = 'PROTOCOL CODES';
              else if (isResponseTime) badgeText = 'REAL-TIME SPEED';

              return (
                <div
                  key={f.title}
                  className={`group relative animate-fade-in-up rounded-lg p-6 transition-all duration-300 ${
                    isDowntimeAlerts 
                      ? 'border border-transparent bg-red-500/[0.015] hover:bg-red-500/[0.035] hover:shadow-[0_0_20px_rgba(239,68,68,0.12)] hover:-translate-y-2' 
                      : isCoreFeature 
                        ? 'border border-transparent bg-blue-500/[0.01] hover:bg-blue-500/[0.03] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] hover:-translate-y-2' 
                        : 'border border-foreground/30 bg-card hover:-translate-y-1 hover:border-foreground/55 hover:shadow-md hover:shadow-foreground/[0.02]'
                  }`}
                  style={{ animationDelay: `${(index % 6) * 55}ms` }}
                >
                  {/* Dynamic Animated Dotted SVG Border */}
                  {(isDowntimeAlerts || isCoreFeature) && (
                    <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                          rx="3"
                          fill="none"
                          stroke={isDowntimeAlerts ? "rgba(239, 68, 68, 0.65)" : "rgba(59, 130, 246, 0.65)"}
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray="6 4"
                          className={`transition-all duration-300 ${
                            isDowntimeAlerts 
                              ? 'animate-[border-dash_18s_linear_infinite] group-hover:stroke-red-600 group-hover:animate-[border-dash_5s_linear_infinite]' 
                              : 'animate-[border-dash_18s_linear_infinite] group-hover:stroke-blue-600 group-hover:animate-[border-dash_5s_linear_infinite]'
                          }`}
                        />
                      </svg>
                    </div>
                  )}

                  {(isDowntimeAlerts || isCoreFeature) && (
                    <span className={`absolute top-4 right-4 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider border ${
                      isDowntimeAlerts 
                        ? 'bg-red-500/10 text-red-500 border-red-500/25 animate-pulse' 
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/25'
                    }`}>
                      {badgeText}
                    </span>
                  )}
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                    isDowntimeAlerts 
                      ? 'bg-red-500/10 group-hover:bg-red-500/20' 
                      : isCoreFeature 
                        ? 'bg-blue-500/10 group-hover:bg-blue-500/20' 
                        : 'bg-secondary group-hover:bg-chart-1/10'
                  }`}>
                    <f.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
                      isDowntimeAlerts 
                        ? 'text-red-500' 
                        : isCoreFeature 
                          ? 'text-blue-500' 
                          : 'text-chart-1'
                    }`} />
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-bold tracking-tight">{f.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" ref={workflowRef} className="border-b border-foreground/20 bg-secondary/30">
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
                className="group w-fit gap-2 border-black font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white"
              >
                <RefreshCcw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                Replay Animation
              </Button>
            </div>
          </div>
          <div
            key={`${workflowReplayKey}-${workflowInView}`}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-foreground/35 bg-card p-4 shadow-xl shadow-foreground/[0.04] lg:p-5"
          >
            {workflowInView ? (
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
          ) : (
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-secondary" />
                  <p className="text-sm font-medium">Scroll down to start animation...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="downtime-alerts" ref={alertsRef} className="border-b border-foreground/20 bg-background relative overflow-hidden">
        {/* Glow effect */}
        <div className="wmx-blob bg-destructive/10 w-96 h-96 -right-20 top-20" />
        <div className="wmx-blob bg-chart-1/5 w-80 h-80 -left-20 bottom-10" />

        <div className="container relative mx-auto px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left side: Interactive visualization */}
            <div 
              key={alertsReplayKey}
              className="relative rounded-xl border border-foreground/30 bg-card p-6 shadow-sm min-h-[380px] flex flex-col justify-between overflow-hidden"
            >
              {/* Header/Browser bar */}
              <div className="flex items-center justify-between border-b border-black/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 max-w-xs mx-4 px-3 py-1 rounded bg-secondary text-xs text-muted-foreground font-medium text-center truncate">
                  https://yoursite.com
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${alertPhase === 0 ? 'bg-status-up' : 'bg-status-down'}`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${alertPhase === 0 ? 'bg-status-up' : 'bg-status-down'}`} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">
                    {alertPhase === 0 ? 'Monitoring' : 'Incident Detected'}
                  </span>
                </div>
              </div>

              {/* Status Display Area */}
              <div className="flex-1 flex flex-col justify-center items-center py-6 relative z-10">
                {alertPhase === 0 && (
                  <div className="text-center space-y-4 animate-[slide-down-fade_0.4s_ease-out]">
                    <div className="inline-flex p-4 rounded-full bg-green-500/10 text-green-600 border border-green-200">
                      <Wifi className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold">Website is Operational</h4>
                      <p className="text-sm text-muted-foreground">HTTP 200 OK • Checked 5s ago</p>
                    </div>
                  </div>
                )}

                {alertPhase === 1 && (
                  <div className="text-center space-y-4 animate-[bell-shake_0.6s_infinite]">
                    <div className="inline-flex p-4 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-200">
                      <WifiOff className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-yellow-600">Connection Timed Out</h4>
                      <p className="text-sm text-muted-foreground">Retrying connection... (Attempt 2/3)</p>
                    </div>
                  </div>
                )}

                {(alertPhase === 2 || alertPhase === 3) && (
                  <div className="text-center space-y-4 animate-[alert-glow_2s_infinite] border border-destructive/30 rounded-xl p-6 bg-destructive/5 max-w-sm">
                    <div className="relative inline-flex">
                      <div className="absolute inset-0 rounded-full bg-destructive/20 animate-[alert-ring-pulse_1.5s_infinite]" />
                      <div className="relative p-4 rounded-full bg-destructive text-white">
                        <AlertTriangle className="h-10 w-10 animate-bounce" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-destructive">Website is DOWN (502 Gateway Error)</h4>
                      <p className="text-sm text-muted-foreground">Immediate incident alerts triggered!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulated Heartbeat Graph */}
              <div className="mt-4 border-t border-black/10 pt-4">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                  <span>Connection Heartbeat</span>
                  <span className={alertPhase === 0 ? 'text-status-up font-bold' : 'text-status-down font-bold'}>
                    {alertPhase === 0 ? '100% Uptime' : 'Incident Pending'}
                  </span>
                </div>
                <div className="relative h-10 w-full bg-secondary/50 rounded overflow-hidden">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 40" preserveAspectRatio="none">
                    {alertPhase === 0 ? (
                      // Healthy pulse
                      <path 
                        d="M0 20 L120 20 L125 10 L130 30 L135 20 L250 20 L255 5 L260 35 L265 20 L400 20" 
                        fill="none" 
                        stroke="hsl(var(--status-up))" 
                        strokeWidth="2"
                        className="animate-[heartbeat-line_2.2s_linear_infinite]"
                      />
                    ) : alertPhase === 1 ? (
                      // Degraded pulse
                      <path 
                        d="M0 20 L50 20 L55 10 L60 30 L65 20 L150 20 L160 20 L170 30 L180 20 L250 20 L260 20 L270 32 L280 20 L400 20" 
                        fill="none" 
                        stroke="hsl(var(--status-degraded))" 
                        strokeWidth="2"
                      />
                    ) : (
                      // Flatline with alert trigger points
                      <path 
                        d="M0 20 L50 20 L55 10 L60 30 L65 20 L150 20 L160 32 L170 20 L220 20 L400 20" 
                        fill="none" 
                        stroke="hsl(var(--status-down))" 
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Notification Overlay Card */}
              {alertPhase === 3 && (
                <div className="absolute right-4 bottom-16 left-4 sm:left-auto sm:w-80 bg-white/95 border border-foreground/30 rounded-lg p-4 shadow-md animate-[notif-slide-in_0.5s_cubic-bezier(0.16,1,0.3,1)_both] z-20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-destructive text-white rounded-md animate-[bell-shake_0.8s_ease-in-out_infinite]">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-destructive tracking-wider">Downtime Alert</span>
                        <span className="text-[10px] text-muted-foreground">Just Now</span>
                      </div>
                      <h5 className="text-sm font-bold text-foreground truncate mt-1">yoursite.com is DOWN!</h5>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                        HTTP 502 Bad Gateway • Alert dispatched to your browser.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Explanation content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-semibold text-destructive">
                <Bell className="h-3.5 w-3.5 animate-pulse" />
                Instant Alerts
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight [text-wrap:balance] leading-[1.1]">
                Never Miss a Downtime. <br />
                <span className="text-destructive">Get Notified Instantly.</span>
              </h2>

              <p className="text-base font-medium leading-relaxed text-muted-foreground">
                Jab monitoring active ho aur aapki website downtime par jaye, toh hamara engine automatic check execute karta hai. System status degradation detect karte hi instant browser push notification deliver karega taaki aap bina kisi delay ke rescue operations start kar sakein.
              </p>

              {/* Step indicator pipeline */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border border-black transition-colors ${alertPhase >= 0 ? 'bg-status-up text-white' : 'bg-secondary'}`}>
                    1
                  </div>
                  <span className={`text-sm font-semibold ${alertPhase === 0 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    Continuous 3s Polling Active
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border border-black transition-colors ${alertPhase >= 1 ? 'bg-status-degraded text-white' : 'bg-secondary'}`}>
                    2
                  </div>
                  <span className={`text-sm font-semibold ${alertPhase === 1 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    Detecting Outage & Triple Checking
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border border-black transition-colors ${alertPhase >= 2 ? 'bg-status-down text-white' : 'bg-secondary'}`}>
                    3
                  </div>
                  <span className={`text-sm font-semibold ${alertPhase >= 2 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    Triggering Alert Protocols
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border border-black transition-colors ${alertPhase >= 3 ? 'bg-chart-1 text-white' : 'bg-secondary'}`}>
                    4
                  </div>
                  <span className={`text-sm font-semibold ${alertPhase === 3 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    Push Notification Dispatched to User
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <Button 
                  onClick={handleReplayAlerts} 
                  variant="outline" 
                  className="group gap-2 border border-black font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Replay Alert Demo
                </Button>
                <Button 
                  onClick={onLaunch}
                  className="group gap-2 bg-destructive hover:bg-destructive/90 text-white font-semibold transition-all duration-300 hover:-translate-y-0.5 border border-transparent"
                >
                  Configure Alerts
                  <ArrowRight className="h-4 w-4" />
                </Button>
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
            <img src="/favicon.png" alt="" className="mx-auto mb-6 h-28 w-28 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.15)] animate-float" />
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

      <footer className="border-t border-black bg-background/50 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-6 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="laptop">💻</span>
              <a href="https://github.com/KrrishSR4" target="_blank" rel="noreferrer" className="text-xl sm:text-2xl font-bold tracking-tight text-[#00875A] transition-colors hover:opacity-80">Krish Mishra</a>
            </div>
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-black bg-card px-4 py-1.5 text-sm font-semibold transition-all hover:bg-black hover:text-white hover:shadow-sm">
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
          <p className="mb-4 text-sm sm:text-lg font-medium text-muted-foreground leading-relaxed">
            Built with <span className="inline-block text-red-500 animate-pulse mx-1">❤️</span> using React, Tailwind CSS, and Framer Motion
          </p>
          <div className="text-xs sm:text-sm font-semibold text-muted-foreground/80 px-2 leading-relaxed">
            © 2026 NO rights reserved — Let's build something amazing together!
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#workflow" className="transition-colors hover:text-foreground">Workflow</a>
            <a href="https://github.com/KrrishSR4/WebMetricsX" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">Repository</a>
            <button onClick={onLaunch} className="text-chart-1 transition-colors hover:text-chart-1/80">Open Monitor</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
