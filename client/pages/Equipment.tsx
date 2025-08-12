import { useState } from "react";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap,
  Thermometer,
  Gauge,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Square
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'running' | 'stopped' | 'maintenance' | 'warning';
  efficiency: number;
  temperature: number;
  pressure: number;
  vibration: number;
  power: number;
  speed: number;
  uptime: number;
  lastMaintenance: string;
  nextMaintenance: string;
  operator: string;
  shift: string;
}

const equipmentData: Equipment[] = [
  {
    id: "1",
    name: "Prensa Hidráulica 01",
    type: "Prensa",
    location: "Setor A - Linha 1",
    status: "running",
    efficiency: 94,
    temperature: 68,
    pressure: 150,
    vibration: 2.1,
    power: 45.8,
    speed: 1200,
    uptime: 97.8,
    lastMaintenance: "2024-01-15",
    nextMaintenance: "2024-02-15",
    operator: "João Silva",
    shift: "Manhã"
  },
  {
    id: "2",
    name: "Linha de Montagem A",
    type: "Esteira",
    location: "Setor B - Linha 2",
    status: "running",
    efficiency: 87,
    temperature: 45,
    pressure: 0,
    vibration: 1.5,
    power: 12.3,
    speed: 850,
    uptime: 89.2,
    lastMaintenance: "2024-01-10",
    nextMaintenance: "2024-01-25",
    operator: "Maria Santos",
    shift: "Manhã"
  },
  {
    id: "3",
    name: "Forno Industrial 02",
    type: "Forno",
    location: "Setor C - Tratamento",
    status: "warning",
    efficiency: 72,
    temperature: 890,
    pressure: 0,
    vibration: 0.8,
    power: 125.7,
    speed: 0,
    uptime: 75.5,
    lastMaintenance: "2024-01-08",
    nextMaintenance: "2024-01-30",
    operator: "Pedro Costa",
    shift: "Tarde"
  },
  {
    id: "4",
    name: "Robô Soldador 03",
    type: "Robô",
    location: "Setor D - Solda",
    status: "stopped",
    efficiency: 0,
    temperature: 35,
    pressure: 80,
    vibration: 0.2,
    power: 0,
    speed: 0,
    uptime: 0,
    lastMaintenance: "2024-01-20",
    nextMaintenance: "2024-02-05",
    operator: "Ana Oliveira",
    shift: "Tarde"
  },
  {
    id: "5",
    name: "Compressor Principal",
    type: "Compressor",
    location: "Setor E - Utilidades",
    status: "running",
    efficiency: 91,
    temperature: 78,
    pressure: 200,
    vibration: 3.2,
    power: 67.4,
    speed: 1800,
    uptime: 94.1,
    lastMaintenance: "2024-01-12",
    nextMaintenance: "2024-02-12",
    operator: "Carlos Lima",
    shift: "Noite"
  },
  {
    id: "6",
    name: "Sistema de Pintura",
    type: "Cabine",
    location: "Setor F - Acabamento",
    status: "maintenance",
    efficiency: 0,
    temperature: 22,
    pressure: 45,
    vibration: 0,
    power: 0,
    speed: 0,
    uptime: 0,
    lastMaintenance: "2024-01-22",
    nextMaintenance: "2024-01-25",
    operator: "Lucia Ferreira",
    shift: "Manhã"
  }
];

const statusConfig = {
  running: { 
    icon: CheckCircle, 
    color: "text-success", 
    bg: "bg-success/10 border-success/20", 
    label: "Operando",
    dot: "bg-success"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "text-warning", 
    bg: "bg-warning/10 border-warning/20", 
    label: "Atenção",
    dot: "bg-warning"
  },
  maintenance: { 
    icon: Clock, 
    color: "text-info", 
    bg: "bg-info/10 border-info/20", 
    label: "Manutenção",
    dot: "bg-info"
  },
  stopped: { 
    icon: Square, 
    color: "text-destructive", 
    bg: "bg-destructive/10 border-destructive/20", 
    label: "Parado",
    dot: "bg-destructive"
  }
};

export default function Equipment() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(equipmentData[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredEquipment = equipmentData.filter(equipment => {
    const matchesSearch = equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         equipment.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || equipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const runningCount = equipmentData.filter(e => e.status === 'running').length;
  const maintenanceCount = equipmentData.filter(e => e.status === 'maintenance').length;
  const stoppedCount = equipmentData.filter(e => e.status === 'stopped').length;
  const warningCount = equipmentData.filter(e => e.status === 'warning').length;

  const avgEfficiency = equipmentData.reduce((sum, e) => sum + e.efficiency, 0) / equipmentData.length;
  const avgUptime = equipmentData.reduce((sum, e) => sum + e.uptime, 0) / equipmentData.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gestão de Equipamentos</h1>
        <p className="text-muted-foreground">
          Monitoramento em tempo real de máquinas e equipamentos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">{equipmentData.length}</p>
            </div>
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Operando</p>
              <p className="text-2xl font-bold text-success">{runningCount}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Atenção</p>
              <p className="text-2xl font-bold text-warning">{warningCount}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Manutenção</p>
              <p className="text-2xl font-bold text-info">{maintenanceCount}</p>
            </div>
            <Clock className="h-6 w-6 text-info" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Parados</p>
              <p className="text-2xl font-bold text-destructive">{stoppedCount}</p>
            </div>
            <Square className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Eficiência</p>
              <p className="text-2xl font-bold text-card-foreground">{avgEfficiency.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Equipment List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">Equipamentos</h3>
                <div className="flex gap-2">
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg">
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar equipamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Todos os status</option>
                  <option value="running">Operando</option>
                  <option value="warning">Atenção</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="stopped">Parados</option>
                </select>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredEquipment.map((equipment) => {
                const config = statusConfig[equipment.status];
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={equipment.id}
                    onClick={() => setSelectedEquipment(equipment)}
                    className={cn(
                      "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedEquipment?.id === equipment.id && "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full", config.dot)}></div>
                        <div>
                          <p className="font-medium text-card-foreground">{equipment.name}</p>
                          <p className="text-sm text-muted-foreground">{equipment.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-card-foreground">{equipment.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">Eficiência</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Equipment Details */}
        <div className="lg:col-span-2">
          {selectedEquipment ? (
            <div className="space-y-6">
              {/* Equipment Header */}
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-card-foreground">{selectedEquipment.name}</h2>
                    <p className="text-muted-foreground">{selectedEquipment.type} • {selectedEquipment.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert(`Iniciando ${selectedEquipment.name}`)}
                      className="p-2 text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg"
                      title="Iniciar equipamento"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => alert(`Pausando ${selectedEquipment.name}`)}
                      className="p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg"
                      title="Pausar equipamento"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => alert(`Opções para ${selectedEquipment.name}`)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                      title="Mais opções"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border", statusConfig[selectedEquipment.status].bg)}>
                    {(() => {
                      const StatusIcon = statusConfig[selectedEquipment.status].icon;
                      return <StatusIcon className={cn("h-4 w-4", statusConfig[selectedEquipment.status].color)} />;
                    })()}
                    <span className={cn("text-sm font-medium", statusConfig[selectedEquipment.status].color)}>
                      {statusConfig[selectedEquipment.status].label}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Operador: <span className="font-medium text-card-foreground">{selectedEquipment.operator}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Turno: <span className="font-medium text-card-foreground">{selectedEquipment.shift}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Eficiência</p>
                      <p className="text-2xl font-bold text-card-foreground">{selectedEquipment.efficiency}%</p>
                      <div className="flex items-center gap-1 mt-1">
                        {selectedEquipment.efficiency > 90 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className="text-xs text-muted-foreground">vs último mês</span>
                      </div>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold text-card-foreground">{selectedEquipment.uptime}%</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-success h-2 rounded-full transition-all" 
                          style={{ width: `${selectedEquipment.uptime}%` }}
                        ></div>
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Potência</p>
                      <p className="text-2xl font-bold text-card-foreground">{selectedEquipment.power} kW</p>
                      <p className="text-xs text-muted-foreground mt-1">Consumo atual</p>
                    </div>
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Sensor Data */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold text-card-foreground mb-4">Sensores</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Thermometer className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">Temperatura</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-card-foreground">{selectedEquipment.temperature}°C</span>
                        <div className={cn(
                          "text-xs",
                          selectedEquipment.temperature > 100 ? "text-destructive" : 
                          selectedEquipment.temperature > 80 ? "text-warning" : "text-success"
                        )}>
                          {selectedEquipment.temperature > 100 ? "Alto" : 
                           selectedEquipment.temperature > 80 ? "Elevado" : "Normal"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Gauge className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">Pressão</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-card-foreground">{selectedEquipment.pressure} PSI</span>
                        <div className="text-xs text-success">Normal</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">Vibração</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-card-foreground">{selectedEquipment.vibration} mm/s</span>
                        <div className={cn(
                          "text-xs",
                          selectedEquipment.vibration > 3 ? "text-destructive" : 
                          selectedEquipment.vibration > 2 ? "text-warning" : "text-success"
                        )}>
                          {selectedEquipment.vibration > 3 ? "Alto" : 
                           selectedEquipment.vibration > 2 ? "Elevado" : "Normal"}
                        </div>
                      </div>
                    </div>

                    {selectedEquipment.speed > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium text-card-foreground">Velocidade</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-card-foreground">{selectedEquipment.speed} RPM</span>
                          <div className="text-xs text-success">Normal</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="text-lg font-semibold text-card-foreground mb-4">Manutenção</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Última Manutenção</span>
                      <span className="text-sm text-card-foreground">
                        {new Date(selectedEquipment.lastMaintenance).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Próxima Manutenção</span>
                      <span className="text-sm text-card-foreground">
                        {new Date(selectedEquipment.nextMaintenance).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Dias Restantes</span>
                      <span className="text-sm font-medium text-warning">
                        {Math.ceil((new Date(selectedEquipment.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                      </span>
                    </div>
                    <div className="pt-2">
                      <button className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90">
                        Agendar Manutenção
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione um Equipamento</h3>
              <p className="text-muted-foreground">
                Escolha um equipamento da lista para ver os detalhes de monitoramento
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
