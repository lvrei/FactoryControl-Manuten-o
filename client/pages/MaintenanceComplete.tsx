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
  Camera,
  Download,
  User,
  Factory,
  Eye,
  Euro,
  Timer,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  MaintenanceForm,
  MaintenanceData,
} from "@/components/maintenance/MaintenanceForm";
import { MaintenanceReports } from "@/components/maintenance/MaintenanceReports";
import { ChecklistDL50 } from "@/components/maintenance/ChecklistDL50";
import { Machine, MaintenanceRequest } from "@/types/production";
import { productionService } from "@/services/productionService";
import { maintenanceService } from "@/services/maintenanceService";
import { equipmentScheduleService } from "@/services/equipmentScheduleService";

const mockMachines: MaintenanceData[] = [];
const mockMaintenances: MaintenanceData[] = [];

const statusConfig = {
  operational: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    label: "Operacional",
  },
  maintenance: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Manutenção",
  },
  stopped: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Parada",
  },
};

const priorityConfig = {
  low: { color: "bg-blue-600 hover:bg-blue-700", bgGradient: "from-blue-500/10 to-cyan-500/10 border-blue-200/30", label: "Baixa" },
  medium: { color: "bg-yellow-600 hover:bg-yellow-700", bgGradient: "from-yellow-500/10 to-amber-500/10 border-yellow-200/30", label: "Média" },
  high: { color: "bg-orange-600 hover:bg-orange-700", bgGradient: "from-orange-500/10 to-amber-500/10 border-orange-200/30", label: "Alta" },
  critical: { color: "bg-red-600 hover:bg-red-700", bgGradient: "from-red-500/10 to-rose-500/10 border-red-200/30", label: "Crítica" },
};

const maintenanceStatusConfig = {
  scheduled: { color: "bg-blue-600 hover:bg-blue-700", label: "Agendada" },
  in_progress: { color: "bg-orange-600 hover:bg-orange-700", label: "Em Andamento" },
  completed: { color: "bg-green-600 hover:bg-green-700", label: "Concluída" },
  cancelled: { color: "bg-gray-600 hover:bg-gray-700", label: "Cancelada" },
};

const interventionStatusConfig = {
  pending: { color: "text-yellow-800 bg-yellow-100", label: "Pendente" },
  assigned: { color: "text-blue-800 bg-blue-100", label: "Atribuída" },
  in_progress: {
    color: "text-purple-800 bg-purple-100",
    label: "Em Progresso",
  },
  completed: { color: "text-green-800 bg-green-100", label: "Concluída" },
  cancelled: { color: "text-gray-800 bg-gray-100", label: "Cancelada" },
};

export default function MaintenanceComplete() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [interventionHistory, setInterventionHistory] = useState<
    MaintenanceRequest[]
  >([]);
  const [activeTab, setActiveTab] = useState<
    "maintenance" | "history" | "reports"
  >("maintenance");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string>("all");
  const [editingMaintenance, setEditingMaintenance] =
    useState<MaintenanceData | null>(null);
  const [selectedEquipmentForChecklist, setSelectedEquipmentForChecklist] =
    useState<Machine | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [expandedIntervention, setExpandedIntervention] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const equipmentData = await productionService.getMachines();
        setMachines(equipmentData);

        try {
          const plans = await maintenanceService.getMaintenancePlans();
          const mapped = (plans || []).map((p: any) => ({
            id: p.id,
            machineId: p.machineId,
            machineName: p.machineName,
            type: p.type,
            priority: p.priority,
            status: p.status,
            scheduledDate: p.scheduledDate,
            completedDate: p.completedDate,
            estimatedCost: p.estimatedCost ?? 0,
            actualCost: p.actualCost,
            estimatedDuration: p.estimatedDuration ?? 0,
            actualDuration: p.actualDuration,
            description: p.description || "",
            technician: p.technician || "",
            parts: p.parts || "",
            notes: p.notes || "",
            photos: [],
            createdAt: new Date().toISOString().split("T")[0],
          }));
          setMaintenances(
            mapped.filter(
              (m: any) => m.status !== "completed" && m.status !== "cancelled",
            ),
          );
        } catch (e) {
          console.error("Erro ao carregar manutenções", e);
          setMaintenances([]);
        }

        const interventions = await maintenanceService.getMaintenanceRequests();
        const completedFromPlans = (
          await maintenanceService.getMaintenancePlans()
        )
          .filter((p: any) => p.status === "completed")
          .map((p: any) => ({
            id: `plan-${p.id}`,
            machineId: p.machineId,
            machineName: p.machineName || "",
            operatorId: "",
            operatorName: p.technician || "Técnico",
            urgencyLevel:
              p.priority === "critical"
                ? "critical"
                : p.priority === "high"
                  ? "high"
                  : p.priority === "medium"
                    ? "medium"
                    : "low",
            category: p.type === "preventive" ? "preventive" : "other",
            title: p.description?.slice(0, 60) || `Manutenção ${p.type}`,
            description: p.description || "",
            reportedIssues: [],
            status: "completed",
            priority: 5,
            requestedAt: p.scheduledDate || new Date().toISOString(),
            completedAt: p.completedDate || new Date().toISOString(),
            technicianNotes: p.notes || "",
            solution: undefined,
            partsUsed: p.parts
              ? String(p.parts)
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
            cost: p.actualCost ?? p.estimatedCost ?? 0,
            followUpRequired: false,
          }));
        setInterventionHistory([
          ...(interventions || []),
          ...completedFromPlans,
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveMaintenance = async (maintenanceData: MaintenanceData) => {
    const machine = machines.find((m) => m.id === maintenanceData.machineId);
    const maintenanceWithMachineName = {
      ...maintenanceData,
      machineName: machine?.name || "",
    };

    try {
      if (editingMaintenance) {
        await maintenanceService.updateMaintenancePlan(editingMaintenance.id!, {
          machineId: maintenanceWithMachineName.machineId,
          machineName: maintenanceWithMachineName.machineName,
          type: maintenanceWithMachineName.type,
          priority: maintenanceWithMachineName.priority,
          status: maintenanceWithMachineName.status,
          scheduledDate: maintenanceWithMachineName.scheduledDate,
          completedDate: maintenanceWithMachineName.completedDate,
          estimatedCost: maintenanceWithMachineName.estimatedCost,
          actualCost: maintenanceWithMachineName.actualCost,
          estimatedDuration: maintenanceWithMachineName.estimatedDuration,
          actualDuration: maintenanceWithMachineName.actualDuration,
          description: maintenanceWithMachineName.description,
          technician: maintenanceWithMachineName.technician,
          parts: maintenanceWithMachineName.parts,
          notes: maintenanceWithMachineName.notes,
        });

        if (maintenanceWithMachineName.status === "completed" && editingMaintenance.machineId) {
          try {
            const schedules = await equipmentScheduleService.getSchedules(
              editingMaintenance.machineId
            );
            const matchingSchedule = schedules.find(
              (s) =>
                s.maintenance_type.toLowerCase() ===
                  maintenanceWithMachineName.type?.toLowerCase() ||
                s.description?.toLowerCase() ===
                  maintenanceWithMachineName.description?.toLowerCase() ||
                maintenanceWithMachineName.description?.includes(s.maintenance_type)
            );
            if (matchingSchedule) {
              await equipmentScheduleService.rescheduleAfterCompletion(
                matchingSchedule.id
              );
            }
          } catch (scheduleError) {
            console.error("Erro ao reagendar manutenção automática:", scheduleError);
          }
        }

        setEditingMaintenance(null);
      } else {
        await maintenanceService.createMaintenancePlan({
          machineId: maintenanceWithMachineName.machineId,
          machineName: maintenanceWithMachineName.machineName,
          type: maintenanceWithMachineName.type,
          priority: maintenanceWithMachineName.priority,
          status: maintenanceWithMachineName.status,
          scheduledDate: maintenanceWithMachineName.scheduledDate,
          estimatedCost: maintenanceWithMachineName.estimatedCost,
          estimatedDuration: maintenanceWithMachineName.estimatedDuration,
          description: maintenanceWithMachineName.description,
          technician: maintenanceWithMachineName.technician,
          parts: maintenanceWithMachineName.parts,
          selectedParts: maintenanceWithMachineName.selectedParts || [],
          notes: maintenanceWithMachineName.notes,
        });
      }
      const plans = await maintenanceService.getMaintenancePlans();
      setMaintenances(
        (plans || []).map((p: any) => ({
          id: p.id,
          machineId: p.machineId,
          machineName: p.machineName,
          type: p.type,
          priority: p.priority,
          status: p.status,
          scheduledDate: p.scheduledDate,
          completedDate: p.completedDate,
          estimatedCost: p.estimatedCost ?? 0,
          actualCost: p.actualCost,
          estimatedDuration: p.estimatedDuration ?? 0,
          actualDuration: p.actualDuration,
          description: p.description || "",
          technician: p.technician || "",
          parts: p.parts || "",
          notes: p.notes || "",
          photos: [],
          createdAt: new Date().toISOString().split("T")[0],
        })),
      );
    } catch (e) {
      console.error("Erro ao gravar manutenção", e);
      alert("Erro ao gravar manutenção");
    }
  };

  const handleEditMaintenance = (maintenance: MaintenanceData) => {
    setEditingMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const handleDeleteMaintenance = async (maintenance: MaintenanceData) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a manutenção "${maintenance.description}" da máquina ${maintenance.machineName}?`,
      )
    )
      return;
    try {
      await maintenanceService.deleteMaintenancePlan(maintenance.id!);
      const plans = await maintenanceService.getMaintenancePlans();
      setMaintenances(
        (plans || []).map((p: any) => ({
          id: p.id,
          machineId: p.machineId,
          machineName: p.machineName,
          type: p.type,
          priority: p.priority,
          status: p.status,
          scheduledDate: p.scheduledDate,
          completedDate: p.completedDate,
          estimatedCost: p.estimatedCost ?? 0,
          actualCost: p.actualCost,
          estimatedDuration: p.estimatedDuration ?? 0,
          actualDuration: p.actualDuration,
          description: p.description || "",
          technician: p.technician || "",
          parts: p.parts || "",
          notes: p.notes || "",
          photos: [],
          createdAt: new Date().toISOString().split("T")[0],
        })),
      );
    } catch (e) {
      console.error("Erro ao apagar manutenção", e);
      alert("Erro ao apagar manutenção");
    }
  };

  const filteredMaintenances = maintenances.filter((maintenance) => {
    const matchesSearch =
      maintenance.machineName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      maintenance.description.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "overdue") {
      const now = new Date();
      matchesStatus =
        maintenance.status === "scheduled" &&
        new Date(maintenance.scheduledDate) < now;
    } else if (statusFilter !== "all") {
      matchesStatus = maintenance.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const filteredInterventions = interventionHistory.filter((intervention) => {
    const matchesSearch =
      intervention.machineName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      intervention.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intervention.operatorName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || intervention.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalMachines: machines.length,
    scheduledMaintenances: maintenances.filter((m) => m.status === "scheduled")
      .length,
    totalInterventions: interventionHistory.length,
    completedInterventions: interventionHistory.filter(
      (i) => i.status === "completed",
    ).length,
    pendingInterventions: interventionHistory.filter(
      (i) => i.status === "pending",
    ).length,
    totalCost: interventionHistory.reduce((sum, i) => sum + (i.cost || 0), 0),
    avgResolutionTime: calculateAverageResolutionTime(),
  };

  function calculateAverageResolutionTime(): number {
    const completedInterventions = interventionHistory.filter(
      (i) => i.status === "completed" && i.completedAt,
    );

    if (completedInterventions.length === 0) return 0;

    const totalTime = completedInterventions.reduce((sum, intervention) => {
      const start = new Date(intervention.requestedAt).getTime();
      const end = new Date(intervention.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(
      totalTime / completedInterventions.length / (1000 * 60 * 60),
    );
  }

  const exportToCSV = () => {
    const csvData = [
      [
        "ID",
        "Máquina",
        "Título",
        "Descrição",
        "Operador",
        "Urgência",
        "Estado",
        "Data Solicitação",
        "Data Conclusão",
        "Tempo Resolução (h)",
        "Custo",
        "Técnico",
        "Solução",
      ],
      ...interventionHistory.map((intervention) => {
        const resolutionTime = intervention.completedAt
          ? Math.round(
              (new Date(intervention.completedAt).getTime() -
                new Date(intervention.requestedAt).getTime()) /
                (1000 * 60 * 60),
            )
          : 0;

        return [
          intervention.id,
          intervention.machineName,
          intervention.title,
          intervention.description,
          intervention.operatorName,
          intervention.urgencyLevel,
          intervention.status,
          new Date(intervention.requestedAt).toLocaleString("pt-BR"),
          intervention.completedAt
            ? new Date(intervention.completedAt).toLocaleString("pt-BR")
            : "",
          resolutionTime,
          intervention.cost || 0,
          intervention.assignedTo || "",
          intervention.solution || "",
        ];
      }),
    ];

    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico_intervencoes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              Gestão de Manutenção
            </h1>
            <p className="text-lg text-muted-foreground">
              Sistema completo de gestão de manutenção e histórico de intervenções
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowMaintenanceForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Manutenção
            </button>
            <button
              onClick={() => setShowChecklist(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-600/80 hover:from-purple-700 hover:to-purple-700/70 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Checklist
            </button>
            <button
              type="button"
              onClick={() => setShowReports(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-600/80 hover:from-blue-700 hover:to-blue-700/70 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Relatórios
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-blue-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Máquinas</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-50 mt-1">{stats.totalMachines}</p>
            </div>
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Factory className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-cyan-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-cyan-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Agendadas</p>
              <p className="text-2xl md:text-3xl font-bold text-cyan-400 mt-1">{stats.scheduledMaintenances}</p>
            </div>
            <div className="p-2 bg-cyan-600/20 rounded-lg">
              <Calendar className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-purple-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Intervenções</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-400 mt-1">{stats.totalInterventions}</p>
            </div>
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Target className="h-5 w-5 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Concluídas</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-1">{stats.completedInterventions}</p>
            </div>
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-orange-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-orange-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Custo Total</p>
              <p className="text-lg md:text-2xl font-bold text-orange-400 mt-1">€{stats.totalCost.toFixed(0)}</p>
            </div>
            <div className="p-2 bg-orange-600/20 rounded-lg">
              <Euro className="h-5 w-5 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-indigo-500/20 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-indigo-500/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-slate-400">Tempo Médio</p>
              <p className="text-2xl md:text-3xl font-bold text-indigo-400 mt-1">{stats.avgResolutionTime}h</p>
            </div>
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Timer className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-lg bg-gradient-to-r from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30 p-1 shadow-lg">
        <button
          onClick={() => setActiveTab("maintenance")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300",
            activeTab === "maintenance"
              ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-slate-50 shadow-md"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          Manutenções Programadas ({maintenances.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300",
            activeTab === "history"
              ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-slate-50 shadow-md"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          Histórico ({interventionHistory.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300",
            activeTab === "reports"
              ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-slate-50 shadow-md"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          Relatórios
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Procurar por máquina, tipo ou operador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-800/40 pl-10 pr-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-transparent transition-all duration-300"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700/30 bg-gradient-to-r from-slate-800/60 to-slate-800/40 px-4 py-2.5 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-transparent transition-all duration-300 min-w-[200px]"
        >
          <option value="all">Todos os estados</option>
          {activeTab === "maintenance" && (
            <>
              <option value="scheduled">Agendadas</option>
              <option value="overdue">Por Cumprir</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
            </>
          )}
          {activeTab === "history" && (
            <>
              <option value="pending">Pendentes</option>
              <option value="assigned">Atribuídas</option>
              <option value="in_progress">Em Progresso</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Canceladas</option>
            </>
          )}
        </select>

        {activeTab === "history" && (
          <button
            onClick={exportToCSV}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-600/80 hover:from-green-700 hover:to-green-700/70 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-muted-foreground">Carregando dados de manutenção...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Maintenance Tab */}
          {activeTab === "maintenance" && (
            <div className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gradient-to-r from-muted/50 to-muted/30">
                    <tr>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Máquina</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Tipo</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Prioridade</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Data Programada</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Custo</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaintenances.map((maintenance) => {
                      const priority = priorityConfig[maintenance.priority];
                      const status = maintenanceStatusConfig[maintenance.status];
                      const isOverdue =
                        maintenance.status === "scheduled" &&
                        new Date(maintenance.scheduledDate) < new Date();

                      return (
                        <tr
                          key={maintenance.id}
                          className={cn(
                            "border-b hover:bg-muted/20 transition-colors duration-200",
                            isOverdue && "border-l-4 border-l-red-500 bg-red-500/5",
                          )}
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-semibold text-foreground">{maintenance.machineName}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {maintenance.description}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground capitalize">
                              {maintenance.type === "preventive"
                                ? "Preventiva"
                                : maintenance.type === "corrective"
                                  ? "Corretiva"
                                  : "Preditiva"}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge className={priority.color}>
                              {priority.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium",
                                isOverdue ? "text-red-600" : "text-muted-foreground",
                              )}>
                                {new Date(maintenance.scheduledDate).toLocaleDateString("pt-PT")}
                              </span>
                              {isOverdue && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground font-medium">
                            €{maintenance.estimatedCost.toLocaleString("pt-PT")}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditMaintenance(maintenance)}
                                className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-all duration-200"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMaintenance(maintenance)}
                                className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-500/10 transition-all duration-200"
                                title="Eliminar"
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

              {filteredMaintenances.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma manutenção encontrada</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {filteredInterventions.length === 0 ? (
                <div className="text-center py-12 rounded-lg bg-gradient-to-br from-card/50 to-card/30 backdrop-blur border border-border/50">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma intervenção encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInterventions.map((intervention) => {
                    const isExpanded = expandedIntervention === intervention.id;
                    const requestDate = new Date(intervention.requestedAt);
                    const completedDate = intervention.completedAt
                      ? new Date(intervention.completedAt)
                      : null;
                    const duration = completedDate
                      ? Math.round(
                          (completedDate.getTime() - requestDate.getTime()) /
                            (1000 * 60 * 60),
                        )
                      : null;

                    const statusBg = 
                      intervention.status === "completed" ? "from-green-500/10 to-emerald-500/10 border-green-200/30" :
                      intervention.status === "in_progress" ? "from-orange-500/10 to-amber-500/10 border-orange-200/30" :
                      intervention.status === "pending" ? "from-yellow-500/10 to-amber-500/10 border-yellow-200/30" :
                      "from-slate-500/10 to-slate-500/10 border-slate-200/30";

                    return (
                      <div
                        key={intervention.id}
                        className={`bg-gradient-to-br ${statusBg} backdrop-blur border rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}
                      >
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() =>
                            setExpandedIntervention(
                              isExpanded ? null : intervention.id,
                            )
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">
                                  {intervention.title}
                                </h4>
                                <Badge className={
                                  intervention.urgencyLevel === "critical" ? "bg-red-600 hover:bg-red-700" :
                                  intervention.urgencyLevel === "high" ? "bg-orange-600 hover:bg-orange-700" :
                                  intervention.urgencyLevel === "medium" ? "bg-yellow-600 hover:bg-yellow-700" :
                                  "bg-blue-600 hover:bg-blue-700"
                                }>
                                  {intervention.urgencyLevel === "critical" ? "Crítica" :
                                   intervention.urgencyLevel === "high" ? "Alta" :
                                   intervention.urgencyLevel === "medium" ? "Média" : "Baixa"}
                                </Badge>
                              </div>

                              <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Factory className="h-4 w-4" />
                                  {intervention.machineName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {intervention.operatorName}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {requestDate.toLocaleDateString("pt-PT")}
                                </div>
                                {duration && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    {duration}h
                                  </div>
                                )}
                                {intervention.cost && intervention.cost > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Euro className="h-4 w-4" />
                                    €{intervention.cost.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Eye className="h-4 w-4 text-muted-foreground ml-4" />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-3">
                            <div>
                              <strong className="text-sm">Descrição:</strong>
                              <p className="text-sm text-muted-foreground mt-1">
                                {intervention.description}
                              </p>
                            </div>

                            {intervention.technicianNotes && (
                              <div>
                                <strong className="text-sm">Notas do Técnico:</strong>
                                <pre className="mt-1 text-xs bg-background/50 p-2 rounded border border-border/50 whitespace-pre-wrap">
                                  {intervention.technicianNotes}
                                </pre>
                              </div>
                            )}

                            {intervention.solution && (
                              <div>
                                <strong className="text-sm">Solução:</strong>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {intervention.solution}
                                </p>
                              </div>
                            )}

                            {intervention.partsUsed && intervention.partsUsed.length > 0 && (
                              <div>
                                <strong className="text-sm">Peças Utilizadas:</strong>
                                <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1">
                                  {intervention.partsUsed.map((part, index) => (
                                    <li key={index}>{part}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur border border-green-200/30 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Estatísticas Gerais
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de Intervenções:</span>
                      <span className="font-bold text-foreground">{stats.totalInterventions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de Conclusão:</span>
                      <span className="font-bold text-green-600">
                        {stats.totalInterventions > 0
                          ? Math.round(
                              (stats.completedInterventions /
                                stats.totalInterventions) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tempo Médio de Resolução:</span>
                      <span className="font-bold text-foreground">{stats.avgResolutionTime}h</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/50 pt-3">
                      <span className="text-muted-foreground">Custo Total:</span>
                      <span className="font-bold text-orange-600">€{stats.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur border border-blue-200/30 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Ações de Relatório
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={exportToCSV}
                      className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600/80 hover:from-blue-700 hover:to-blue-700/70 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all duration-300"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Histórico (CSV)
                    </button>
                    <button
                      onClick={() => setShowReports(true)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-600/80 hover:from-green-700 hover:to-green-700/70 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all duration-300"
                    >
                      <FileText className="h-4 w-4" />
                      Relatório Detalhado
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Forms and Modals */}
      <MaintenanceForm
        isOpen={showMaintenanceForm}
        onClose={() => {
          setShowMaintenanceForm(false);
          setEditingMaintenance(null);
        }}
        onSave={handleSaveMaintenance}
        machines={machines.map((m) => ({ id: m.id!, name: m.name }))}
        editingMaintenance={editingMaintenance}
      />

      <MaintenanceReports
        isOpen={showReports}
        onClose={() => {
          setShowReports(false);
          setSelectedEquipment("all");
        }}
        machines={machines.map((m) => ({ id: m.id!, name: m.name }))}
        initialEquipment={selectedEquipment}
      />

      <ChecklistDL50
        isOpen={showChecklist}
        onClose={() => {
          setShowChecklist(false);
          setSelectedEquipmentForChecklist(undefined);
        }}
        equipmentData={
          selectedEquipmentForChecklist
            ? {
                id: selectedEquipmentForChecklist.id!,
                name: selectedEquipmentForChecklist.name,
                model: "N/A",
                serialNumber: "N/A",
                location: "Ver em Equipamentos",
              }
            : undefined
        }
      />
    </div>
  );
}
