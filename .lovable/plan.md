## Goal

Replace the current dark/futuristic landing (`src/components/landing/Landing.tsx`) with a **light-themed, monitoring-focused** landing page that matches the rest of the WebMetricsX app (clean whites, neutral grays, flat design from `index.css` semantic tokens — same vibe as the existing dashboard/feature cards).

Behavior change: landing is no longer a fixed overlay. It sits at the top of the page; when the user scrolls past it, the monitoring section appears naturally below. The "Start Monitoring" CTA smooth-scrolls to that section.

---

## Design direction (light, professional)

- Palette: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, accents via `chart-1`, `chart-2`, `status-up` — same tokens already used in feature cards.
- Typography: existing Inter; large but restrained hero (no neon, no gradient text, no glassmorphism).
- Style: GitHub/Vercel/Linear-light feel — flat, generous whitespace, subtle borders, soft shadows on hover. No `framer-motion` cinematics; light `animate-fade-in` / `animate-fade-in-up` only.
- Monitoring theme visuals: a clean SVG mock of a response-time line chart + uptime status pills + a small metric tile cluster as the hero illustration (light card, subtle grid background).

### Sections (top → bottom)

1. Hero — H1 ("Monitor Any Website in Real Time"), subtext, primary "Start Monitoring" button + secondary "Learn more". Right side: light SVG dashboard preview.
2. Trust strip — small "Live · 5s polling · SEO · Performance" pill row.
3. Feature grid — reuse the 6 existing feature cards (Real-Time, Performance, SSL, Analytics, SEO, Mobile) already in `Index.tsx` so the monitoring page can drop them.
4. How it works — 3 steps (Enter URL → Live metrics → Export PDF).
5. Final CTA band — "Start monitoring now" → scrolls to monitor section.

---

## Behavior / flow

- Landing renders inline at top of `Index.tsx` (not `fixed`/`z-50` overlay anymore).
- Below it, the monitoring section (`UrlInput` + features + dashboard) renders in normal document flow, so a normal scroll reveals it.
- "Start Monitoring" button calls a handler that smooth-scrolls to the `monitorRef` section and focuses the URL input.
- Once `isMonitoring` is true → hide the landing, show only the dashboard (same as today).
- "Stop Monitoring" → existing `showStopped` screen with "Return to Home" (unchanged).
- PDF export, notifications, monitoring hooks: **untouched**.

---

## Files to change

- `src/components/landing/Landing.tsx` — full rewrite, light theme, no framer-motion, no `wmx-*` dark utilities.
- `src/pages/Index.tsx` — remove fixed overlay wrapper + opacity state machine; render `<Landing />` inline above the monitor section; wire `onLaunch` to smooth-scroll to `monitorRef`. Move the existing 6 feature cards out of the monitor section (or keep only inside Landing) to avoid duplication.
- `src/index.css` — leave `wmx-*` classes (harmless) or remove if unused after rewrite (optional cleanup).

No changes to: `pdfReportGenerator.ts`, `PDFExportButton.tsx`, `useMonitoring`, `useNotifications`, `UrlInput`, `Dashboard`.

---

## Out of scope

- No backend/schema changes.
- No new dependencies (can drop `framer-motion` usage in landing; package can stay installed).
- No changes to monitoring logic or PDF.
