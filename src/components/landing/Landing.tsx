import { motion, useScroll, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity, Shield, Bell, BarChart3, Search, Zap, Users, Lock, Gauge,
  ArrowRight, Check, Sparkles, Globe2, LineChart, ServerCrash, Cpu,
  Star, ChevronRight, Cloud, Code2, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ----------------------------- Scroll progress ---------------------------- */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] bg-gradient-to-r from-[hsl(var(--neon-green))] via-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-blue))]"
    />
  );
}

/* ------------------------------- Cursor glow ------------------------------ */
function CursorGlow() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);
  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      className="pointer-events-none fixed top-0 left-0 z-[5] -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
    >
      <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_center,hsl(var(--neon-cyan)/0.35),transparent_60%)]" />
    </motion.div>
  );
}

/* --------------------------------- Navbar --------------------------------- */
function Navbar({ onLaunch }: { onLaunch: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all',
        scrolled ? 'backdrop-blur-xl bg-[hsl(var(--bg-0)/0.7)] border-b border-white/5' : 'bg-transparent'
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]">
            <Activity className="h-5 w-5 text-black" />
            <div className="absolute inset-0 rounded-xl blur-md bg-[hsl(var(--neon-cyan)/0.6)] opacity-0 group-hover:opacity-70 transition-opacity" />
          </div>
          <span className="font-semibold tracking-tight text-white">WebMetricsX</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {['Features', 'Dashboard', 'Pricing', 'Testimonials'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="relative hover:text-white transition-colors group">
              {l}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>
        <MagneticButton onClick={onLaunch}>
          <span className="flex items-center gap-1.5">Launch Monitor <ArrowRight className="h-4 w-4" /></span>
        </MagneticButton>
      </div>
    </motion.header>
  );
}

/* ---------------------------- Magnetic CTA button ------------------------- */
function MagneticButton({ children, onClick, variant = 'primary', className }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost'; className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ x: sx, y: sy }}
      className={cn(
        'relative inline-flex items-center justify-center px-5 h-10 rounded-full text-sm font-medium transition-shadow',
        variant === 'primary'
          ? 'text-black bg-gradient-to-r from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))] shadow-[0_0_30px_-5px_hsl(var(--neon-cyan)/0.6)] hover:shadow-[0_0_45px_-3px_hsl(var(--neon-cyan)/0.8)]'
          : 'text-white border border-white/15 hover:bg-white/5',
        className
      )}
    >
      {children}
    </motion.button>
  );
}

/* ------------------------------ Animated count ---------------------------- */
function Counter({ to, suffix = '', duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0; let start = 0; let from = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min((t - start) / (duration * 1000), 1);
        setVal(from + (to - from) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      obs.disconnect();
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{Math.round(val).toLocaleString()}{suffix}</span>;
}

/* --------------------------------- Hero ----------------------------------- */
const HERO_WORDS = ['Monitor.', 'Analyze.', 'Optimize.', 'Scale.'];

function Hero({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section id="top" className="relative pt-36 pb-24 overflow-hidden">
      <div className="absolute inset-0 wmx-grid-bg" />
      <div className="wmx-blob bg-[hsl(var(--neon-green)/0.55)] -top-32 -left-32 h-[420px] w-[420px]" />
      <div className="wmx-blob bg-[hsl(var(--neon-blue)/0.45)] top-20 -right-32 h-[480px] w-[480px]" />
      <div className="wmx-blob bg-[hsl(var(--neon-cyan)/0.35)] bottom-0 left-1/3 h-[360px] w-[360px]" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-white/80 wmx-glass mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--neon-cyan))]" />
            AI-Powered Web Intelligence Platform
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span className="text-white/50">v2.0 — Live</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-white">
            {HERO_WORDS.map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.7 }}
                className={cn('inline-block mr-3', i === 3 && 'wmx-glow-text')}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="mt-6 text-lg sm:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed"
          >
            AI-powered website monitoring and SEO intelligence for modern businesses.
            Real-time uptime, performance, security and growth insights — all in one cinematic dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
            className="mt-10 flex items-center justify-center gap-3 flex-wrap"
          >
            <MagneticButton onClick={onLaunch} className="h-12 px-7 text-base">
              <span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> Start Monitoring Free</span>
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 px-6 text-base">
              <span className="flex items-center gap-2">View Live Demo <ChevronRight className="h-4 w-4" /></span>
            </MagneticButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
            className="mt-8 flex items-center justify-center gap-6 text-xs text-white/40"
          >
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" /> Real-time alerts</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--neon-green))]" /> AI insights</span>
          </motion.div>
        </motion.div>

        {/* Floating dashboard mockup */}
        <DashboardMock />

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { v: 99.99, s: '%', l: 'Uptime SLA' },
            { v: 4200, s: '+', l: 'Sites monitored' },
            { v: 27, s: 'ms', l: 'Avg check time' },
            { v: 180, s: '+', l: 'Global regions' },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="wmx-glass rounded-2xl p-5 text-center"
            >
              <div className="text-2xl font-semibold text-white">
                <Counter to={s.v} suffix={s.s} />
              </div>
              <div className="text-xs text-white/50 mt-1">{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- Animated dashboard mockup ----------------------- */
function DashboardMock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [18, 0, -10]);
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const [points] = useState(() =>
    Array.from({ length: 24 }, (_, i) => 50 + Math.sin(i / 2) * 18 + Math.random() * 10)
  );

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 100} ${100 - p}`)
    .join(' ');

  return (
    <div ref={containerRef} className="relative mt-20 max-w-5xl mx-auto" style={{ perspective: 1400 }}>
      <motion.div style={{ rotateX, y }} className="relative">
        <div className="wmx-glass-strong wmx-border-glow rounded-2xl p-3 shadow-[0_30px_120px_-20px_hsl(var(--neon-cyan)/0.4)]">
          {/* window chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_72%_60%)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(38_92%_60%)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(142_71%_55%)]" />
            <div className="ml-3 px-3 py-1 rounded-md bg-white/5 text-xs text-white/50 font-mono">webmetricsx.app/dashboard</div>
          </div>
          <div className="grid grid-cols-12 gap-3 p-3">
            {/* sidebar */}
            <div className="col-span-2 hidden sm:flex flex-col gap-2">
              {[Activity, BarChart3, Shield, Bell, Search, Users].map((I, i) => (
                <div key={i} className={cn('h-9 rounded-lg flex items-center justify-center', i === 0 ? 'bg-white/10 text-white' : 'text-white/40')}>
                  <I className="h-4 w-4" />
                </div>
              ))}
            </div>
            {/* main */}
            <div className="col-span-12 sm:col-span-10 grid grid-cols-6 gap-3">
              {[
                { l: 'Uptime', v: '99.98%', c: 'hsl(var(--neon-green))' },
                { l: 'Response', v: '142ms', c: 'hsl(var(--neon-cyan))' },
                { l: 'SEO Score', v: '94', c: 'hsl(var(--neon-blue))' },
              ].map((m) => (
                <div key={m.l} className="col-span-2 rounded-xl border border-white/10 p-4 bg-white/[0.02]">
                  <div className="text-xs text-white/50">{m.l}</div>
                  <div className="text-2xl font-semibold text-white mt-1" style={{ textShadow: `0 0 22px ${m.c}` }}>{m.v}</div>
                  <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} whileInView={{ width: '78%' }} viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: m.c }}
                    />
                  </div>
                </div>
              ))}
              {/* chart */}
              <div className="col-span-6 rounded-xl border border-white/10 p-4 bg-white/[0.02] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-white/70">Response time — last 24 hours</div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--neon-green))]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" /> Live
                  </div>
                </div>
                <svg viewBox="0 0 100 60" className="w-full h-32" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="wmx-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(180 95% 55%)" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="hsl(180 95% 55%)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="wmx-stroke" x1="0" x2="1">
                      <stop offset="0%" stopColor="hsl(142 90% 55%)" />
                      <stop offset="100%" stopColor="hsl(220 95% 60%)" />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={`${pathD} L 100 60 L 0 60 Z`} fill="url(#wmx-area)"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
                  />
                  <motion.path
                    d={pathD} fill="none" stroke="url(#wmx-stroke)" strokeWidth="0.6"
                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Floating cards */}
        <motion.div
          initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
          className="hidden md:block absolute -left-10 top-20 wmx-glass rounded-xl p-3 wmx-floaty"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--neon-green)/0.15)] grid place-items-center">
              <Check className="h-4 w-4 text-[hsl(var(--neon-green))]" />
            </div>
            <div>
              <div className="text-xs text-white/90">All systems operational</div>
              <div className="text-[10px] text-white/40">Updated 2s ago</div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.55 }}
          className="hidden md:block absolute -right-10 top-40 wmx-glass rounded-xl p-3 wmx-floaty"
          style={{ animationDelay: '1.2s' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--neon-cyan)/0.15)] grid place-items-center">
              <Sparkles className="h-4 w-4 text-[hsl(var(--neon-cyan))]" />
            </div>
            <div>
              <div className="text-xs text-white/90">AI Insight: +18% perf gain</div>
              <div className="text-[10px] text-white/40">Suggestion ready</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* -------------------------------- Logos row ------------------------------- */
function LogoMarquee() {
  const items = ['Acme', 'Vertex', 'Lumen', 'Nimbus', 'Cipher', 'Pulse', 'Nova', 'Quanta', 'Helix', 'Orbit'];
  const all = [...items, ...items];
  return (
    <section className="relative py-12 border-y border-white/5 bg-[hsl(var(--bg-1))]">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Trusted by teams scaling the modern web</p>
        <div className="overflow-hidden">
          <div className="flex gap-12 wmx-marquee whitespace-nowrap">
            {all.map((n, i) => (
              <span key={i} className="text-2xl font-semibold text-white/30 hover:text-white/70 transition-colors">{n}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Features -------------------------------- */
const FEATURES = [
  { icon: Activity, title: 'Uptime Monitoring', desc: 'Multi-region checks every few seconds with intelligent retry logic.', accent: 'hsl(var(--neon-green))' },
  { icon: Sparkles, title: 'AI SEO Suggestions', desc: 'Actionable recommendations powered by large language models.', accent: 'hsl(var(--neon-cyan))' },
  { icon: Bell, title: 'Downtime Alerts', desc: 'Push, email, and webhook alerts the moment something breaks.', accent: 'hsl(var(--neon-blue))' },
  { icon: LineChart, title: 'Real-Time Analytics', desc: 'Cinematic dashboards with sub-second updates and live charts.', accent: 'hsl(var(--neon-cyan))' },
  { icon: BarChart3, title: 'Performance Reports', desc: 'Beautiful PDFs and shareable reports for clients & stakeholders.', accent: 'hsl(var(--neon-green))' },
  { icon: Shield, title: 'Security Monitoring', desc: 'SSL validation, header checks, and certificate expiry alerts.', accent: 'hsl(var(--neon-blue))' },
  { icon: Zap, title: 'Speed Optimization', desc: 'Core Web Vitals analysis with prioritized fix suggestions.', accent: 'hsl(var(--neon-cyan))' },
  { icon: Users, title: 'Team Collaboration', desc: 'Roles, shared workspaces, and on-call rotations built in.', accent: 'hsl(var(--neon-green))' },
];

function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="container">
        <SectionHeader
          eyebrow="Capabilities"
          title={<>Everything you need, <span className="wmx-glow-text">nothing you don't</span></>}
          subtitle="A complete observability suite that feels like one beautiful product, not ten dashboards stitched together."
        />
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent, index }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0); const rotY = useMotionValue(0);
  const handleMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rotY.set(px * 10); rotX.set(-py * 10);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => { rotX.set(0); rotY.set(0); }}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 800 }}
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="group relative rounded-2xl wmx-glass wmx-border-glow p-6 wmx-tilt"
    >
      <div
        className="h-11 w-11 rounded-xl grid place-items-center mb-5"
        style={{ background: `${accent.replace(')', ' / 0.12)')}`, boxShadow: `0 0 30px -8px ${accent}` }}
      >
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <h3 className="text-white font-semibold">{title}</h3>
      <p className="text-sm text-white/55 mt-2 leading-relaxed">{desc}</p>
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `radial-gradient(400px circle at var(--mx,50%) var(--my,50%), ${accent.replace(')', ' / 0.08)')}, transparent 40%)` }}
      />
    </motion.div>
  );
}

/* --------------------------- Section header utility ---------------------- */
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] wmx-glass text-white/70"
      >
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-white/55 leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

/* -------------------------- Dashboard tabs section ------------------------ */
const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity, body: 'Real-time uptime, response, and AI summary at a glance.' },
  { id: 'performance', label: 'Performance', icon: Gauge, body: 'Core Web Vitals, TTFB, DNS and TCP breakdowns.' },
  { id: 'seo', label: 'SEO', icon: Search, body: 'Per-page SEO scoring with prioritized AI suggestions.' },
  { id: 'security', label: 'Security', icon: Lock, body: 'SSL, headers, and vulnerability monitoring with alerts.' },
];

function DashboardShowcase() {
  const [active, setActive] = useState('overview');
  const tab = TABS.find(t => t.id === active)!;
  return (
    <section id="dashboard" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 wmx-grid-bg opacity-50" />
      <div className="container relative">
        <SectionHeader eyebrow="Dashboard" title={<>One dashboard to <span className="wmx-glow-text">rule them all</span></>} subtitle="Switch between performance, SEO, and security views without losing context." />
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {TABS.map(t => (
            <button
              key={t.id} onClick={() => setActive(t.id)}
              className={cn('relative px-4 h-10 rounded-full text-sm flex items-center gap-2 transition-colors',
                active === t.id ? 'text-black' : 'text-white/70 hover:text-white border border-white/10')}
            >
              {active === t.id && (
                <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]" />
              )}
              <span className="relative flex items-center gap-2"><t.icon className="h-4 w-4" /> {t.label}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={tab.id}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mt-10 mx-auto max-w-5xl wmx-glass-strong wmx-border-glow rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--neon-cyan)/0.6)] to-transparent" />
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">{tab.label}</div>
              <h3 className="text-2xl font-semibold text-white mt-2">{tab.body}</h3>
              <ul className="mt-5 space-y-2 text-sm text-white/65">
                {['Drill-down filters', 'AI-generated summaries', 'Exportable PDF reports'].map(x => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[hsl(var(--neon-green))]" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative h-56 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
              <div className="absolute inset-0 wmx-scan opacity-50" />
              <div className="absolute inset-0 grid grid-cols-3 gap-2 p-3">
                {[...Array(9)].map((_, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                    className="rounded-md border border-white/5 bg-white/[0.03]"
                    style={{ boxShadow: i % 3 === 0 ? `inset 0 0 20px hsl(var(--neon-cyan)/0.15)` : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------------- Bento -------------------------------- */
function Bento() {
  return (
    <section className="relative py-28">
      <div className="container">
        <SectionHeader eyebrow="Why WebMetricsX" title={<>Built for teams that <span className="wmx-glow-text">move fast</span></>} />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[180px]">
          <BentoCard className="md:col-span-2 md:row-span-2" icon={Cpu} title="Smart AI insights" desc="LLM-powered recommendations for SEO, performance, and reliability — automatically prioritized.">
            <div className="absolute right-6 bottom-6 flex gap-2 opacity-80">
              {[...Array(5)].map((_, i) => (
                <motion.div key={i} initial={{ height: 8 }} whileInView={{ height: 20 + i * 8 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="w-2 rounded-full bg-gradient-to-t from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]" />
              ))}
            </div>
          </BentoCard>
          <BentoCard icon={Zap} title="Fast monitoring" desc="Sub-second probes from a global edge network." />
          <BentoCard icon={Code2} title="Developer friendly" desc="Powerful API, webhooks, and CLI access." />
          <BentoCard icon={Lock} title="Enterprise security" desc="SOC2-ready architecture, SSO, and audit logs." />
          <BentoCard className="md:col-span-2" icon={Cloud} title="Cloud-powered infrastructure" desc="Globally distributed, auto-scaling, with 99.99% uptime SLA.">
            <div className="absolute inset-x-6 bottom-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} whileInView={{ width: '92%' }} viewport={{ once: true }} transition={{ duration: 1.4 }}
                className="h-full bg-gradient-to-r from-[hsl(var(--neon-green))] via-[hsl(var(--neon-cyan))] to-[hsl(var(--neon-blue))]" />
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

function BentoCard({ icon: Icon, title, desc, children, className }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
      className={cn('relative wmx-glass wmx-border-glow rounded-2xl p-6 overflow-hidden wmx-tilt', className)}
    >
      <div className="h-10 w-10 rounded-xl bg-white/5 grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-[hsl(var(--neon-cyan))]" />
      </div>
      <h3 className="text-white font-semibold">{title}</h3>
      <p className="text-sm text-white/55 mt-2 max-w-md">{desc}</p>
      {children}
    </motion.div>
  );
}

/* ------------------------------ Testimonials ------------------------------ */
const TESTIMONIALS = [
  { name: 'Aisha Khan', role: 'CTO, Vertex Labs', text: 'WebMetricsX cut our incident response time in half. The AI insights actually feel like a teammate.', color: 'hsl(var(--neon-green))' },
  { name: 'Marco Silva', role: 'Head of Eng, Lumen', text: 'The most beautiful monitoring product we have ever shipped to our customers.', color: 'hsl(var(--neon-cyan))' },
  { name: 'Priya Rao', role: 'Founder, Nimbus', text: 'Replaced three separate tools. Our team finally has one source of truth.', color: 'hsl(var(--neon-blue))' },
  { name: 'Jonas Weber', role: 'SRE Lead, Helix', text: 'Edge probes are blazing fast and the alerts are eerily accurate. Love it.', color: 'hsl(var(--neon-green))' },
  { name: 'Sara Lee', role: 'Growth, Orbit', text: 'The SEO suggestions alone paid for the year in the first month.', color: 'hsl(var(--neon-cyan))' },
];

function Testimonials() {
  const all = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="relative py-28 overflow-hidden">
      <div className="container">
        <SectionHeader eyebrow="Loved by builders" title={<>What customers <span className="wmx-glow-text">are saying</span></>} />
      </div>
      <div className="mt-14 relative">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[hsl(var(--bg-0))] to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[hsl(var(--bg-0))] to-transparent z-10" />
        <div className="overflow-hidden">
          <div className="flex gap-5 wmx-marquee" style={{ width: 'max-content' }}>
            {all.map((t, i) => (
              <div key={i} className="w-[340px] shrink-0 wmx-glass rounded-2xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, k) => <Star key={k} className="h-4 w-4 fill-[hsl(var(--neon-cyan))] text-[hsl(var(--neon-cyan))]" />)}
                </div>
                <p className="text-white/80 text-sm leading-relaxed">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full grid place-items-center text-black font-semibold text-sm"
                    style={{ background: t.color }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm text-white">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Pricing -------------------------------- */
const PLANS = (annual: boolean) => [
  { name: 'Starter', price: annual ? 0 : 0, desc: 'For solo developers exploring WebMetricsX.', features: ['1 monitored site', '5-min checks', 'Email alerts', 'Basic SEO score'], cta: 'Start free' },
  { name: 'Pro', price: annual ? 19 : 24, desc: 'For growing teams that demand reliability.', features: ['25 monitored sites', '30s checks', 'Push + Webhook alerts', 'AI SEO insights', 'PDF reports'], cta: 'Start 14-day trial', highlight: true },
  { name: 'Enterprise', price: annual ? 99 : 119, desc: 'For organizations operating at scale.', features: ['Unlimited sites', '5s global checks', 'SSO + RBAC', 'Custom SLAs', 'Dedicated success'], cta: 'Talk to sales' },
];

function Pricing({ onLaunch }: { onLaunch: () => void }) {
  const [annual, setAnnual] = useState(true);
  const plans = PLANS(annual);
  return (
    <section id="pricing" className="relative py-28">
      <div className="container">
        <SectionHeader eyebrow="Pricing" title={<>Simple, <span className="wmx-glow-text">transparent</span> pricing</>} subtitle="Pick a plan, scale anytime, cancel whenever." />
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn('text-sm', !annual ? 'text-white' : 'text-white/40')}>Monthly</span>
          <button
            onClick={() => setAnnual(a => !a)}
            className="relative h-7 w-14 rounded-full bg-white/10 border border-white/10"
          >
            <motion.span
              animate={{ x: annual ? 28 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-gradient-to-br from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]"
            />
          </button>
          <span className={cn('text-sm', annual ? 'text-white' : 'text-white/40')}>Annual <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--neon-green)/0.15)] text-[hsl(var(--neon-green))]">−20%</span></span>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={cn('relative rounded-2xl p-6 wmx-glass overflow-hidden',
                p.highlight && 'wmx-border-glow ring-1 ring-[hsl(var(--neon-cyan)/0.4)]')}
            >
              {p.highlight && (
                <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))] text-black font-semibold">
                  Recommended
                </div>
              )}
              <h3 className="text-white text-lg font-semibold">{p.name}</h3>
              <p className="text-sm text-white/50 mt-1">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">${p.price}</span>
                <span className="text-sm text-white/40">/{annual ? 'mo billed yearly' : 'mo'}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm text-white/70">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--neon-green))]" /> {f}</li>
                ))}
              </ul>
              <Button
                onClick={onLaunch}
                className={cn('w-full mt-7 h-11 rounded-xl',
                  p.highlight
                    ? 'bg-gradient-to-r from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))] text-black hover:opacity-90'
                    : 'bg-white/10 text-white hover:bg-white/15')}
              >
                {p.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- CTA --------------------------------- */
function CTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="relative py-28">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl wmx-glass-strong wmx-border-glow p-12 sm:p-16 text-center">
          <div className="wmx-blob bg-[hsl(var(--neon-green)/0.55)] -top-20 -left-20 h-72 w-72" />
          <div className="wmx-blob bg-[hsl(var(--neon-blue)/0.5)] -bottom-20 -right-20 h-80 w-80" />
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Ready to <span className="wmx-glow-text">monitor smarter</span>?
          </motion.h2>
          <p className="mt-4 text-white/60 max-w-xl mx-auto">Join thousands of teams using WebMetricsX to keep the modern web fast, reliable, and discoverable.</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <MagneticButton onClick={onLaunch} className="h-12 px-7 text-base">
              <span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> Get started free</span>
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={onLaunch} className="h-12 px-6 text-base">
              <span className="flex items-center gap-2">Book a demo <ArrowRight className="h-4 w-4" /></span>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Footer -------------------------------- */
function Footer() {
  const cols: Record<string, string[]> = {
    Product: ['Features', 'Dashboard', 'Pricing', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Docs', 'API', 'Status', 'Support'],
    Legal: ['Privacy', 'Terms', 'Security', 'DPA'],
  };
  return (
    <footer className="relative border-t border-white/5 pt-16 pb-10 bg-[hsl(var(--bg-1))]">
      <div className="container grid md:grid-cols-6 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--neon-green))] to-[hsl(var(--neon-cyan))]">
              <Activity className="h-5 w-5 text-black" />
            </div>
            <span className="font-semibold text-white">WebMetricsX</span>
          </div>
          <p className="mt-4 text-sm text-white/50 max-w-xs">AI-powered website monitoring & SEO intelligence for modern businesses.</p>
          <div className="mt-5 flex items-center gap-3">
            {[Globe2, ServerCrash, Code2].map((I, i) => (
              <a key={i} href="#" className="h-9 w-9 rounded-full grid place-items-center border border-white/10 text-white/60 hover:text-white hover:border-[hsl(var(--neon-cyan)/0.5)] transition-colors">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {Object.entries(cols).map(([title, links]) => (
          <div key={title}>
            <h4 className="text-white text-sm font-semibold mb-4">{title}</h4>
            <ul className="space-y-2.5">
              {links.map(l => (
                <li key={l}>
                  <a href="#" className="text-sm text-white/50 hover:text-white transition-colors relative group inline-block">
                    {l}
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[hsl(var(--neon-cyan))] group-hover:w-full transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <span>© {new Date().getFullYear()} WebMetricsX. All rights reserved.</span>
        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--neon-green))] animate-pulse" /> All systems operational</span>
      </div>
    </footer>
  );
}

/* ------------------------------ Public landing ---------------------------- */
export function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="wmx-dark relative min-h-screen overflow-hidden">
      <ScrollProgress />
      <CursorGlow />
      <Navbar onLaunch={onLaunch} />
      <Hero onLaunch={onLaunch} />
      <LogoMarquee />
      <Features />
      <DashboardShowcase />
      <Bento />
      <Testimonials />
      <Pricing onLaunch={onLaunch} />
      <CTA onLaunch={onLaunch} />
      <Footer />
    </div>
  );
}
