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

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      const removeTimer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {loading && (
          <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fade ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative flex items-center justify-center">
              <div className="absolute h-24 w-24 animate-ping rounded-full bg-chart-1/20" />
              <div className="absolute h-16 w-16 animate-pulse rounded-full bg-chart-1/40" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                <span className="text-xl font-black">W</span>
              </div>
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-tight text-foreground">WebMetricsX</h2>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-chart-1 [animation-delay:-0.3s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-chart-1 [animation-delay:-0.15s]" />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-chart-1" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Loading metrics engine</span>
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
