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
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Factory className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">FactoryControl</h1>
                <p className="text-xs text-muted-foreground">Sistema de Gestão Industrial</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span>
            </button>
            
            <div className="flex items-center gap-3 rounded-lg bg-muted p-2">
              <div className="h-8 w-8 rounded-full bg-primary"></div>
              <div className="text-sm">
                <p className="font-medium text-foreground">Operador</p>
                <p className="text-xs text-muted-foreground">Turno A</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 border-r border-border bg-card">
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
        <main className="flex-1 p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
