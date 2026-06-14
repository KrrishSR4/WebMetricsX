import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Monitor from "./pages/Monitor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    // Wait for fonts to be ready to avoid flash of unstyled text (FOUT)
    if (document && document.fonts) {
      document.fonts.ready.then(() => {
        setFontReady(true);
      }).catch(() => {
        setFontReady(true);
      });
    } else {
      setFontReady(true);
    }

    // Set progress step-by-step: 1 -> 49 -> 70 -> 100
    setProgress(1);

    const t1 = setTimeout(() => {
      setProgress(49);
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(70);
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(100);
    }, 1600);

    const timer = setTimeout(() => {
      setFade(true);
      const removeTimer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(timer);
    };
  }, []);

  const getStatusText = () => {
    if (progress < 25) return "Initializing monitor engine...";
    if (progress < 50) return "Establishing latency checks...";
    if (progress < 75) return "Parsing SEO audit config...";
    return "Optimizing visual layout...";
  };

  const getLogs = () => {
    const logs = [];
    if (progress >= 5) logs.push("› Initializing WebMetricsX Engine...");
    if (progress >= 20) logs.push("› Resolving target domain DNS records...");
    if (progress >= 35) logs.push("› Testing latency connection to Global Edges...");
    if (progress >= 50) logs.push("› Fetching PageSpeed index (Core Web Vitals)...");
    if (progress >= 65) logs.push("› Verifying SSL/TLS certificate chains...");
    if (progress >= 80) logs.push("› Compiling SEO markup audit metrics...");
    if (progress >= 95) logs.push("› Connection secure. Redirecting to dashboard...");
    return logs;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {loading && (
          <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}>
            <style>{`
              @keyframes bar-grow {
                0%, 100% { height: 20%; }
                50% { height: 100%; }
              }
              @keyframes line-draw {
                0%, 100% { stroke-dasharray: 60; stroke-dashoffset: 60; }
                50% { stroke-dasharray: 60; stroke-dashoffset: 0; }
              }
            `}</style>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-chart-1/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-chart-2/5 rounded-full blur-[60px] pointer-events-none" />

            <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${fontReady ? 'opacity-100' : 'opacity-0'} max-w-xl w-full px-6`}>
              <div className="mb-6 px-3 py-1 rounded-full border border-chart-1/30 bg-chart-1/5 text-[10px] font-bold uppercase tracking-widest text-chart-1 animate-pulse">
                WebMetricsX Edge Engine v1.0.4
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-foreground bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent select-none text-center">
                WebMetricsX
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-semibold text-center">Real-Time Monitoring Platform</p>

              {/* Server Details Grid */}
              <div className="grid grid-cols-2 gap-2 w-full mt-6 text-center">
                <div className="bg-muted/30 border border-black/5 rounded-lg p-2">
                  <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider">Protocol</div>
                  <div className="text-[10px] font-bold text-foreground mt-0.5">HTTP/3 (QUIC)</div>
                </div>
                <div className="bg-muted/30 border border-black/5 rounded-lg p-2">
                  <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider">Latency</div>
                  <div className="text-[10px] font-bold text-status-up mt-0.5">140ms (Optimal)</div>
                </div>
                <div className="bg-muted/30 border border-black/5 rounded-lg p-2">
                  <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider">Encryption</div>
                  <div className="text-[10px] font-bold text-foreground mt-0.5">TLS 1.3 Secure</div>
                </div>
                <div className="bg-muted/30 border border-black/5 rounded-lg p-2">
                  <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider">Global Nodes</div>
                  <div className="text-[10px] font-bold text-foreground mt-0.5">48 Active</div>
                </div>
              </div>

              {/* 3 Separate Chart Animations */}
              <div className="flex items-center justify-center gap-10 mt-8 mb-2 w-full border-b border-black/5 pb-4">
                {/* Bar Chart */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-end gap-1 h-8 w-12 justify-center pb-1">
                    <div className="w-1.5 bg-chart-1 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '30%', animationDelay: '0.1s' }} />
                    <div className="w-1.5 bg-chart-2 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '0.3s' }} />
                    <div className="w-1.5 bg-chart-3 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '0.5s' }} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Latency</span>
                </div>

                {/* Line Graph */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center justify-center h-8 w-12 pb-1">
                    <svg className="w-10 h-7 text-chart-1" viewBox="0 0 50 30" fill="none">
                      <path d="M5 25 L15 15 L25 22 L35 8 L45 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-[line-draw_2s_infinite]" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Uptime</span>
                </div>

                {/* Pie Chart / Donut */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center justify-center h-8 w-12 pb-1">
                    <div className="relative w-6 h-6 rounded-full border-[3px] border-chart-2/20 border-t-chart-3 border-r-chart-4 animate-[spin_1.5s_linear_infinite]" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">SEO Index</span>
                </div>
              </div>

              <div className="mt-6 w-full h-1.5 bg-secondary rounded-full overflow-hidden relative border border-foreground/5 shadow-inner">
                <div 
                  className="h-full bg-chart-1 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_hsl(var(--chart-1))]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between w-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>{getStatusText()}</span>
                <span className="text-chart-1">{Math.round(progress)}%</span>
              </div>

              {/* Diagnostic Console Logs */}
              <div className="mt-6 w-full bg-black/90 rounded-xl border border-white/5 p-4 h-28 flex flex-col justify-end gap-1.5 font-mono text-[9px] text-green-400/90 shadow-2xl relative select-none">
                <div className="absolute top-2.5 right-3 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500/80" />
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/80" />
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500/80" />
                </div>
                <div className="absolute top-2 left-3 text-[7px] font-bold uppercase tracking-widest text-muted-foreground/45">
                  Diagnostic Console Logs
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto text-left w-full pr-1">
                  {getLogs().map((log, idx) => (
                    <div key={idx} className="animate-[fade-in_0.15s_ease-out]">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2.5 w-full text-xs font-semibold text-muted-foreground border-t border-black/5 pt-6">
                <div className={`flex items-center gap-2 transition-colors duration-300 ${progress >= 25 ? 'text-status-up' : ''}`}>
                  <span className="text-sm">{progress >= 25 ? '●' : '○'}</span>
                  <span>Uptime Probe [3s]</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors duration-300 ${progress >= 50 ? 'text-status-up' : ''}`}>
                  <span className="text-sm">{progress >= 50 ? '●' : '○'}</span>
                  <span>Latency [400ms]</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors duration-300 ${progress >= 75 ? 'text-status-up' : ''}`}>
                  <span className="text-sm">{progress >= 75 ? '●' : '○'}</span>
                  <span>SSL Security</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors duration-300 ${progress >= 95 ? 'text-status-up' : ''}`}>
                  <span className="text-sm">{progress >= 95 ? '●' : '○'}</span>
                  <span>SEO Engine</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/monitor" element={<Monitor />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
