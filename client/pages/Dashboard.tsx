import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  Wrench,
  Package,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/config/api";

interface DashboardStats {
  equipments: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  maintenance: {
    scheduled: number;
    completed_month: number;
    pending: number;
    overdue: number;
  };
  materials: {
    total: number;
    low_stock: number;
    out_of_stock: number;
  };
  alerts: {
    critical: number;
    warning: number;
    total_active: number;
  };
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: "green" | "blue" | "orange" | "red";
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    green: "from-green-500/10 to-emerald-500/10 border-green-200/30 text-green-600",
    blue: "from-blue-500/10 to-cyan-500/10 border-blue-200/30 text-blue-600",
    orange: "from-orange-500/10 to-amber-500/10 border-orange-200/30 text-orange-600",
    red: "from-red-500/10 to-rose-500/10 border-red-200/30 text-red-600",
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[0]} bg-opacity-10`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-foreground">{value}</div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    equipments: { total: 0, active: 0, maintenance: 0, inactive: 0 },
    maintenance: { scheduled: 0, completed_month: 0, pending: 0, overdue: 0 },
    materials: { total: 0, low_stock: 0, out_of_stock: 0 },
    alerts: { critical: 0, warning: 0, total_active: 0 },
  });

  const [recentMaintenance, setRecentMaintenance] = useState<any[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const equipmentRes = await apiFetch("machines");
      if (equipmentRes.ok) {
        const equipments = await equipmentRes.json();
        const equipmentStats = {
          total: equipments.length,
          active: equipments.filter((e: any) => e.status === "active").length,
          maintenance: equipments.filter((e: any) => e.status === "maintenance")
            .length,
          inactive: equipments.filter((e: any) => e.status === "inactive")
            .length,
        };

        setStats((prev) => ({ ...prev, equipments: equipmentStats }));
      }

      const plannedRes = await apiFetch("maintenance/planned");
      if (plannedRes.ok) {
        const planned = await plannedRes.json();
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        setStats((prev) => ({
          ...prev,
          maintenance: {
            scheduled: planned.filter((p: any) => p.status === "scheduled")
              .length,
            completed_month: planned.filter(
              (p: any) =>
                p.status === "completed" &&
                p.completed_date &&
                new Date(p.completed_date) >= firstDayOfMonth,
            ).length,
            pending: planned.filter((p: any) => p.status === "pending").length,
            overdue: planned.filter(
              (p: any) =>
                p.status === "scheduled" && new Date(p.scheduled_date) < now,
            ).length,
          },
        }));

        const recent = planned
          .filter((p: any) => p.status === "completed")
          .sort(
            (a: any, b: any) =>
              (b.completed_date ? new Date(b.completed_date).getTime() : 0) -
              (a.completed_date ? new Date(a.completed_date).getTime() : 0),
          )
          .slice(0, 5);
        setRecentMaintenance(recent);

        const upcoming = planned
          .filter((p: any) => p.status === "scheduled")
          .sort(
            (a: any, b: any) =>
              new Date(a.scheduled_date).getTime() -
              new Date(b.scheduled_date).getTime(),
          )
          .slice(0, 5);
        setUpcomingMaintenance(upcoming);
      }

      const maintenanceRes = await apiFetch("maintenance/records");
      if (maintenanceRes.ok) {
        await maintenanceRes.json();
      }

      const materialsRes = await apiFetch("materials");
      if (materialsRes.ok) {
        const materials = await materialsRes.json();
        setStats((prev) => ({
          ...prev,
          materials: {
            total: materials.length,
            low_stock: materials.filter(
              (m: any) => m.current_stock > 0 && m.current_stock <= m.min_stock,
            ).length,
            out_of_stock: materials.filter((m: any) => m.current_stock === 0)
              .length,
          },
        }));
      }

      const alertsRes = await apiFetch("iot/alerts");
      if (alertsRes.ok) {
        const alerts = await alertsRes.json();
        setStats((prev) => ({
          ...prev,
          alerts: {
            critical: alerts.filter(
              (a: any) => a.severity === "critical" && a.status === "active",
            ).length,
            warning: alerts.filter(
              (a: any) => a.severity === "warning" && a.status === "active",
            ).length,
            total_active: alerts.filter((a: any) => a.status === "active")
              .length,
          },
        }));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const equipmentHealthPercentage =
    stats.equipments.total > 0
      ? Math.round((stats.equipments.active / stats.equipments.total) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Bem-vindo ao seu painel de controle de manutenção
          </p>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Equipamentos Ativos"
          value={stats.equipments.active}
          subtitle={`de ${stats.equipments.total} equipamentos`}
          icon={Activity}
          trend={12}
          color="green"
        />
        <StatCard
          title="Manutenções Pendentes"
          value={stats.maintenance.pending}
          subtitle={stats.maintenance.overdue > 0 ? `${stats.maintenance.overdue} atrasadas` : "Nenhuma atrasada"}
          icon={Settings}
          trend={stats.maintenance.overdue > 0 ? -5 : 0}
          color={stats.maintenance.overdue > 0 ? "red" : "blue"}
        />
        <StatCard
          title="Stock Baixo"
          value={stats.materials.low_stock}
          subtitle={`${stats.materials.out_of_stock} sem stock`}
          icon={Package}
          color="orange"
        />
        <StatCard
          title="Alertas Ativos"
          value={stats.alerts.total_active}
          subtitle={stats.alerts.critical > 0 ? `${stats.alerts.critical} críticos` : "Nenhum crítico"}
          icon={AlertTriangle}
          color={stats.alerts.critical > 0 ? "red" : "blue"}
        />
      </div>

      {/* Performance Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              Manutenções Este Mês
            </CardTitle>
            <CardDescription>
              {stats.maintenance.completed_month} manutenções realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/30">
                <span className="text-sm font-medium">Concluídas</span>
                <Badge className="bg-green-600 hover:bg-green-700">
                  {stats.maintenance.completed_month}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-200/30">
                <span className="text-sm font-medium">Agendadas</span>
                <Badge className="bg-blue-600 hover:bg-blue-700">{stats.maintenance.scheduled}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200/30">
                <span className="text-sm font-medium">Pendentes</span>
                <Badge className="bg-orange-600 hover:bg-orange-700">{stats.maintenance.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              Estado dos Equipamentos
            </CardTitle>
            <CardDescription>Distribuição atual da frota</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/30">
                <span className="text-sm font-medium">Ativos</span>
                <Badge className="bg-green-600 hover:bg-green-700">
                  {stats.equipments.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200/30">
                <span className="text-sm font-medium">Em Manutenção</span>
                <Badge className="bg-orange-600 hover:bg-orange-700">
                  {stats.equipments.maintenance}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-200/30">
                <span className="text-sm font-medium">Inativos</span>
                <Badge className="bg-red-600 hover:bg-red-700">{stats.equipments.inactive}</Badge>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Saúde Geral</p>
                <Progress value={equipmentHealthPercentage} className="h-2" />
                <p className="text-xs font-semibold mt-2 text-foreground">{equipmentHealthPercentage}% operacional</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent and Upcoming Maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              Manutenções Recentes
            </CardTitle>
            <CardDescription>Últimas manutenções realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMaintenance.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma manutenção recente
                </p>
              )}
              {recentMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-gradient-to-r from-slate-500/5 to-slate-500/5 border border-border/50 hover:bg-gradient-to-r hover:from-slate-500/10 hover:to-slate-500/10 transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                    {maintenance.completed_date
                      ? new Date(
                          maintenance.completed_date,
                        ).toLocaleDateString("pt-PT")
                      : new Date(maintenance.created_at).toLocaleDateString("pt-PT")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-cyan-600" />
              </div>
              Próximas Manutenções
            </CardTitle>
            <CardDescription>Manutenções agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMaintenance.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma manutenção agendada
                </p>
              )}
              {upcomingMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-gradient-to-r from-slate-500/5 to-slate-500/5 border border-border/50 hover:bg-gradient-to-r hover:from-slate-500/10 hover:to-slate-500/10 transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge
                    className={`ml-2 whitespace-nowrap ${
                      maintenance.priority === "high"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {new Date(maintenance.scheduled_date).toLocaleDateString("pt-PT")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
