import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Settings,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Wrench,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MachineForm, MachineData } from "@/components/maintenance/MachineForm";
import { MaintenanceForm, MaintenanceData } from "@/components/maintenance/MaintenanceForm";
import { MaintenanceReports } from "@/components/maintenance/MaintenanceReports";

const mockMachines: MachineData[] = [
  {
    id: "1",
    name: "Prensa Hidráulica 01",
    model: "HP-500X",
    manufacturer: "Bosch",
    serialNumber: "BSC123456789",
    installationDate: "2020-01-15",
    location: "Setor A - Linha 1",
    category: "Prensa Hidráulica",
    status: "operational",
    lastMaintenanceDate: "2024-01-15",
    nextMaintenanceDate: "2024-02-15",
    maintenanceInterval: 30,
    operatingHours: 8760,
    notes: "Máquina em perfeitas condições"
  },
  {
    id: "2", 
    name: "Linha de Montagem A",
    model: "LM-2000",
    manufacturer: "Siemens",
    serialNumber: "SIE987654321",
    installationDate: "2019-03-20",
    location: "Setor B - Linha 2",
    category: "Linha de Montagem",
    status: "maintenance",
    lastMaintenanceDate: "2024-01-10",
    nextMaintenanceDate: "2024-01-25",
    maintenanceInterval: 15,
    operatingHours: 12500,
    notes: "Manutenção preventiva em andamento"
  }
];

const mockMaintenances: MaintenanceData[] = [
  {
    id: "1",
    machineId: "1",
    machineName: "Prensa Hidráulica 01",
    type: "preventive",
    priority: "medium",
    status: "scheduled",
    scheduledDate: "2024-02-15T08:00",
    estimatedCost: 500,
    estimatedDuration: 4,
    description: "Troca de óleo hidráulico e inspeção geral",
    technician: "João Silva",
    parts: "Óleo hidráulico 20L, Filtros",
    notes: "Verificar vazamentos",
    createdAt: "2024-01-20"
  },
  {
    id: "2",
    machineId: "2",
    machineName: "Linha de Montagem A",
    type: "corrective",
    priority: "high",
    status: "in_progress",
    scheduledDate: "2024-01-25T14:00",
    estimatedCost: 1200,
    actualCost: 1150,
    estimatedDuration: 6,
    actualDuration: 5.5,
    description: "Reparo do sistema de esteira transportadora",
    technician: "Maria Santos",
    parts: "Motor elétrico, correia, rolamentos",
    notes: "Falha no motor principal",
    createdAt: "2024-01-24"
  }
];

const statusConfig = {
  operational: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Operacional" },
  maintenance: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Manutenção" },
  stopped: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Parada" }
};

const priorityConfig = {
  low: { color: "text-success bg-success/10", label: "Baixa" },
  medium: { color: "text-warning bg-warning/10", label: "Média" },
  high: { color: "text-info bg-info/10", label: "Alta" },
  critical: { color: "text-destructive bg-destructive/10", label: "Crítica" }
};

const maintenanceStatusConfig = {
  scheduled: { color: "text-info bg-info/10", label: "Agendada" },
  in_progress: { color: "text-warning bg-warning/10", label: "Em Andamento" },
  completed: { color: "text-success bg-success/10", label: "Concluída" },
  cancelled: { color: "text-muted-foreground bg-muted", label: "Cancelada" }
};

export default function Maintenance() {
  const [machines, setMachines] = useState<MachineData[]>(mockMachines);
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>(mockMaintenances);
  const [activeTab, setActiveTab] = useState<'machines' | 'maintenance'>('machines');
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineData | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSaveMachine = (machineData: MachineData) => {
    if (editingMachine) {
      setMachines(prev => prev.map(m => m.id === editingMachine.id ? { ...machineData, id: editingMachine.id } : m));
      setEditingMachine(null);
    } else {
      const newMachine = { ...machineData, id: Date.now().toString() };
      setMachines(prev => [...prev, newMachine]);
    }
  };

  const handleSaveMaintenance = (maintenanceData: MaintenanceData) => {
    const machine = machines.find(m => m.id === maintenanceData.machineId);
    const maintenanceWithMachineName = {
      ...maintenanceData,
      machineName: machine?.name || ''
    };

    if (editingMaintenance) {
      setMaintenances(prev => prev.map(m => 
        m.id === editingMaintenance.id ? { ...maintenanceWithMachineName, id: editingMaintenance.id } : m
      ));
      setEditingMaintenance(null);
    } else {
      const newMaintenance = { ...maintenanceWithMachineName, id: Date.now().toString() };
      setMaintenances(prev => [...prev, newMaintenance]);
    }
  };

  const handleEditMachine = (machine: MachineData) => {
    setEditingMachine(machine);
    setShowMachineForm(true);
  };

  const handleEditMaintenance = (maintenance: MaintenanceData) => {
    setEditingMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const filteredMachines = machines.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaintenances = maintenances.filter(maintenance =>
    maintenance.machineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    maintenance.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Manutenção</h1>
          <p className="text-muted-foreground">
            Controle de máquinas e programação de manutenções
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowMachineForm(true)}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Máquina
          </button>
          <button
            onClick={() => setShowMaintenanceForm(true)}
            className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/90 flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Nova Manutenção
          </button>
          <button
            onClick={() => setShowReports(true)}
            className="px-4 py-2 text-sm font-medium text-accent-foreground bg-accent rounded-lg hover:bg-accent/90 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Máquinas</p>
              <p className="text-2xl font-bold text-card-foreground">{machines.length}</p>
            </div>
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Manutenções Agendadas</p>
              <p className="text-2xl font-bold text-card-foreground">
                {maintenances.filter(m => m.status === 'scheduled').length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Manutenção</p>
              <p className="text-2xl font-bold text-card-foreground">
                {machines.filter(m => m.status === 'maintenance').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Custo Estimado</p>
              <p className="text-2xl font-bold text-card-foreground">
                € {maintenances.reduce((sum, m) => sum + m.estimatedCost, 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab('machines')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'machines'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Máquinas ({machines.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === 'maintenance'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manutenções ({maintenances.length})
          </button>
        </div>

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
      </div>

      {/* Content */}
      {activeTab === 'machines' ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Máquina</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Localização</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Próxima Manutenção</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine) => {
                  const status = statusConfig[machine.status];
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={machine.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">{machine.name}</p>
                          <p className="text-sm text-muted-foreground">{machine.manufacturer} {machine.model}</p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{machine.category}</td>
                      <td className="p-4">
                        <div className={cn("inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium", status.bg)}>
                          <StatusIcon className={cn("h-3 w-3", status.color)} />
                          <span className={status.color}>{status.label}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{machine.location}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(machine.nextMaintenanceDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMachine(machine)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir a máquina ${machine.name}?`)) {
                                alert(`Máquina ${machine.name} excluída`)
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Excluir máquina"
                          >
                            <Trash2 className="h-4 w-4" />
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
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Máquina</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Data Programada</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Custo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenances.map((maintenance) => {
                  const priority = priorityConfig[maintenance.priority];
                  const status = maintenanceStatusConfig[maintenance.status];
                  
                  return (
                    <tr key={maintenance.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">{maintenance.machineName}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{maintenance.description}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground capitalize">
                          {maintenance.type === 'preventive' ? 'Preventiva' : 
                           maintenance.type === 'corrective' ? 'Corretiva' : 'Preditiva'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", priority.color)}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        € {maintenance.estimatedCost.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMaintenance(maintenance)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir a manutenção ${maintenance.machineName}?`)) {
                                alert(`Manutenção ${maintenance.machineName} excluída`)
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Excluir manutenção"
                          >
                            <Trash2 className="h-4 w-4" />
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
      )}

      {/* Forms */}
      <MachineForm
        isOpen={showMachineForm}
        onClose={() => {
          setShowMachineForm(false);
          setEditingMachine(null);
        }}
        onSave={handleSaveMachine}
        editingMachine={editingMachine}
      />

      <MaintenanceForm
        isOpen={showMaintenanceForm}
        onClose={() => {
          setShowMaintenanceForm(false);
          setEditingMaintenance(null);
        }}
        onSave={handleSaveMaintenance}
        machines={machines.map(m => ({ id: m.id!, name: m.name }))}
        editingMaintenance={editingMaintenance}
      />

      <MaintenanceReports
        isOpen={showReports}
        onClose={() => setShowReports(false)}
      />
    </div>
  );
}
