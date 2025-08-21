import "./global.css";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PWAInstall, PWAStatus } from "@/components/PWAInstall";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import ProductionNew from "./pages/ProductionNew";
import OperatorPortal from "./pages/OperatorPortal";
import TestProduction from "./pages/TestProduction";
import Stock from "./pages/Stock";
import Equipment from "./pages/Equipment";
import Quality from "./pages/Quality";
import MaintenanceComplete from "./pages/MaintenanceComplete";
import Team from "./pages/Team";
import Planning from "./pages/Planning";
import AlertsSimple from "./pages/AlertsSimple";
import Login from "./pages/Login";
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Backend Routes */}
            <Route path="/" element={
              <ProtectedRoute requiredRole="operator">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="production" element={<ProductionNew />} />
              <Route path="production-old" element={<Production />} />
              <Route path="test-production" element={<TestProduction />} />
              <Route path="stock" element={<Stock />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="quality" element={<Quality />} />
              <Route path="maintenance" element={<MaintenanceComplete />} />
              <Route path="team" element={
                <ProtectedRoute requiredRole="supervisor">
                  <Team />
                </ProtectedRoute>
              } />
              <Route path="planning" element={<Planning />} />
              <Route path="alerts" element={<AlertsSimple />} />
            </Route>

            {/* Protected Operator Route */}
            <Route path="operator" element={
              <ProtectedRoute requiredRole="operator">
                <OperatorPortal />
              </ProtectedRoute>
            } />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* PWA Components - Stable Version */}
          <PWAInstall />
          <PWAStatus />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

console.log('📦 App definido, preparando renderização...');

createRoot(document.getElementById("root")!).render(<App />);

console.log('🎯 App renderizado com sucesso!');
