import { useState, useEffect } from 'react';
import {
  Factory,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  Settings,
  Activity,
  Wrench,
  Timer,
  AlertCircle
} from "lucide-react";
import { productionService } from '@/services/productionService';
import { maintenanceService } from '@/services/maintenanceService';
import { ProductionOrder, Machine, MachineDowntime, MaintenanceRequest } from '@/types/production';

export default function Dashboard() {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineDowntime, setMachineDowntime] = useState<MachineDowntime[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [orders, machinesData] = await Promise.all([
        productionService.getProductionOrders(),
        productionService.getMachines()
      ]);
      setProductionOrders(orders);
      setMachines(machinesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos baseados em dados reais
  const totalOrders = productionOrders.length;
  const activeOrders = productionOrders.filter(o => o.status === 'in_progress').length;
  const completedToday = productionOrders.filter(o => 
    o.status === 'completed' && 
    new Date(o.updatedAt).toDateString() === new Date().toDateString()
  ).length;
  const urgentOrders = productionOrders.filter(o => o.priority === 'urgent').length;

  const activeMachines = machines.filter(m => m.status === 'busy').length;
  const totalMachines = machines.length;
  
  const blocksInProduction = productionOrders
    .filter(o => o.status === 'in_progress')
    .reduce((total, order) => total + order.lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0), 0);

  const totalVolume = productionOrders.reduce((total, order) => total + order.totalVolume, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">FactoryControl - Corte de Espuma</h1>
        <p className="text-muted-foreground">
          Dashboard em tempo real da produção e operações
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ordens Ativas</p>
              <p className="text-3xl font-bold text-card-foreground">{activeOrders}</p>
              <p className="text-xs text-muted-foreground">de {totalOrders} total</p>
            </div>
            <Factory className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Blocos em Produção</p>
              <p className="text-3xl font-bold text-card-foreground">{blocksInProduction}</p>
              <p className="text-xs text-muted-foreground">blocos de espuma</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Máquinas Ativas</p>
              <p className="text-3xl font-bold text-card-foreground">{activeMachines}</p>
              <p className="text-xs text-muted-foreground">de {totalMachines} máquinas</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Concluídas Hoje</p>
              <p className="text-3xl font-bold text-card-foreground">{completedToday}</p>
              <p className="text-xs text-muted-foreground">ordens finalizadas</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Status das Máquinas */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Status das Máquinas</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {machines.map(machine => (
            <div key={machine.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{machine.name}</h4>
                <div className={`w-3 h-3 rounded-full ${
                  machine.status === 'busy' ? 'bg-yellow-500' :
                  machine.status === 'available' ? 'bg-green-500' :
                  machine.status === 'maintenance' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Tipo: {machine.type}</div>
                <div>Status: {
                  machine.status === 'busy' ? 'Em Uso' :
                  machine.status === 'available' ? 'Disponível' :
                  machine.status === 'maintenance' ? 'Manutenção' : 'Offline'
                }</div>
                {machine.currentOperator && (
                  <div>Operador: {machine.currentOperator}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ordens Urgentes */}
      {urgentOrders > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Ordens Urgentes</h3>
              <p className="text-sm text-red-700">
                {urgentOrders} {urgentOrders === 1 ? 'ordem requer' : 'ordens requerem'} atenção imediata
              </p>
            </div>
          </div>
          <a
            href="/production"
            className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
          >
            Ver ordens urgentes →
          </a>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-4">
        <a href="/production" className="rounded-lg border bg-card p-6 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Factory className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Produção</h3>
              <p className="text-sm text-muted-foreground">Gestão de OPs</p>
            </div>
          </div>
        </a>

        <a href="/operator" className="rounded-lg border bg-card p-6 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-blue-600/10 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Operadores</h3>
              <p className="text-sm text-muted-foreground">Portal da fábrica</p>
            </div>
          </div>
        </a>

        <a href="/quality" className="rounded-lg border bg-card p-6 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-green-600/10 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Qualidade</h3>
              <p className="text-sm text-muted-foreground">Inspeções</p>
            </div>
          </div>
        </a>

        <a href="/equipment" className="rounded-lg border bg-card p-6 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg bg-orange-600/10 p-3">
              <Settings className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">Equipamentos</h3>
              <p className="text-sm text-muted-foreground">Gestão de máquinas</p>
            </div>
          </div>
        </a>
      </div>

      {/* Resumo de Volume */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo de Produção</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalVolume.toFixed(2)} m³</div>
            <div className="text-sm text-muted-foreground">Volume Total em Produção</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{blocksInProduction}</div>
            <div className="text-sm text-muted-foreground">Blocos sendo Processados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{Math.round(activeMachines / totalMachines * 100)}%</div>
            <div className="text-sm text-muted-foreground">Taxa de Utilização</div>
          </div>
        </div>
      </div>
    </div>
  );
}
