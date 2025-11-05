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
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load equipment stats (use machines API)
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

      // Load maintenance stats from planned maintenance
      const plannedRes = await apiFetch("maintenance/planned");
      if (plannedRes.ok) {
        const planned = await plannedRes.json();
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Calculate stats from planned maintenance
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
                p.status === "scheduled" &&
                new Date(p.scheduled_date) < now,
            ).length,
          },
        }));

        // Recent maintenance (completed, last 5)
        const recent = planned
          .filter((p: any) => p.status === "completed")
          .sort(
            (a: any, b: any) =>
              (b.completed_date ? new Date(b.completed_date).getTime() : 0) -
              (a.completed_date ? new Date(a.completed_date).getTime() : 0),
          )
          .slice(0, 5);
        setRecentMaintenance(recent);

        // Upcoming maintenance (scheduled, next 5)
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

      // Load maintenance records (historical completed maintenance)
      const maintenanceRes = await apiFetch("maintenance/records");
      if (maintenanceRes.ok) {
        const records = await maintenanceRes.json();
        // Keep records as fallback or use for additional historical data if needed
      }

      // Load material stats
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

      // Load alerts
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">MaintenanceControl</h1>
        <p className="text-muted-foreground">
          Dashboard de Gestão de Manutenção
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Equipamentos Ativos
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.equipments.active}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.equipments.total} equipamentos
            </p>
            <Progress value={equipmentHealthPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Manutenções Pendentes
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.maintenance.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.maintenance.overdue > 0 && (
                <span className="text-red-600 font-semibold">
                  {stats.maintenance.overdue} atrasadas
                </span>
              )}
              {stats.maintenance.overdue === 0 && "Nenhuma atrasada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Baixo</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.materials.low_stock}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.materials.out_of_stock} sem stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas Ativos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.alerts.total_active}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.alerts.critical > 0 && (
                <span className="text-red-600 font-semibold">
                  {stats.alerts.critical} críticos
                </span>
              )}
              {stats.alerts.critical === 0 && "Nenhum crítico"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Manutenções Este Mês
            </CardTitle>
            <CardDescription>
              {stats.maintenance.completed_month} manutenções realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Concluídas</span>
                <Badge variant="default">
                  {stats.maintenance.completed_month}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Agendadas</span>
                <Badge variant="secondary">{stats.maintenance.scheduled}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pendentes</span>
                <Badge variant="outline">{stats.maintenance.pending}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Estado dos Equipamentos
            </CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Ativos</span>
                <Badge className="bg-green-600">
                  {stats.equipments.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Em Manutenção</span>
                <Badge className="bg-orange-600">
                  {stats.equipments.maintenance}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Inativos</span>
                <Badge variant="destructive">{stats.equipments.inactive}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent and Upcoming Maintenance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Manutenções Recentes
            </CardTitle>
            <CardDescription>Últimas manutenções realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMaintenance.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma manutenção recente
                </p>
              )}
              {recentMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {maintenance.completed_date
                      ? new Date(maintenance.completed_date).toLocaleDateString()
                      : new Date(maintenance.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Manutenções
            </CardTitle>
            <CardDescription>Manuten��ões agendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMaintenance.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma manutenção agendada
                </p>
              )}
              {upcomingMaintenance.map((maintenance) => (
                <div
                  key={maintenance.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {maintenance.maintenance_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {maintenance.description}
                    </p>
                  </div>
                  <Badge
                    variant={
                      maintenance.priority === "high"
                        ? "destructive"
                        : "secondary"
                    }
                    className="ml-2"
                  >
                    {new Date(maintenance.scheduled_date).toLocaleDateString()}
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
