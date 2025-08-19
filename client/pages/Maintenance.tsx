import { useState, useEffect } from "react";
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
  FileText,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
// import { MachineForm, MachineData } from "@/components/maintenance/MachineForm";
import { MaintenanceForm, MaintenanceData } from "@/components/maintenance/MaintenanceForm";
import { MaintenanceReports } from "@/components/maintenance/MaintenanceReports";
import { ChecklistDL50 } from "@/components/maintenance/ChecklistDL50";
import { Machine, MaintenanceRequest } from "@/types/production";
import { productionService } from "@/services/productionService";
import { maintenanceService } from "@/services/maintenanceService";

// Dados limpos - apenas máquinas reais de corte de espuma
const mockMachines: MachineData[] = [];

const mockMaintenances: MaintenanceData[] = [];

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
  const [machines, setMachines] = useState<Machine[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [activeTab, setActiveTab] = useState<'machines' | 'maintenance'>('maintenance');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceData | null>(null);
  const [selectedEquipmentForChecklist, setSelectedEquipmentForChecklist] = useState<Machine | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load data from localStorage and equipment from productionService
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load machines from production service
        const equipmentData = await productionService.getMachines();
        setMachines(equipmentData);

        // Load maintenances from localStorage
        const savedMaintenances = localStorage.getItem('factorycontrol-maintenances');
        if (savedMaintenances) {
          try {
            setMaintenances(JSON.parse(savedMaintenances));
          } catch (error) {
            console.error('Error loading saved maintenances:', error);
            setMaintenances(mockMaintenances);
          }
        } else {
          setMaintenances(mockMaintenances);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save maintenances to localStorage whenever it changes
  useEffect(() => {
    if (maintenances.length > 0 || localStorage.getItem('factorycontrol-maintenances')) {
      localStorage.setItem('factorycontrol-maintenances', JSON.stringify(maintenances));
    }
  }, [maintenances]);

  // Machine management is handled in Equipment page

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

  // Machine editing is handled in Equipment page

  const handleEditMaintenance = (maintenance: MaintenanceData) => {
    setEditingMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const handleDeleteMaintenance = (maintenance: MaintenanceData) => {
    if (confirm(`Tem certeza que deseja excluir a manutenção "${maintenance.description}" da máquina ${maintenance.machineName}?`)) {
      setMaintenances(prev => prev.filter(m => m.id !== maintenance.id));
    }
  };

  const resetAllMaintenances = () => {
    if (confirm('Tem certeza que deseja restaurar todas as manutenções? Esta ação não pode ser desfeita.')) {
      localStorage.removeItem('factorycontrol-maintenances');
      setMaintenances(mockMaintenances);
    }
  };

  // Machines are now managed in Equipment page

  const filteredMaintenances = maintenances.filter(maintenance => {
    const matchesSearch = maintenance.machineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         maintenance.description.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      const now = new Date();
      matchesStatus = maintenance.status === 'scheduled' && new Date(maintenance.scheduledDate) < now;
    } else if (statusFilter !== 'all') {
      matchesStatus = maintenance.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Manutenção</h1>
          <p className="text-muted-foreground">
            Programação de manutenções para equipamentos registados
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowMaintenanceForm(true)}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Nova Manutenção
          </button>
          <button
            type="button"
            onClick={() => setShowReports(true)}
            className="px-4 py-2 text-sm font-medium text-info-foreground bg-info rounded-lg hover:bg-info/90 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Gerar Relatório
          </button>
          <button
            type="button"
            onClick={() => setShowChecklist(true)}
            className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Checklist DL50
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 text-sm font-medium text-muted-foreground border border-input rounded-lg hover:bg-muted flex items-center gap-2"
            title="Limpar dados salvos e recarregar"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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

        <div
          className="rounded-lg border bg-card p-6 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            setActiveTab('maintenance');
            setStatusFilter('overdue');
          }}
          title="Clique para ver manutenções em atraso"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Por Cumprir</p>
              <p className="text-2xl font-bold text-warning">
                {(() => {
                  const now = new Date();
                  // Contar apenas manutenções agendadas em atraso
                  const overdueMaintences = maintenances.filter(m =>
                    m.status === 'scheduled' &&
                    new Date(m.scheduledDate) < now
                  ).length;

                  // Contar máquinas que precisam de manutenção mas não têm manutenção agendada
                  const machinesNeedingMaintenance = machines.filter(m => {
                    const needsMaintenance = new Date(m.nextMaintenanceDate) < now;
                    const hasScheduledMaintenance = maintenances.some(maintenance =>
                      maintenance.machineId === m.id && maintenance.status === 'scheduled'
                    );
                    return needsMaintenance && !hasScheduledMaintenance;
                  }).length;

                  return overdueMaintences + machinesNeedingMaintenance;
                })()}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning" />
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

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Manutenções Programadas ({maintenances.length})
          </h2>
          <span className="text-sm text-muted-foreground">
            Equipamentos disponíveis: {machines.length} •
            Gerir equipamentos em <a href="/equipment" className="text-primary hover:underline">Equipamentos</a>
          </span>
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

          {activeTab === 'maintenance' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os status</option>
              <option value="scheduled">Agendadas</option>
              <option value="overdue">Por Cumprir</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados de manutenção...</p>
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
                  const isOverdue = maintenance.status === 'scheduled' && new Date(maintenance.scheduledDate) < new Date();

                  return (
                    <tr
                      key={maintenance.id}
                      className={cn(
                        "border-b hover:bg-muted/50",
                        isOverdue && "border-l-4 border-l-warning bg-warning/5"
                      )}
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">{maintenance.machineName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground line-clamp-1">{maintenance.description}</p>
                            {maintenance.photos && maintenance.photos.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-info/10 text-info text-xs">
                                <Camera className="h-3 w-3" />
                                {maintenance.photos.length}
                              </span>
                            )}
                          </div>
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
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm", isOverdue ? "text-warning font-medium" : "text-muted-foreground")}>
                            {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                          </span>
                          {isOverdue && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
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
                            onClick={() => handleDeleteMaintenance(maintenance)}
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
        onClose={() => {
          setShowReports(false);
          setSelectedEquipment('all');
        }}
        machines={machines.map(m => ({ id: m.id!, name: m.name }))}
        initialEquipment={selectedEquipment}
      />

      <ChecklistDL50
        isOpen={showChecklist}
        onClose={() => {
          setShowChecklist(false);
          setSelectedEquipmentForChecklist(undefined);
        }}
        equipmentData={selectedEquipmentForChecklist ? {
          id: selectedEquipmentForChecklist.id!,
          name: selectedEquipmentForChecklist.name,
          model: 'N/A',
          serialNumber: 'N/A',
          location: 'Ver em Equipamentos'
        } : undefined}
      />
    </div>
  );
}
