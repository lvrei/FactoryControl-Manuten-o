import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import Equipment from "./pages/Equipment";
import Quality from "./pages/Quality";
import Maintenance from "./pages/Maintenance";
import Team from "./pages/Team";
import Planning from "./pages/Planning";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="production" element={<Production />} />
            <Route path="equipment" element={<Equipment />} />
            <Route path="quality" element={<Quality />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="team" element={<Team />} />
            <Route path="planning" element={<Planning />} />
            <Route path="alerts" element={<Alerts />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
