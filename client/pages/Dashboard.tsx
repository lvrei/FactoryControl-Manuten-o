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
    green: "bg-gradient-to-br from-slate-800/60 to-slate-800/40 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400",
    blue: "bg-gradient-to-br from-slate-800/60 to-slate-800/40 border-blue-500/20 hover:border-blue-500/40 text-blue-400",
    orange: "bg-gradient-to-br from-slate-800/60 to-slate-800/40 border-orange-500/20 hover:border-orange-500/40 text-orange-400",
    red: "bg-gradient-to-br from-slate-800/60 to-slate-800/40 border-red-500/20 hover:border-red-500/40 text-red-400",
  };

  return (
    <Card className={`${colorClasses[color]} backdrop-blur-xl border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-200">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-slate-50">{value}</div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
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
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-indigo-900/20 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-indigo-900/20 rounded-full blur-3xl opacity-30"></div>

        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-50 mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-slate-400">
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
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Manutenções Este Mês
            </CardTitle>
            <CardDescription className="text-slate-400">
              {stats.maintenance.completed_month} manutenções realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Concluídas</span>
                <Badge className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100">
                  {stats.maintenance.completed_month}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Agendadas</span>
                <Badge className="bg-indigo-700 hover:bg-indigo-600 text-indigo-100">{stats.maintenance.scheduled}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Pendentes</span>
                <Badge className="bg-orange-700 hover:bg-orange-600 text-orange-100">{stats.maintenance.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Estado dos Equipamentos
            </CardTitle>
            <CardDescription className="text-slate-400">Distribuição atual da frota</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Ativos</span>
                <Badge className="bg-emerald-700 hover:bg-emerald-600 text-emerald-100">
                  {stats.equipments.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Em Manutenção</span>
                <Badge className="bg-orange-700 hover:bg-orange-600 text-orange-100">
                  {stats.equipments.maintenance}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                <span className="text-sm font-medium text-slate-200">Inativos</span>
                <Badge className="bg-red-700 hover:bg-red-600 text-red-100">{stats.equipments.inactive}</Badge>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-xs text-slate-400 mb-2">Saúde Geral</p>
                <Progress value={equipmentHealthPercentage} className="h-2" />
                <p className="text-xs font-semibold mt-2 text-slate-200">{equipmentHealthPercentage}% operacional</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent and Upcoming Maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-800 backdrop-blur border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-purple-400" />
              Manutenções Recentes
            </CardTitle>
            <CardDescription className="text-slate-400">Últimas manutenções realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMaintenance.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Nenhuma manutenção recente
                </p>
              )}
              {recentMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-50">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 whitespace-nowrap border-slate-600 bg-slate-700/50 text-slate-300">
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

        <Card className="bg-slate-800 backdrop-blur border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-cyan-400" />
              Próximas Manutenções
            </CardTitle>
            <CardDescription className="text-slate-400">Manutenções agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMaintenance.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">
                  Nenhuma manutenção agendada
                </p>
              )}
              {upcomingMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-50">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge
                    className={`ml-2 whitespace-nowrap ${
                      maintenance.priority === "high"
                        ? "bg-red-700 hover:bg-red-600 text-red-100"
                        : "bg-indigo-700 hover:bg-indigo-600 text-indigo-100"
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
