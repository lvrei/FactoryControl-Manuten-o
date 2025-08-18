import { 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Package,
  Zap
} from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { EquipmentStatus } from "@/components/dashboard/EquipmentStatus";
import { ProductionChart } from "@/components/dashboard/ProductionChart";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Banner do Novo Sistema */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">🚀 Novo Sistema de Produção Disponível!</h2>
            <p className="text-blue-100 mb-3">
              Sistema completo para indústria de corte de espuma com gestão de OPs, chat, e portal do operador.
            </p>
            <div className="flex gap-3">
              <a
                href="/production"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                🏢 Gestão de Produção
              </a>
              <a
                href="/operator"
                className="bg-blue-400 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-300 transition-colors"
              >
                👷 Portal do Operador
              </a>
            </div>
          </div>
          <div className="text-6xl opacity-30">🏭</div>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard de Produção</h1>
        <p className="text-muted-foreground">
          Visão geral do chão de fábrica em tempo real
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Produção Hoje"
          value="1.247"
          change="+12.5%"
          changeType="positive"
          icon={Factory}
        />
        <MetricsCard
          title="Eficiência Geral"
          value="87.4%"
          change="+2.1%"
          changeType="positive"
          icon={TrendingUp}
        />
        <MetricsCard
          title="Equipamentos Ativos"
          value="24/28"
          change="4 em manutenção"
          changeType="neutral"
          icon={CheckCircle}
        />
        <MetricsCard
          title="Alertas Ativos"
          value="3"
          change="2 críticos"
          changeType="negative"
          icon={AlertTriangle}
        />
      </div>

      {/* Charts Section */}
      <ProductionChart />

      {/* Equipment and Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EquipmentStatus />
        </div>
        
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Resumo do Turno</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tempo de Operação</span>
                </div>
                <span className="text-sm font-medium">7h 32min</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Operadores</span>
                </div>
                <span className="text-sm font-medium">18 ativos</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Produtos Acabados</span>
                </div>
                <span className="text-sm font-medium">1.247 un</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Consumo Energia</span>
                </div>
                <span className="text-sm font-medium">2.847 kWh</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">Alertas Recentes</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Temperatura elevada - Forno 2
                  </p>
                  <p className="text-xs text-muted-foreground">há 15 minutos</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-3">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Baixa eficiência - Linha A
                  </p>
                  <p className="text-xs text-muted-foreground">há 32 minutos</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-info/10 p-3">
                <Clock className="h-4 w-4 text-info mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Manutenção programada - Prensa 3
                  </p>
                  <p className="text-xs text-muted-foreground">há 1 hora</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
