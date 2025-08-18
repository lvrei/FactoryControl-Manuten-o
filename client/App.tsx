import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { SimplePWAInstall } from "@/components/SimplePWAInstall";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import ProductionNew from "./pages/ProductionNew";
import OperatorPortal from "./pages/OperatorPortal";
import TestProduction from "./pages/TestProduction";
import Stock from "./pages/Stock";
import Equipment from "./pages/Equipment";
import Quality from "./pages/Quality";
import Maintenance from "./pages/Maintenance";
import Team from "./pages/Team";
import Planning from "./pages/Planning";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Debug logging
console.log('🚀 FactoryControl App carregando...');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🔒 Secure Context:', window.isSecureContext);
console.log('🌐 Location:', location.href);
console.log('🔧 Service Workers disponível:', 'serviceWorker' in navigator);

const App = () => {
  console.log('✅ App component renderizando...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="production" element={<ProductionNew />} />
              <Route path="production-old" element={<Production />} />
              <Route path="test-production" element={<TestProduction />} />
              <Route path="stock" element={<Stock />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="quality" element={<Quality />} />
              <Route path="maintenance" element={<Maintenance />} />
              <Route path="team" element={<Team />} />
              <Route path="planning" element={<Planning />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>
            <Route path="operator" element={<OperatorPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* PWA Install Button - Simplified for debugging */}
          <SimplePWAInstall />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

console.log('📦 App definido, preparando renderização...');

createRoot(document.getElementById("root")!).render(<App />);

console.log('🎯 App renderizado com sucesso!');
