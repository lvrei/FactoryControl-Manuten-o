import { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Target,
  BarChart3,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Factory,
  Users,
  Package,
  Zap,
  Edit,
  MoreVertical,
  FileText,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface ProductionPlan {
  id: string;
  planNumber: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  totalOrders: number;
  completedOrders: number;
  totalQuantity: number;
  producedQuantity: number;
  efficiency: number;
  orders: PlannedOrder[];
}

interface PlannedOrder {
  id: string;
  orderNumber: string;
  product: string;
  customer: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedLine: string;
  estimatedDuration: number;
  status: 'planned' | 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  dependencies: string[];
  materials: Material[];
}

interface Material {
  id: string;
  name: string;
  requiredQuantity: number;
  availableQuantity: number;
  unit: string;
  supplier: string;
  leadTime: number;
}

interface ResourceCapacity {
  resource: string;
  type: 'line' | 'equipment' | 'staff';
  capacity: number;
  allocated: number;
  available: number;
  utilization: number;
}

const productionPlans: ProductionPlan[] = [
  {
    id: "1",
    planNumber: "PP-2024-001",
    period: "Janeiro 2024",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    status: "active",
    totalOrders: 12,
    completedOrders: 8,
    totalQuantity: 2500,
    producedQuantity: 1850,
    efficiency: 74,
    orders: [
      {
        id: "1",
        orderNumber: "OP-2024-001",
        product: "Componente A-150",
        customer: "Cliente ABC",
        quantity: 500,
        priority: "high",
        plannedStartDate: "2024-01-15T08:00",
        plannedEndDate: "2024-01-20T17:00",
        actualStartDate: "2024-01-15T08:00",
        assignedLine: "Linha 1",
        estimatedDuration: 40,
        status: "completed",
        dependencies: [],
        materials: [
          { id: "1", name: "Matéria Prima A", requiredQuantity: 100, availableQuantity: 120, unit: "kg", supplier: "Fornecedor 1", leadTime: 5 },
          { id: "2", name: "Componente B", requiredQuantity: 500, availableQuantity: 480, unit: "pç", supplier: "Fornecedor 2", leadTime: 3 }
        ]
      }
    ]
  },
  {
    id: "2",
    planNumber: "PP-2024-002",
    period: "Fevereiro 2024",
    startDate: "2024-02-01",
    endDate: "2024-02-29",
    status: "draft",
    totalOrders: 15,
    completedOrders: 0,
    totalQuantity: 3200,
    producedQuantity: 0,
    efficiency: 0,
    orders: []
  }
];

const resourceCapacity: ResourceCapacity[] = [
  { resource: "Linha 1", type: "line", capacity: 100, allocated: 85, available: 15, utilization: 85 },
  { resource: "Linha 2", type: "line", capacity: 80, allocated: 70, available: 10, utilization: 87.5 },
  { resource: "Linha 3", type: "line", capacity: 90, allocated: 60, available: 30, utilization: 66.7 },
  { resource: "Equipe A", type: "staff", capacity: 20, allocated: 18, available: 2, utilization: 90 },
  { resource: "Equipe B", type: "staff", capacity: 15, allocated: 12, available: 3, utilization: 80 },
  { resource: "Prensa 1", type: "equipment", capacity: 50, allocated: 45, available: 5, utilization: 90 },
  { resource: "Prensa 2", type: "equipment", capacity: 50, allocated: 30, available: 20, utilization: 60 }
];

const capacityData = [
  { week: 'Sem 1', planned: 400, actual: 380, capacity: 450 },
  { week: 'Sem 2', planned: 420, actual: 410, capacity: 450 },
  { week: 'Sem 3', planned: 450, actual: 430, capacity: 450 },
  { week: 'Sem 4', planned: 380, actual: 360, capacity: 450 },
  { week: 'Sem 5', planned: 440, actual: 425, capacity: 450 }
];

const demandForecast = [
  { month: 'Jan', demand: 2500, capacity: 2800, gap: 300 },
  { month: 'Fev', demand: 3200, capacity: 2800, gap: -400 },
  { month: 'Mar', demand: 2800, capacity: 2800, gap: 0 },
  { month: 'Abr', demand: 3500, capacity: 3000, gap: -500 },
  { month: 'Mai', demand: 3000, capacity: 3000, gap: 0 },
  { month: 'Jun', demand: 2600, capacity: 3000, gap: 400 }
];

const statusConfig = {
  draft: { color: "text-muted-foreground bg-muted", label: "Rascunho", icon: FileText },
  approved: { color: "text-info bg-info/10", label: "Aprovado", icon: CheckCircle },
  active: { color: "text-success bg-success/10", label: "Ativo", icon: Play },
  completed: { color: "text-success bg-success/10", label: "Concluído", icon: CheckCircle }
};

const orderStatusConfig = {
  planned: { color: "text-muted-foreground bg-muted", label: "Planejado" },
  scheduled: { color: "text-info bg-info/10", label: "Agendado" },
  in_progress: { color: "text-warning bg-warning/10", label: "Em Andamento" },
  completed: { color: "text-success bg-success/10", label: "Concluído" },
  delayed: { color: "text-destructive bg-destructive/10", label: "Atrasado" }
};

const priorityConfig = {
  low: { color: "text-success bg-success/10", label: "Baixa" },
  medium: { color: "text-warning bg-warning/10", label: "Média" },
  high: { color: "text-info bg-info/10", label: "Alta" },
  urgent: { color: "text-destructive bg-destructive/10", label: "Urgente" }
};

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export default function Planning() {
  const [activeTab, setActiveTab] = useState<'plans' | 'capacity' | 'forecast'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(productionPlans[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlans = productionPlans.filter(plan =>
    plan.planNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPlans = productionPlans.length;
  const activePlans = productionPlans.filter(p => p.status === 'active').length;
  const draftPlans = productionPlans.filter(p => p.status === 'draft').length;
  const completedPlans = productionPlans.filter(p => p.status === 'completed').length;

  const avgEfficiency = productionPlans.reduce((sum, p) => sum + p.efficiency, 0) / productionPlans.length;
  const totalCapacityUtilization = resourceCapacity.reduce((sum, r) => sum + r.utilization, 0) / resourceCapacity.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Planejamento de Produção</h1>
          <p className="text-muted-foreground">
            Planejamento de capacidade, sequenciamento e otimização
          </p>
        </div>
        
        <button
          onClick={() => alert('Formulário de novo plano de produção em desenvolvimento')}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Plano
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Planos</p>
              <p className="text-2xl font-bold text-card-foreground">{totalPlans}</p>
            </div>
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold text-success">{activePlans}</p>
            </div>
            <Play className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rascunhos</p>
              <p className="text-2xl font-bold text-warning">{draftPlans}</p>
            </div>
            <FileText className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold text-info">{completedPlans}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-info" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Eficiência</p>
              <p className="text-2xl font-bold text-card-foreground">{avgEfficiency.toFixed(1)}%</p>
            </div>
            <Target className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Utilização</p>
              <p className="text-2xl font-bold text-card-foreground">{totalCapacityUtilization.toFixed(1)}%</p>
            </div>
            <Factory className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('plans')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'plans'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Planos de Produção ({productionPlans.length})
        </button>
        <button
          onClick={() => setActiveTab('capacity')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'capacity'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análise de Capacidade
        </button>
        <button
          onClick={() => setActiveTab('forecast')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'forecast'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Previsão de Demanda
        </button>
      </div>

      {/* Content */}
      {activeTab === 'plans' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Plans List */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">Planos de Produção</h3>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar plano..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredPlans.map((plan) => {
                  const config = statusConfig[plan.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={cn(
                        "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedPlan?.id === plan.id && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-card-foreground">{plan.planNumber}</p>
                          <p className="text-sm text-muted-foreground">{plan.period}</p>
                        </div>
                        <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {plan.completedOrders}/{plan.totalOrders} ordens
                        </span>
                        <span className={cn(
                          "font-medium",
                          plan.efficiency >= 80 ? "text-success" : plan.efficiency >= 60 ? "text-warning" : "text-destructive"
                        )}>
                          {plan.efficiency}% eficiência
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Plan Details */}
          <div className="lg:col-span-2">
            {selectedPlan ? (
              <div className="space-y-6">
                {/* Plan Header */}
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-card-foreground">{selectedPlan.planNumber}</h2>
                      <p className="text-muted-foreground">{selectedPlan.period}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert(`Editando plano ${selectedPlan.planNumber}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Editar plano"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => alert(`Exportando plano ${selectedPlan.planNumber}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Baixar relatório"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => alert(`Mais opções para ${selectedPlan.planNumber}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Total de Ordens</p>
                      <p className="text-xl font-bold text-card-foreground">{selectedPlan.totalOrders}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Concluídas</p>
                      <p className="text-xl font-bold text-success">{selectedPlan.completedOrders}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Quantidade Total</p>
                      <p className="text-xl font-bold text-card-foreground">{selectedPlan.totalQuantity.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Produzido</p>
                      <p className="text-xl font-bold text-info">{selectedPlan.producedQuantity.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso do Plano</span>
                      <span className="font-medium text-card-foreground">{selectedPlan.efficiency}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={cn(
                          "h-3 rounded-full transition-all",
                          selectedPlan.efficiency >= 80 ? "bg-success" : 
                          selectedPlan.efficiency >= 60 ? "bg-warning" : "bg-destructive"
                        )}
                        style={{ width: `${Math.min(selectedPlan.efficiency, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-card-foreground">Ordens do Plano</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="text-left p-4 font-medium text-muted-foreground">Ordem</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Produto</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Quantidade</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 font-medium text-muted-foreground">Linha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPlan.orders.length > 0 ? selectedPlan.orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">
                              <p className="font-medium text-card-foreground">{order.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">{order.estimatedDuration}h estimado</p>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">{order.product}</td>
                            <td className="p-4 text-sm text-muted-foreground">{order.customer}</td>
                            <td className="p-4 text-sm text-muted-foreground">{order.quantity.toLocaleString()}</td>
                            <td className="p-4">
                              <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", priorityConfig[order.priority].color)}>
                                {priorityConfig[order.priority].label}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", orderStatusConfig[order.status].color)}>
                                {orderStatusConfig[order.status].label}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">{order.assignedLine}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              Nenhuma ordem cadastrada neste plano
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione um Plano</h3>
                <p className="text-muted-foreground">
                  Escolha um plano da lista para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'capacity' ? (
        <div className="space-y-6">
          {/* Capacity Analysis Chart */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Análise de Capacidade Semanal</h3>
              <p className="text-sm text-muted-foreground">Planejado vs Real vs Capacidade</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="week" 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="capacity" fill="hsl(var(--muted-foreground))" name="Capacidade" />
                  <Bar dataKey="planned" fill="hsl(var(--info))" name="Planejado" />
                  <Bar dataKey="actual" fill="hsl(var(--primary))" name="Real" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-card-foreground">Utilização de Recursos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Recurso</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Capacidade</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Alocado</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Disponível</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Utilização</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceCapacity.map((resource, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {resource.type === 'line' && <Factory className="h-4 w-4 text-muted-foreground" />}
                          {resource.type === 'equipment' && <Zap className="h-4 w-4 text-muted-foreground" />}
                          {resource.type === 'staff' && <Users className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium text-card-foreground">{resource.resource}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{resource.type}</td>
                      <td className="p-4 text-sm text-muted-foreground">{resource.capacity}</td>
                      <td className="p-4 text-sm text-muted-foreground">{resource.allocated}</td>
                      <td className="p-4 text-sm text-muted-foreground">{resource.available}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  resource.utilization >= 90 ? "bg-destructive" : 
                                  resource.utilization >= 75 ? "bg-warning" : "bg-success"
                                )}
                                style={{ width: `${resource.utilization}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={cn(
                            "text-sm font-medium min-w-12",
                            resource.utilization >= 90 ? "text-destructive" : 
                            resource.utilization >= 75 ? "text-warning" : "text-success"
                          )}>
                            {resource.utilization.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Demand vs Capacity */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Previsão de Demanda vs Capacidade</h3>
              <p className="text-sm text-muted-foreground">Próximos 6 meses</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demandForecast}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="capacity" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Capacidade"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="demand" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Demanda"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gap Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Análise de Lacunas</h3>
              <div className="space-y-4">
                {demandForecast.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-card-foreground">{item.month}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.demand.toLocaleString()} / {item.capacity.toLocaleString()}
                      </span>
                      <span className={cn(
                        "px-2 py-1 text-xs rounded font-medium",
                        item.gap > 0 ? "bg-success/10 text-success" : 
                        item.gap < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      )}>
                        {item.gap > 0 ? `+${item.gap}` : item.gap}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Recomendações</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-destructive/5 border-l-4 border-destructive">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Fevereiro 2024</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Déficit de 400 unidades. Considere contratar equipe adicional ou terceirizar produção.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-warning/5 border-l-4 border-warning">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-warning">Abril 2024</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Grande déficit de 500 unidades. Planeje investimento em capacidade.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-success/5 border-l-4 border-success">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Março/Maio</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Capacidade equilibrada. Ótima utilização dos recursos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
