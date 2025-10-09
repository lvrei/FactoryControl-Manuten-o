import { ReactNode, useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  X,
  Warehouse,
  Video,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
// import { PWADebug } from "./PWADebug"; // Temporarily disabled
import { authService } from "@/services/authService";
import { LoginSession } from "@/types/production";
import { APP_VERSION } from "@/version";

interface LayoutProps {
  children?: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "🆕 Produção", href: "/production", icon: Factory, isNew: true },
  { name: "OP (Fábrica)", href: "/factory-orders", icon: Package },
  {
    name: "🔄 Portal Operador",
    href: "/operator",
    icon: Users,
    isOperator: true,
  },
  { name: "Stock", href: "/stock", icon: Warehouse },
  { name: "Equipamentos", href: "/equipment", icon: Activity },
  { name: "Qualidade", href: "/quality", icon: Package },
  { name: "Manutenção", href: "/maintenance", icon: Settings },
  { name: "Equipa", href: "/team", icon: Users },
  { name: "Planejamento", href: "/planning", icon: Calendar },
  { name: "Sensores", href: "/sensors", icon: Settings },
  { name: "Câmaras", href: "/cameras", icon: Video },
  { name: "📊 Relatórios Câmaras", href: "/camera-reports", icon: BarChart3 },
  { name: "Assistente", href: "/assistant", icon: MessageSquare },
  { name: "Alertas", href: "/alerts", icon: AlertTriangle },
];

export function Layout({ children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<LoginSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = authService.getCurrentUser();
    setUserSession(session);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Navigation Bar - Mobile-First App Design */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl shadow-lg safe-area-top">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6 max-w-full">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground btn-mobile"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-blue-600 to-blue-700 shadow-lg shadow-primary/25 ring-2 ring-primary/20">
                <Factory className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent whitespace-nowrap">
                  FactoryControl
                </h1>
                <p className="text-[10px] md:text-xs font-medium text-muted-foreground/80">
                  Gestão Industrial
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <button className="relative rounded-xl p-2 text-muted-foreground hover:bg-gradient-to-br hover:from-muted hover:to-muted/50 hover:text-foreground transition-all duration-300 btn-mobile group">
              <Bell className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute top-0 right-0 h-2 w-2 md:h-3 md:w-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/50 animate-pulse"></span>
            </button>

            <div className="flex items-center gap-2 md:gap-3 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 p-1.5 md:p-2 border border-border/50 shadow-md">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-primary-foreground text-xs md:text-sm font-medium shadow-lg">
                {userSession?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium text-foreground text-xs md:text-sm">
                  {userSession?.username || "Utilizador"}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {userSession?.role || "Sem sessão"}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm("Terminar sessão?")) {
                    await authService.logout();
                    navigate("/login");
                  }
                }}
                className="hidden sm:block ml-2 p-1 text-muted-foreground hover:text-foreground"
                title="Terminar sessão"
              >
                ⏻
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
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
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

      <div className="flex overflow-x-hidden">
        {/* Desktop Sidebar Navigation - Modern Glass */}
        <nav className="hidden md:block w-56 lg:w-64 border-r border-border/40 bg-gradient-to-b from-card/80 to-card/95 backdrop-blur-sm flex-shrink-0">
          <div className="space-y-1 p-3 lg:p-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 group",
                    isActive
                      ? "bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                      : "text-muted-foreground hover:bg-gradient-to-r hover:from-muted hover:to-muted/50 hover:text-foreground hover:shadow-md hover:scale-[1.01]",
                  )
                }
              >
                <item.icon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 pb-20 md:pb-6 overflow-x-hidden min-w-0">
          {children || <Outlet />}

          {/* PWA Debug Component - only in development - TEMPORARILY DISABLED */}
          {/* <div className="mt-8 pt-4 border-t border-muted">
            <PWADebug />
          </div> */}
        </main>
      </div>

      {/* Footer with discrete branding - Modern */}
      <footer className="border-t border-border/40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-3 md:px-4 py-2 md:py-3 flex items-center justify-center gap-2">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-5 w-auto opacity-70"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <small className="text-[10px] md:text-[11px]">
            <span className="hidden sm:inline">Desenvolvido por:{" "}</span>
            <span className="font-medium text-foreground/80">Gil Rei</span>
            <span className="mx-1 md:mx-2">•</span>v{APP_VERSION}
          </small>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - Modern Glass */}
      <nav className="mobile-nav md:hidden backdrop-blur-xl bg-background/95 border-t border-border/40 shadow-2xl">
        <div className="flex justify-around items-center py-1.5 px-2">
          {navigation.slice(0, 5).map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 p-2 text-xs font-medium transition-colors btn-mobile min-w-[60px]",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] leading-tight text-center">{item.name.replace('🆕 ', '').replace('🔄 ', '').replace('📊 ', '')}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
