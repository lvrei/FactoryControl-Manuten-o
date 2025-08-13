import { ReactNode, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Factory,
  BarChart3,
  Settings,
  Users,
  Package,
  AlertTriangle,
  Activity,
  Calendar,
  Bell,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PWADebug } from "./PWADebug";

interface LayoutProps {
  children?: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Produção", href: "/production", icon: Factory },
  { name: "Equipamentos", href: "/equipment", icon: Activity },
  { name: "Qualidade", href: "/quality", icon: Package },
  { name: "Manutenção", href: "/maintenance", icon: Settings },
  { name: "Equipe", href: "/team", icon: Users },
  { name: "Planejamento", href: "/planning", icon: Calendar },
  { name: "Alertas", href: "/alerts", icon: AlertTriangle },
];

export function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card shadow-sm safe-area-top">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground btn-mobile"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Factory className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-foreground">FactoryControl</h1>
                <p className="text-xs text-muted-foreground">Sistema de Gestão Industrial</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground btn-mobile">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span>
            </button>

            <div className="hidden sm:flex items-center gap-3 rounded-lg bg-muted p-2">
              <div className="h-8 w-8 rounded-full bg-primary"></div>
              <div className="text-sm">
                <p className="font-medium text-foreground">Operador</p>
                <p className="text-xs text-muted-foreground">Turno A</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-card mobile-modal">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted btn-mobile"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors btn-mobile",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:block w-64 border-r border-border bg-card">
          <div className="space-y-1 p-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children || <Outlet />}

          {/* PWA Debug Component - only in development */}
          <div className="mt-8 pt-4 border-t border-muted">
            <PWADebug />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav md:hidden">
        <div className="flex justify-around items-center py-2">
          {navigation.slice(0, 5).map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 p-2 text-xs font-medium transition-colors btn-mobile",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
