import "./global.css";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
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

// Auto-login for development (remove in production)
if (typeof window !== 'undefined') {
  const authData = {
    user: {
      id: '1',
      username: 'admin',
      name: 'Administrador',
      email: 'admin@factory.com',
      role: 'admin',
      accessLevel: 'full'
    },
    loginTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    isActive: true
  };
  
  localStorage.setItem('factoryControl_auth', JSON.stringify(authData));
  console.log('🔐 Auto-login ativado para desenvolvimento');
}

function App() {
  console.log('✅ App component renderizando...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/production" element={<Production />} />
                      <Route path="/production/new" element={<ProductionNew />} />
                      <Route path="/operator" element={<OperatorPortal />} />
                      <Route path="/test-production" element={<TestProduction />} />
                      <Route path="/stock" element={<Stock />} />
                      <Route path="/equipment" element={<Equipment />} />
                      <Route path="/quality" element={<Quality />} />
                      <Route path="/maintenance" element={<MaintenanceComplete />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/planning" element={<Planning />} />
                      <Route path="/alerts" element={<AlertsSimple />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          {/* PWA Install Button - Temporarily disabled until React hooks issue is resolved */}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");

const root = createRoot(container);
root.render(<App />);
