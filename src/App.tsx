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

  useEffect(() => {
    let start = null;
    const duration = 1200;
    let animationFrame;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progressTime = timestamp - start;
      const percent = Math.min((progressTime / duration) * 100, 100);
      setProgress(percent);
      if (progressTime < duration) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };
    animationFrame = window.requestAnimationFrame(step);

    const timer = setTimeout(() => {
      setFade(true);
      const removeTimer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 1500);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      clearTimeout(timer);
    };
  }, []);

  const getStatusText = () => {
    if (progress < 25) return "Initializing monitor engine...";
    if (progress < 50) return "Establishing latency checks...";
    if (progress < 75) return "Parsing SEO audit config...";
    return "Optimizing visual layout...";
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
            `}</style>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-chart-1/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-chart-2/5 rounded-full blur-[60px] pointer-events-none" />

            <div className="mb-6 px-3 py-1 rounded-full border border-chart-1/30 bg-chart-1/5 text-[10px] font-bold uppercase tracking-widest text-chart-1 animate-pulse">
              System Diagnostic Active
            </div>

            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute h-36 w-36 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-chart-1/10" />
              <div className="absolute h-24 w-24 animate-pulse rounded-full bg-chart-1/10 border border-chart-1/20" />
              <img src="/app.png" alt="WebMetricsX Logo" className="relative h-20 w-20 object-contain rounded-2xl shadow-xl border border-black/10 transition-transform duration-300 hover:scale-105" />
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-foreground bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent select-none">
              WebMetricsX
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-semibold">Real-Time Monitoring Platform</p>

            <div className="flex items-end gap-2 h-14 mt-8 justify-center w-64 border-b border-black/5 pb-2">
              <div className="w-2.5 bg-chart-1 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '30%', animationDelay: '0.1s' }} />
              <div className="w-2.5 bg-chart-2 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0.3s' }} />
              <div className="w-2.5 bg-chart-3 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0.5s' }} />
              <div className="w-2.5 bg-chart-4 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '0.7s' }} />
              <div className="w-2.5 bg-chart-1 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '50%', animationDelay: '0.9s' }} />
              <div className="w-2.5 bg-chart-2 rounded-t animate-[bar-grow_1.2s_ease-in-out_infinite]" style={{ height: '70%', animationDelay: '1.1s' }} />
            </div>

            <div className="mt-6 w-64 h-1.5 bg-secondary rounded-full overflow-hidden relative border border-foreground/5 shadow-inner">
              <div 
                className="h-full bg-chart-1 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_hsl(var(--chart-1))]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between w-64 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <span>{getStatusText()}</span>
              <span className="text-chart-1">{Math.round(progress)}%</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2.5 w-72 text-xs font-semibold text-muted-foreground border-t border-black/5 pt-6">
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
