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
import { MaintenancePopupContainer } from '@/components/MaintenancePopup';

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
      const [orders, machinesData, downtime, requests] = await Promise.all([
        productionService.getProductionOrders(),
        productionService.getMachines(),
        maintenanceService.getMachineDowntime(),
        maintenanceService.getMaintenanceRequests()
      ]);

      // Verificação defensiva para garantir dados válidos
      const safeOrders = orders.filter(order =>
        order && typeof order === 'object' && order.id && order.lines && Array.isArray(order.lines)
      ).map(order => ({
        ...order,
        lines: order.lines.filter(line =>
          line && typeof line === 'object' && line.foamType &&
          typeof line.foamType === 'object' && line.foamType.name
        ).map(line => ({
          ...line,
          foamType: {
            ...line.foamType,
            color: line.foamType.color || 'N/A',
            stockColor: line.foamType.stockColor || '#f8f9fa'
          }
        }))
      }));

      const safeMachines = machinesData.filter(machine =>
        machine && typeof machine === 'object' && machine.id && machine.name
      );

      const safeDowntime = downtime.filter(dt =>
        dt && typeof dt === 'object' && dt.id && dt.machineName
      );

      const safeRequests = requests.filter(req =>
        req && typeof req === 'object' && req.id && req.title
      );

      setProductionOrders(safeOrders);
      setMachines(safeMachines);
      setMachineDowntime(safeDowntime);
      setMaintenanceRequests(safeRequests);
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

  // Maintenance calculations
  const activeMachineDowntime = machineDowntime.filter(d => d.status === 'ongoing');
  const machinesInMaintenance = machines.filter(m => m.status === 'maintenance').length;
  const pendingMaintenanceRequests = maintenanceRequests.filter(r => r.status === 'pending').length;
  const criticalMaintenanceRequests = maintenanceRequests.filter(r => r.urgencyLevel === 'critical' && r.status !== 'completed').length;

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

      {/* Machine Downtime and Maintenance Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Machines in Maintenance */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Máquinas em Manutenção
            </h3>
            <span className={`text-sm px-2 py-1 rounded-full ${
              machinesInMaintenance > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
            }`}>
              {machinesInMaintenance} máquinas
            </span>
          </div>

          {activeMachineDowntime.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Todas as máquinas operacionais</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMachineDowntime.map((downtime) => {
                const startTime = new Date(downtime.startTime);
                const now = new Date();
                const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                const hours = Math.floor(durationMinutes / 60);
                const minutes = durationMinutes % 60;

                return (
                  <div key={downtime.id} className="border rounded-lg p-3 bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{downtime.machineName}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        downtime.impact === 'critical' ? 'bg-red-100 text-red-800' :
                        downtime.impact === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {downtime.impact === 'critical' ? 'Crítico' :
                         downtime.impact === 'high' ? 'Alto' :
                         downtime.impact === 'medium' ? 'Médio' : 'Baixo'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{downtime.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Parada: {hours}h {minutes}min
                      </span>
                      <span className="text-muted-foreground">
                        {startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Maintenance Requests */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Solicitações de Manutenção
            </h3>
            <span className={`text-sm px-2 py-1 rounded-full ${
              pendingMaintenanceRequests > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
            }`}>
              {pendingMaintenanceRequests} pendentes
            </span>
          </div>

          <div className="grid gap-3 mb-4">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Críticas</span>
              </div>
              <span className="text-lg font-bold text-red-600">{criticalMaintenanceRequests}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Pendentes</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{pendingMaintenanceRequests}</span>
            </div>
          </div>

          {maintenanceRequests.filter(r => r.status === 'pending').slice(0, 3).map((request) => {
            const requestTime = new Date(request.requestedAt);
            const now = new Date();
            const ageMinutes = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60));
            const ageHours = Math.floor(ageMinutes / 60);

            return (
              <div key={request.id} className="border rounded-lg p-3 mb-2 bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{request.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    request.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' :
                    request.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                    request.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {request.urgencyLevel === 'critical' ? 'Crítica' :
                     request.urgencyLevel === 'high' ? 'Alta' :
                     request.urgencyLevel === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{request.machineName}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Por: {request.operatorName}</span>
                  <span>Há {ageHours > 0 ? `${ageHours}h` : `${ageMinutes}min`}</span>
                </div>
              </div>
            );
          })}

          {maintenanceRequests.filter(r => r.status === 'pending').length === 0 && (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Popup for Backend Team */}
      <MaintenancePopupContainer onRequestUpdate={loadData} />
    </div>
  );
}
