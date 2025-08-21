import { useState } from "react";
import { 
  Factory, 
  Play, 
  Pause, 
  Square, 
  Plus,
  Search,
  Filter,
  BarChart3,
  Target,
  Clock,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Edit,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BackToOperatorButton } from '@/components/BackToOperatorButton';
import { useLocation } from 'react-router-dom';

interface ProductionOrder {
  id: string;
  orderNumber: string;
  product: string;
  customer: string;
  quantity: number;
  produced: number;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  dueDate: string;
  estimatedTime: number;
  actualTime?: number;
  line: string;
  operator: string;
  shift: string;
}

interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'maintenance';
  currentOrder?: string;
  efficiency: number;
  target: number;
  actual: number;
  operator: string;
  shift: string;
}

const productionOrders: ProductionOrder[] = [
  {
    id: "1",
    orderNumber: "OP-2024-001",
    product: "Componente A-150",
    customer: "Cliente ABC Ltda",
    quantity: 500,
    produced: 345,
    status: "in_progress",
    priority: "high",
    startDate: "2024-01-22T08:00",
    dueDate: "2024-01-25T17:00",
    estimatedTime: 12,
    actualTime: 8.5,
    line: "Linha 1",
    operator: "João Silva",
    shift: "Manhã"
  },
  {
    id: "2",
    orderNumber: "OP-2024-002",
    product: "Peça B-200",
    customer: "Empresa XYZ S.A.",
    quantity: 800,
    produced: 800,
    status: "completed",
    priority: "medium",
    startDate: "2024-01-20T08:00",
    dueDate: "2024-01-22T17:00",
    estimatedTime: 16,
    actualTime: 15.5,
    line: "Linha 2",
    operator: "Maria Santos",
    shift: "Tarde"
  },
  {
    id: "3",
    orderNumber: "OP-2024-003",
    product: "Conjunto C-100",
    customer: "Indústria DEF",
    quantity: 300,
    produced: 0,
    status: "pending",
    priority: "urgent",
    startDate: "2024-01-25T08:00",
    dueDate: "2024-01-26T17:00",
    estimatedTime: 8,
    line: "Linha 3",
    operator: "Pedro Costa",
    shift: "Manhã"
  },
  {
    id: "4",
    orderNumber: "OP-2024-004",
    product: "Módulo D-250",
    customer: "Tech Solutions",
    quantity: 150,
    produced: 75,
    status: "paused",
    priority: "low",
    startDate: "2024-01-23T14:00",
    dueDate: "2024-01-28T17:00",
    estimatedTime: 6,
    actualTime: 3,
    line: "Linha 1",
    operator: "Ana Oliveira",
    shift: "Tarde"
  }
];

const productionLines: ProductionLine[] = [
  {
    id: "1",
    name: "Linha de Montagem 1",
    status: "running",
    currentOrder: "OP-2024-001",
    efficiency: 92,
    target: 50,
    actual: 46,
    operator: "João Silva",
    shift: "Manhã"
  },
  {
    id: "2",
    name: "Linha de Montagem 2",
    status: "running",
    currentOrder: "OP-2024-002",
    efficiency: 87,
    target: 40,
    actual: 35,
    operator: "Maria Santos",
    shift: "Tarde"
  },
  {
    id: "3",
    name: "Linha de Montagem 3",
    status: "stopped",
    efficiency: 0,
    target: 45,
    actual: 0,
    operator: "Pedro Costa",
    shift: "Manhã"
  }
];

const hourlyProduction = [
  { hour: '08:00', target: 50, actual: 48, line1: 20, line2: 18, line3: 10 },
  { hour: '09:00', target: 50, actual: 52, line1: 22, line2: 20, line3: 10 },
  { hour: '10:00', target: 50, actual: 49, line1: 21, line2: 19, line3: 9 },
  { hour: '11:00', target: 50, actual: 51, line1: 23, line2: 18, line3: 10 },
  { hour: '12:00', target: 50, actual: 45, line1: 19, line2: 16, line3: 10 },
  { hour: '13:00', target: 50, actual: 53, line1: 24, line2: 19, line3: 10 },
  { hour: '14:00', target: 50, actual: 47, line1: 20, line2: 17, line3: 10 },
  { hour: '15:00', target: 50, actual: 50, line1: 22, line2: 18, line3: 10 }
];

const statusConfig = {
  pending: { color: "text-muted-foreground bg-muted", label: "Pendente" },
  in_progress: { color: "text-info bg-info/10", label: "Em Produção" },
  completed: { color: "text-success bg-success/10", label: "Concluída" },
  paused: { color: "text-warning bg-warning/10", label: "Pausada" }
};

const priorityConfig = {
  low: { color: "text-success bg-success/10", label: "Baixa" },
  medium: { color: "text-warning bg-warning/10", label: "Média" },
  high: { color: "text-info bg-info/10", label: "Alta" },
  urgent: { color: "text-destructive bg-destructive/10", label: "Urgente" }
};

const lineStatusConfig = {
  running: { color: "text-success", bg: "bg-success/10", label: "Operando" },
  stopped: { color: "text-destructive", bg: "bg-destructive/10", label: "Parada" },
  maintenance: { color: "text-warning", bg: "bg-warning/10", label: "Manutenção" }
};

export default function Production() {
  const location = useLocation();
  const fromOperator = location.search.includes('from=operator');
  const [activeTab, setActiveTab] = useState<'orders' | 'lines'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredOrders = productionOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalOrders = productionOrders.length;
  const completedOrders = productionOrders.filter(o => o.status === 'completed').length;
  const inProgressOrders = productionOrders.filter(o => o.status === 'in_progress').length;
  const pendingOrders = productionOrders.filter(o => o.status === 'pending').length;

  const totalProduced = productionOrders.reduce((sum, order) => sum + order.produced, 0);
  const totalTarget = productionOrders.reduce((sum, order) => sum + order.quantity, 0);
  const overallEfficiency = totalTarget > 0 ? (totalProduced / totalTarget) * 100 : 0;

  const runningLines = productionLines.filter(l => l.status === 'running').length;
  const avgLineEfficiency = productionLines.reduce((sum, line) => sum + line.efficiency, 0) / productionLines.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Produção</h1>
          <p className="text-muted-foreground">
            Gestão de ordens de produção e linhas de fabricação
          </p>
        </div>
        
        <button
          onClick={() => alert('Formulário de nova ordem de produção em desenvolvimento')}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Ordem de Produção
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Ordens</p>
              <p className="text-2xl font-bold text-card-foreground">{totalOrders}</p>
            </div>
            <Factory className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Produção</p>
              <p className="text-2xl font-bold text-info">{inProgressOrders}</p>
            </div>
            <Play className="h-6 w-6 text-info" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
              <p className="text-2xl font-bold text-success">{completedOrders}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-warning">{pendingOrders}</p>
            </div>
            <Clock className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linhas Ativas</p>
              <p className="text-2xl font-bold text-card-foreground">{runningLines}/{productionLines.length}</p>
            </div>
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Eficiência</p>
              <p className="text-2xl font-bold text-card-foreground">{overallEfficiency.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </div>
      </div>

      {/* Production Chart */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Produção por Hora - Hoje</h3>
          <p className="text-sm text-muted-foreground">Comparativo entre meta e produção real</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyProduction}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="hour" 
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
                dataKey="target" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Meta"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                name="Real"
              />
              <Line 
                type="monotone" 
                dataKey="line1" 
                stroke="hsl(var(--success))" 
                strokeWidth={1}
                dot={false}
                name="Linha 1"
              />
              <Line 
                type="monotone" 
                dataKey="line2" 
                stroke="hsl(var(--info))" 
                strokeWidth={1}
                dot={false}
                name="Linha 2"
              />
              <Line 
                type="monotone" 
                dataKey="line3" 
                stroke="hsl(var(--warning))" 
                strokeWidth={1}
                dot={false}
                name="Linha 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'orders'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ordens de Produção ({productionOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'lines'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Linhas de Produção ({productionLines.length})
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-80 rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Produção</option>
              <option value="completed">Concluída</option>
              <option value="paused">Pausada</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'orders' ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ordem</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Produto</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Progresso</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prazo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const progress = (order.produced / order.quantity) * 100;
                  const isLate = new Date(order.dueDate) < new Date() && order.status !== 'completed';
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{order.line}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-card-foreground">{order.product}</p>
                        <p className="text-sm text-muted-foreground">{order.quantity} unidades</p>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{order.customer}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{order.produced}/{order.quantity}</span>
                            <span className="font-medium text-card-foreground">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-all",
                                progress === 100 ? "bg-success" : progress > 75 ? "bg-info" : progress > 50 ? "bg-warning" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", statusConfig[order.status].color)}>
                          {statusConfig[order.status].label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", priorityConfig[order.priority].color)}>
                          {priorityConfig[order.priority].label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className={cn("text-sm", isLate && "text-destructive")}>
                          <p>{new Date(order.dueDate).toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => alert(`Iniciando produção da ordem ${order.orderNumber}`)}
                              className="p-1 text-success hover:bg-success/10 rounded"
                              title="Iniciar produção"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'in_progress' && (
                            <button
                              onClick={() => alert(`Pausando produção da ordem ${order.orderNumber}`)}
                              className="p-1 text-warning hover:bg-warning/10 rounded"
                              title="Pausar produção"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => alert(`Editando ordem ${order.orderNumber}`)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Editar ordem"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => alert(`Mais opções para ${order.orderNumber}`)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Mais opções"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {productionLines.map((line) => {
            const currentOrder = productionOrders.find(o => o.orderNumber === line.currentOrder);
            const efficiency = line.actual > 0 ? (line.actual / line.target) * 100 : 0;
            
            return (
              <div key={line.id} className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">{line.name}</h3>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", lineStatusConfig[line.status].bg, lineStatusConfig[line.status].color)}>
                      {lineStatusConfig[line.status].label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => alert(`Iniciando ${line.name}`)}
                      className="p-2 text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg"
                      title="Iniciar linha"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => alert(`Pausando ${line.name}`)}
                      className="p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg"
                      title="Pausar linha"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => alert(`Parando ${line.name}`)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      title="Parar linha"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {currentOrder && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium text-card-foreground">{currentOrder.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{currentOrder.product}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{currentOrder.produced}/{currentOrder.quantity}</span>
                        <span className="font-medium text-card-foreground">
                          {((currentOrder.produced / currentOrder.quantity) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min((currentOrder.produced / currentOrder.quantity) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Produção/Hora</span>
                    <span className="text-sm font-medium text-card-foreground">{line.actual}/{line.target}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Eficiência</span>
                    <span className={cn(
                      "text-sm font-medium",
                      efficiency >= 90 ? "text-success" : efficiency >= 75 ? "text-warning" : "text-destructive"
                    )}>
                      {efficiency.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Operador</span>
                    <span className="text-sm font-medium text-card-foreground">{line.operator}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Turno</span>
                    <span className="text-sm font-medium text-card-foreground">{line.shift}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
