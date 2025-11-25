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

// Dados limpos - apenas máquinas reais de corte de espuma
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
  low: { color: "text-success bg-success/10", label: "Baixa" },
  medium: { color: "text-warning bg-warning/10", label: "Média" },
  high: { color: "text-info bg-info/10", label: "Alta" },
  critical: { color: "text-destructive bg-destructive/10", label: "Crítica" },
};

const maintenanceStatusConfig = {
  scheduled: { color: "text-info bg-info/10", label: "Agendada" },
  in_progress: { color: "text-warning bg-warning/10", label: "Em Andamento" },
  completed: { color: "text-success bg-success/10", label: "Concluída" },
  cancelled: { color: "text-muted-foreground bg-muted", label: "Cancelada" },
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

  // Load data from localStorage and equipment from productionService
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load machines from production service
        const equipmentData = await productionService.getMachines();
        setMachines(equipmentData);

        // Load maintenances from DB (maintenance plans)
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
          // Mostrar apenas pendentes/ativas na aba Manutenções Programadas
          setMaintenances(
            mapped.filter(
              (m: any) => m.status !== "completed" && m.status !== "cancelled",
            ),
          );
        } catch (e) {
          console.error("Erro ao carregar manutenções", e);
          setMaintenances([]);
        }

        // Load intervention history from maintenance service
        const interventions = await maintenanceService.getMaintenanceRequests();
        // Adicionar manutenções programadas concluídas ao histórico
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

  // Using DB for persistence of scheduled maintenances (plans)

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

  // Calculate statistics
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
    ); // hours
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
        "Data Solicitaç��o",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestão de Manutenção
          </h1>
          <p className="text-muted-foreground">
            Sistema completo de gestão de manutenção e histórico de intervenções
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
            onClick={() => setShowChecklist(true)}
            className="px-4 py-2 text-sm font-medium text-purple-50 bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Checklist DL50
          </button>
          <button
            type="button"
            onClick={() => setShowReports(true)}
            className="px-4 py-2 text-sm font-medium text-info-foreground bg-info rounded-lg hover:bg-info/90 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Relatórios
          </button>
          {activeTab === "history" && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Máquinas
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {stats.totalMachines}
              </p>
            </div>
            <Factory className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Agendadas
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.scheduledMaintenances}
              </p>
            </div>
            <Calendar className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Intervenções
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalInterventions}
              </p>
            </div>
            <Target className="h-6 w-6 text-purple-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Concluídas
              </p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completedInterventions}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Custo Total
              </p>
              <p className="text-xl font-bold text-orange-600">
                €{stats.totalCost.toFixed(2)}
              </p>
            </div>
            <Euro className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tempo Médio
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {stats.avgResolutionTime}h
              </p>
            </div>
            <Timer className="h-6 w-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("maintenance")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "maintenance"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Manutenções Programadas ({maintenances.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Histórico de Intervenções ({interventionHistory.length})
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "reports"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Relatórios e Análises
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {activeTab === "maintenance" &&
              `Manutenções Programadas (${filteredMaintenances.length})`}
            {activeTab === "history" &&
              `Histórico de Intervenções (${filteredInterventions.length})`}
            {activeTab === "reports" && "Relatórios e Análises"}
          </h2>
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Carregando dados de manutenção...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Maintenance Tab Content */}
          {activeTab === "maintenance" && (
            <div
              className="rounded-lg border bg-card overflow-hidden"
              aria-label="manutencoes-programadas-nao-concluidas"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Máquina
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Tipo
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Prioridade
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Data Programada
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Custo
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaintenances.map((maintenance) => {
                      const priority = priorityConfig[maintenance.priority];
                      const status =
                        maintenanceStatusConfig[maintenance.status];
                      const isOverdue =
                        maintenance.status === "scheduled" &&
                        new Date(maintenance.scheduledDate) < new Date();

                      return (
                        <tr
                          key={maintenance.id}
                          className={cn(
                            "border-b hover:bg-muted/50",
                            isOverdue &&
                              "border-l-4 border-l-warning bg-warning/5",
                          )}
                        >
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-card-foreground">
                                {maintenance.machineName}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
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
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                                priority.color,
                              )}
                            >
                              {priority.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                                status.color,
                              )}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm",
                                  isOverdue
                                    ? "text-warning font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {new Date(
                                  maintenance.scheduledDate,
                                ).toLocaleDateString("pt-BR")}
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
                                onClick={() =>
                                  handleEditMaintenance(maintenance)
                                }
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteMaintenance(maintenance)
                                }
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

              {filteredMaintenances.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Nenhuma manutenção encontrada
                  </p>
                </div>
              )}
            </div>
          )}

          {/* History Tab Content */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  📋 Histórico Completo de Intervenções
                </h3>
                <p className="text-sm text-blue-800">
                  Registo completo de todas as intervenções de manutenção
                  realizadas. Este histórico inclui solicitações de operadores,
                  manutenções corretivas, preventivas e de emergência.
                </p>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="max-h-96 overflow-y-auto">
                  {filteredInterventions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all"
                          ? "Nenhuma intervenção encontrada com os filtros aplicados"
                          : "Nenhuma intervenção registada"}
                      </p>
                    </div>
                  ) : (
                    filteredInterventions.map((intervention) => {
                      const isExpanded =
                        expandedIntervention === intervention.id;
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

                      const statusConfig =
                        interventionStatusConfig[intervention.status];

                      return (
                        <div
                          key={intervention.id}
                          className="border-b last:border-b-0"
                        >
                          <div
                            className="p-4 hover:bg-muted/50 cursor-pointer"
                            onClick={() =>
                              setExpandedIntervention(
                                isExpanded ? null : intervention.id,
                              )
                            }
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">
                                    {intervention.title}
                                  </h4>
                                  <span
                                    className={cn(
                                      "px-2 py-1 rounded text-xs",
                                      intervention.urgencyLevel === "critical"
                                        ? "bg-red-100 text-red-800"
                                        : intervention.urgencyLevel === "high"
                                          ? "bg-orange-100 text-orange-800"
                                          : intervention.urgencyLevel ===
                                              "medium"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800",
                                    )}
                                  >
                                    {intervention.urgencyLevel === "critical"
                                      ? "Crítica"
                                      : intervention.urgencyLevel === "high"
                                        ? "Alta"
                                        : intervention.urgencyLevel === "medium"
                                          ? "Média"
                                          : "Baixa"}
                                  </span>
                                  <span
                                    className={cn(
                                      "px-2 py-1 rounded text-xs",
                                      statusConfig.color,
                                    )}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </div>

                                <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Factory className="h-3 w-3" />
                                    {intervention.machineName}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {intervention.operatorName}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {requestDate.toLocaleDateString("pt-BR")}
                                  </div>
                                  {duration && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Duração: {duration}h
                                    </div>
                                  )}
                                  {intervention.cost &&
                                    intervention.cost > 0 && (
                                      <div className="flex items-center gap-1">
                                        <Euro className="h-3 w-3" />€
                                        {intervention.cost.toFixed(2)}
                                      </div>
                                    )}
                                  {intervention.assignedTo && (
                                    <div className="flex items-center gap-1">
                                      <Wrench className="h-3 w-3" />
                                      {intervention.assignedTo}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="ml-4">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 bg-muted/20">
                              <div className="space-y-3 text-sm">
                                <div>
                                  <strong>Descrição:</strong>
                                  <p className="mt-1">
                                    {intervention.description}
                                  </p>
                                </div>

                                {intervention.technicianNotes && (
                                  <div>
                                    <strong>
                                      Notas do Técnico/Folha de Trabalho:
                                    </strong>
                                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border">
                                      {intervention.technicianNotes}
                                    </pre>
                                  </div>
                                )}

                                {intervention.solution && (
                                  <div>
                                    <strong>Solução:</strong>
                                    <p className="mt-1">
                                      {intervention.solution}
                                    </p>
                                  </div>
                                )}

                                {intervention.partsUsed &&
                                  intervention.partsUsed.length > 0 && (
                                    <div>
                                      <strong>Peças Utilizadas:</strong>
                                      <ul className="mt-1 list-disc list-inside">
                                        {intervention.partsUsed.map(
                                          (part, index) => (
                                            <li key={index}>{part}</li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                <div className="grid gap-2 md:grid-cols-2 pt-2 border-t">
                                  <div>
                                    <strong>Categoria:</strong>{" "}
                                    {intervention.category}
                                  </div>
                                  <div>
                                    <strong>Prioridade:</strong>{" "}
                                    {intervention.priority}
                                  </div>
                                  <div>
                                    <strong>Follow-up:</strong>{" "}
                                    {intervention.followUpRequired
                                      ? "Sim"
                                      : "Não"}
                                  </div>
                                  {intervention.nextMaintenanceDate && (
                                    <div>
                                      <strong>Próxima Manutenção:</strong>{" "}
                                      {new Date(
                                        intervention.nextMaintenanceDate,
                                      ).toLocaleDateString("pt-BR")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab Content */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">
                  📊 Relatórios e Análises
                </h3>
                <p className="text-sm text-green-800">
                  Gere relatórios detalhados com base no histórico completo de
                  manutenção e intervenções.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Estatísticas Gerais
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total de Intervenções:</span>
                      <span className="font-bold">
                        {stats.totalInterventions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de Conclusão:</span>
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
                    <div className="flex justify-between">
                      <span>Tempo Médio de Resolução:</span>
                      <span className="font-bold">
                        {stats.avgResolutionTime}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo Total:</span>
                      <span className="font-bold text-orange-600">
                        €{stats.totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Ações de Relatório
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={exportToCSV}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Exportar Histórico Completo (CSV)
                    </button>
                    <button
                      onClick={() => setShowReports(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Relatório Detalhado
                    </button>
                    <button
                      onClick={() => setShowChecklist(true)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Checklist de Manutenção
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
