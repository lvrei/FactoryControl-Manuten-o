import { useState } from "react";
import { 
  AlertTriangle, 
  Bell, 
  Clock, 
  CheckCircle,
  XCircle,
  Zap,
  Thermometer,
  Activity,
  Users,
  Package,
  Factory,
  Shield,
  Search,
  Filter,
  Eye,
  EyeOff,
  MoreVertical,
  Settings,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maintenanceService } from '@/services/maintenanceService';
import { MaintenanceRequest, MaintenanceAlert, MachineDowntime } from '@/types/production';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'equipment' | 'production' | 'quality' | 'safety' | 'maintenance' | 'system';
  source: string;
  timestamp: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  estimatedResolution?: string;
  actualResolution?: string;
  impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  details: {
    currentValue?: string;
    threshold?: string;
    equipment?: string;
    location?: string;
  };
}

interface NotificationRule {
  id: string;
  name: string;
  category: string;
  condition: string;
  threshold: string;
  recipients: string[];
  methods: ('email' | 'sms' | 'dashboard')[];
  active: boolean;
}

// Dados limpos - sem alertas fictícios de máquinas inexistentes
const alerts: Alert[] = [];

const notificationRules: NotificationRule[] = [
  {
    id: "1",
    name: "Temperatura Crítica",
    category: "equipment",
    condition: "Temperatura > Limite",
    threshold: "900°C",
    recipients: ["pedro.costa@empresa.com", "supervisor@empresa.com"],
    methods: ["email", "sms", "dashboard"],
    active: true
  },
  {
    id: "2",
    name: "Eficiência Baixa",
    category: "production",
    condition: "Eficiência < Meta",
    threshold: "85%",
    recipients: ["ana.oliveira@empresa.com"],
    methods: ["email", "dashboard"],
    active: true
  },
  {
    id: "3",
    name: "Manutenção Vencida",
    category: "maintenance",
    condition: "Data Vencimento",
    threshold: "0 dias",
    recipients: ["manutencao@empresa.com"],
    methods: ["email"],
    active: true
  }
];

const alertStats = [
  { type: 'Críticos', count: 0, change: 0, color: 'hsl(var(--destructive))' },
  { type: 'Avisos', count: 0, change: 0, color: 'hsl(var(--warning))' },
  { type: 'Resolvidos', count: 0, change: 0, color: 'hsl(var(--success))' },
  { type: 'Novos', count: 0, change: 0, color: 'hsl(var(--info))' }
];

const alertTrend = [
  { day: 'Seg', critical: 0, warning: 0, info: 0 },
  { day: 'Ter', critical: 0, warning: 0, info: 0 },
  { day: 'Qua', critical: 0, warning: 0, info: 0 },
  { day: 'Qui', critical: 0, warning: 0, info: 0 },
  { day: 'Sex', critical: 0, warning: 0, info: 0 },
  { day: 'Sab', critical: 0, warning: 0, info: 0 },
  { day: 'Dom', critical: 0, warning: 0, info: 0 }
];

const typeConfig = {
  critical: { color: "text-destructive bg-destructive/10", label: "Crítico", icon: XCircle },
  warning: { color: "text-warning bg-warning/10", label: "Aviso", icon: AlertTriangle },
  info: { color: "text-info bg-info/10", label: "Informação", icon: Bell },
  success: { color: "text-success bg-success/10", label: "Sucesso", icon: CheckCircle }
};

const statusConfig = {
  new: { color: "text-destructive bg-destructive/10", label: "Novo" },
  acknowledged: { color: "text-warning bg-warning/10", label: "Reconhecido" },
  resolved: { color: "text-success bg-success/10", label: "Resolvido" },
  dismissed: { color: "text-muted-foreground bg-muted", label: "Dispensado" }
};

const categoryConfig = {
  equipment: { icon: Factory, label: "Equipamento" },
  production: { icon: Package, label: "Produção" },
  quality: { icon: Shield, label: "Qualidade" },
  safety: { icon: Users, label: "Segurança" },
  maintenance: { icon: Settings, label: "Manutenção" },
  system: { icon: Activity, label: "Sistema" }
};

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--info))'];

export default function Alerts() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'analytics'>('alerts');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAlerts = alerts.length;
  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Alertas</h1>
          <p className="text-muted-foreground">
            Monitoramento e gestão de alertas do sistema
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => alert('Configuração de regras de notificação em desenvolvimento')}
            className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/90 flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurar Regras
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">{totalAlerts}</p>
            </div>
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Novos</p>
              <p className="text-2xl font-bold text-destructive">{newAlerts}</p>
            </div>
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Críticos</p>
              <p className="text-2xl font-bold text-destructive">{criticalAlerts}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
              <p className="text-2xl font-bold text-warning">{acknowledgedAlerts}</p>
            </div>
            <Eye className="h-6 w-6 text-warning" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'alerts'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Alertas ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'analytics'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análises
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'rules'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Regras ({notificationRules.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'alerts' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">Lista de Alertas</h3>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar alertas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">Todos</option>
                    <option value="new">Novo</option>
                    <option value="acknowledged">Reconhecido</option>
                    <option value="resolved">Resolvido</option>
                    <option value="dismissed">Dispensado</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">Todos tipos</option>
                    <option value="critical">Crítico</option>
                    <option value="warning">Aviso</option>
                    <option value="info">Informação</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredAlerts.map((alert) => {
                  const typeConf = typeConfig[alert.type];
                  const statusConf = statusConfig[alert.status];
                  const categoryConf = categoryConfig[alert.category];
                  const TypeIcon = typeConf.icon;
                  const CategoryIcon = categoryConf.icon;
                  
                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={cn(
                        "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedAlert?.id === alert.id && "bg-muted/50",
                        alert.status === 'new' && "border-l-4 border-l-destructive"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn("p-1 rounded", typeConf.color)}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-card-foreground">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", statusConf.color)}>
                            {statusConf.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{categoryConf.label}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{alert.source}</span>
                        </div>
                        {alert.assignedTo && (
                          <span className="text-muted-foreground">
                            Atribuído: {alert.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alert Details */}
          <div className="lg:col-span-1">
            {selectedAlert ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">Detalhes do Alerta</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert(`Visualizando detalhes do alerta ${selectedAlert.title}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => alert(`Mais opções para alerta ${selectedAlert.title}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border", typeConfig[selectedAlert.type].color)}>
                        {(() => {
                          const AlertIcon = typeConfig[selectedAlert.type].icon;
                          return <AlertIcon className="h-4 w-4" />;
                        })()}
                        <span className="font-medium">{selectedAlert.title}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={cn("font-medium", statusConfig[selectedAlert.status].color)}>
                          {statusConfig[selectedAlert.status].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria:</span>
                        <span className="font-medium text-card-foreground">
                          {categoryConfig[selectedAlert.category].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prioridade:</span>
                        <span className={cn(
                          "font-medium capitalize",
                          selectedAlert.priority === 'critical' ? "text-destructive" :
                          selectedAlert.priority === 'high' ? "text-warning" :
                          selectedAlert.priority === 'medium' ? "text-info" : "text-success"
                        )}>
                          {selectedAlert.priority}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fonte:</span>
                        <span className="font-medium text-card-foreground">{selectedAlert.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timestamp:</span>
                        <span className="font-medium text-card-foreground">
                          {new Date(selectedAlert.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {selectedAlert.assignedTo && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Atribuído:</span>
                          <span className="font-medium text-card-foreground">{selectedAlert.assignedTo}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-muted-foreground mb-2">Descrição:</p>
                      <p className="text-card-foreground">{selectedAlert.description}</p>
                    </div>

                    {Object.keys(selectedAlert.details).length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-muted-foreground mb-2">Detalhes Técnicos:</p>
                        <div className="space-y-1">
                          {selectedAlert.details.currentValue && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Valor Atual:</span>
                              <span className="font-medium text-card-foreground">{selectedAlert.details.currentValue}</span>
                            </div>
                          )}
                          {selectedAlert.details.threshold && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Limite:</span>
                              <span className="font-medium text-card-foreground">{selectedAlert.details.threshold}</span>
                            </div>
                          )}
                          {selectedAlert.details.equipment && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Equipamento:</span>
                              <span className="font-medium text-card-foreground">{selectedAlert.details.equipment}</span>
                            </div>
                          )}
                          {selectedAlert.details.location && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Localização:</span>
                              <span className="font-medium text-card-foreground">{selectedAlert.details.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    {selectedAlert.status === 'new' && (
                      <button
                        onClick={() => alert(`Reconhecendo alerta: ${selectedAlert.title}`)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-warning-foreground bg-warning rounded-lg hover:bg-warning/90"
                      >
                        Reconhecer
                      </button>
                    )}
                    {selectedAlert.status === 'acknowledged' && (
                      <button
                        onClick={() => alert(`Resolvendo alerta: ${selectedAlert.title}`)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
                      >
                        Resolver
                      </button>
                    )}
                    <button
                      onClick={() => alert(`Dispensando alerta: ${selectedAlert.title}`)}
                      className="px-3 py-2 text-sm font-medium text-muted-foreground border border-input rounded-lg hover:bg-muted"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione um Alerta</h3>
                <p className="text-muted-foreground">
                  Escolha um alerta da lista para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Alert Trend */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Tendência de Alertas</h3>
              <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
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
                  <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" name="Críticos" />
                  <Bar dataKey="warning" stackId="a" fill="hsl(var(--warning))" name="Avisos" />
                  <Bar dataKey="info" stackId="a" fill="hsl(var(--info))" name="Informações" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alert Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {alertStats.map((stat, index) => (
              <div key={index} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{stat.type}</h4>
                  <div className="flex items-center gap-1">
                    {stat.change > 0 ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : stat.change < 0 ? (
                      <TrendingDown className="h-3 w-3 text-success" />
                    ) : null}
                    <span className={cn(
                      "text-xs",
                      stat.change > 0 ? "text-destructive" : stat.change < 0 ? "text-success" : "text-muted-foreground"
                    )}>
                      {stat.change > 0 ? `+${stat.change}` : stat.change}
                    </span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-card-foreground">{stat.count}</p>
                <div className="mt-2 h-2 bg-muted rounded-full">
                  <div 
                    className="h-2 rounded-full transition-all" 
                    style={{ 
                      backgroundColor: stat.color,
                      width: `${(stat.count / Math.max(...alertStats.map(s => s.count))) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Category Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Distribuição por Categoria</h3>
              <div className="space-y-3">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const count = alerts.filter(a => a.category === key).length;
                  const percentage = (count / alerts.length) * 100;
                  const CategoryIcon = config.icon;
                  
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-card-foreground w-8">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Tempo de Resolução</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tempo Médio</span>
                  <span className="text-lg font-bold text-card-foreground">2.5h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mais Rápido</span>
                  <span className="text-sm font-medium text-success">15min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mais Lento</span>
                  <span className="text-sm font-medium text-destructive">8h</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Meta SLA</span>
                    <span className="text-sm font-medium text-warning">4h</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full w-3/4"></div>
                    </div>
                    <span className="text-xs text-success">75%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Notification Rules */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-card-foreground">Regras de Notificação</h3>
              <p className="text-sm text-muted-foreground">Configure quando e como receber alertas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Nome da Regra</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Condição</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Destinatários</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Métodos</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationRules.map((rule) => (
                    <tr key={rule.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <p className="font-medium text-card-foreground">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">{rule.condition}</p>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{rule.category}</td>
                      <td className="p-4 text-sm text-muted-foreground">{rule.threshold}</td>
                      <td className="p-4 text-sm text-muted-foreground">{rule.recipients.length} pessoas</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {rule.methods.includes('email') && <Mail className="h-4 w-4 text-muted-foreground" />}
                          {rule.methods.includes('sms') && <Phone className="h-4 w-4 text-muted-foreground" />}
                          {rule.methods.includes('dashboard') && <Bell className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                          rule.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        )}>
                          {rule.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            <Settings className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            {rule.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
