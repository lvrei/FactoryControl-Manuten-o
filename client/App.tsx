import "./global.css";

import "./sentry";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/config/api";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import MaintenanceComplete from "./pages/MaintenanceComplete";
import Team from "./pages/Team";
import Planning from "./pages/Planning";
import AlertsSimple from "./pages/AlertsSimple";
import SensorsPage from "./pages/Sensors";
import CamerasPage from "./pages/Cameras";
import MaterialStock from "./pages/MaterialStock";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Debug logging
console.log("🚀 FactoryControl App carregando...");
console.log("📱 User Agent:", navigator.userAgent);
console.log("🔒 Secure Context:", window.isSecureContext);
console.log("🌐 Location:", location.href);

const App = () => {
  console.log("✅ App component renderizando...");

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Backend Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute requiredRole="operator">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="maintenance" element={<MaintenanceComplete />} />
              <Route path="team" element={<Team />} />
              <Route path="planning" element={<Planning />} />
              <Route path="sensors" element={<SensorsPage />} />
              <Route path="cameras" element={<CamerasPage />} />
              <Route path="material-stock" element={<MaterialStock />} />
              <Route path="alerts" element={<AlertsSimple />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);

console.log("🎯 FactoryControl App inicializado com sucesso!");
