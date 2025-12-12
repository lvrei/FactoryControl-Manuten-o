import { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  Settings,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/config/api";
import { equipmentScheduleService } from "@/services/equipmentScheduleService";

interface PlannedMaintenance {
  id: number | string;
  equipment_id: number | string;
  equipment_name?: string;
  maintenance_type: string;
  description: string;
  scheduled_date: string;
  assigned_to?: number;
  assigned_name?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  estimated_duration?: number;
  notes?: string;
}

interface Equipment {
  id: number;
  name: string;
  equipment_type: string;
}

interface User {
  id: number;
  full_name: string;
  username: string;
}

const priorityConfig = {
  low: { label: "Baixa", color: "bg-blue-600 hover:bg-blue-700", bgGradient: "from-blue-500/10 to-cyan-500/10 border-blue-200/30" },
  medium: { label: "Média", color: "bg-yellow-600 hover:bg-yellow-700", bgGradient: "from-yellow-500/10 to-amber-500/10 border-yellow-200/30" },
  high: { label: "Alta", color: "bg-red-600 hover:bg-red-700", bgGradient: "from-red-500/10 to-rose-500/10 border-red-200/30" },
};

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-600 hover:bg-blue-700", icon: Calendar },
  in_progress: { label: "Em Progresso", color: "bg-orange-600 hover:bg-orange-700", icon: Clock },
  completed: { label: "Concluída", color: "bg-green-600 hover:bg-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelada", color: "bg-gray-600 hover:bg-gray-700", icon: AlertCircle },
};

export default function Planning() {
  const [plans, setPlans] = useState<PlannedMaintenance[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedMaintenance | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    equipment_id: "",
    maintenance_type: "",
    description: "",
    scheduled_date: "",
    assigned_to: "unassigned",
    priority: "medium" as "low" | "medium" | "high",
    estimated_duration: 0,
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, equipRes, usersRes, schedulesRes] = await Promise.all([
        apiFetch("maintenance/planned"),
        apiFetch("equipment"),
        apiFetch("users"),
        equipmentScheduleService.getSchedules(),
      ]);

      let allPlans: PlannedMaintenance[] = [];
      let equipData: Equipment[] = [];

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        allPlans = [...plansData];
      }

      if (equipRes.ok) {
        equipData = await equipRes.json();
        setEquipments(equipData);
      }

      if (schedulesRes && schedulesRes.length > 0 && equipData.length > 0) {
        const equipMap = new Map(equipData.map((eq: Equipment) => [eq.id, eq]));

        const schedulePlans = schedulesRes
          .filter(
            (schedule: any) => schedule.is_active && schedule.next_due_date,
          )
          .map((schedule: any, index: number) => {
            const equipmentId = String(schedule.equipment_id);
            const equipment = equipMap.get(equipmentId);
            return {
              id: `sched-${schedule.id}`,
              equipment_id: equipmentId,
              equipment_name: equipment?.name || "Equipamento desconhecido",
              maintenance_type: schedule.maintenance_type,
              description:
                schedule.description || "Manutenção preventiva agendada",
              scheduled_date: schedule.next_due_date,
              status: "scheduled" as const,
              priority: "medium" as const,
              estimated_duration: 2,
              notes: `Intervalo: ${schedule.interval_days} dias`,
            };
          });

        allPlans = [...allPlans, ...schedulePlans];
      }

      setPlans(allPlans);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.equipment_id ||
      !formData.maintenance_type ||
      !formData.scheduled_date
    ) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    try {
      const path = editingPlan
        ? `maintenance/planned/${editingPlan.id}`
        : "maintenance/planned";
      const method = editingPlan ? "PUT" : "POST";

      const response = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          equipment_id: formData.equipment_id,
          assigned_to:
            formData.assigned_to && formData.assigned_to !== "unassigned"
              ? parseInt(formData.assigned_to)
              : null,
          status: editingPlan?.status || "scheduled",
        }),
      });

      if (response.ok) {
        toast({
          title: editingPlan ? "Manutenção atualizada" : "Manutenção planeada",
          description: "Manutenção guardada com sucesso",
        });
        loadData();
        resetForm();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.error || "Erro ao guardar manutenção",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao guardar manutenção",
      });
    }
  };

  const handleEdit = (plan: PlannedMaintenance) => {
    setEditingPlan(plan);
    setFormData({
      equipment_id: plan.equipment_id.toString(),
      maintenance_type: plan.maintenance_type,
      description: plan.description,
      scheduled_date: plan.scheduled_date.split("T")[0],
      assigned_to: plan.assigned_to?.toString() || "unassigned",
      priority: plan.priority,
      estimated_duration: plan.estimated_duration || 0,
      notes: plan.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja eliminar esta manutenção planeada?"))
      return;

    try {
      const response = await apiFetch(`maintenance/planned/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Manutenção eliminada",
          description: "Manutenção removida com sucesso",
        });
        loadData();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar manutenção",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      equipment_id: "",
      maintenance_type: "",
      description: "",
      scheduled_date: "",
      assigned_to: "unassigned",
      priority: "medium",
      estimated_duration: 0,
      notes: "",
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const filteredPlans = plans.filter(
    (plan) =>
      plan.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.maintenance_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const upcomingPlans = filteredPlans
    .filter((p) => p.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime(),
    );

  const inProgressPlans = filteredPlans.filter(
    (p) => p.status === "in_progress",
  );
  const completedPlans = filteredPlans.filter((p) => p.status === "completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              Planeamento de Manutenções
            </h1>
            <p className="text-lg text-muted-foreground">
              Agendar e gerir manutenções preventivas
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 h-11 px-6 whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Manutenção
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar por equipamento, tipo ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-slate-700/30 text-slate-50 placeholder:text-slate-400"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Agendadas</CardTitle>
            <Calendar className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{upcomingPlans.length}</div>
            <p className="text-xs text-slate-400 mt-2">Manutenções futuras</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-orange-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-orange-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Em Progresso</CardTitle>
            <Clock className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{inProgressPlans.length}</div>
            <p className="text-xs text-slate-400 mt-2">A decorrer</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Concluídas</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{completedPlans.length}</div>
            <p className="text-xs text-slate-400 mt-2">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Maintenance */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
          Próximas Manutenções
        </h2>
        {loading ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">A carregar manutenções...</p>
          </div>
        ) : upcomingPlans.length === 0 ? (
          <div className="text-center py-12 rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30">
            <Calendar className="h-12 w-12 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400">Nenhuma manutenção agendada</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcomingPlans.map((plan) => {
              const priorityInfo = priorityConfig[plan.priority];
              const statusInfo = statusConfig[plan.status];
              const isOverdue = new Date(plan.scheduled_date) < new Date();
              const isScheduledMaintenance =
                typeof plan.id === "string" && plan.id.startsWith("sched-");

              return (
                <Card
                  key={plan.id}
                  className={`bg-gradient-to-br ${isOverdue ? 'from-red-900/40 to-red-800/30 border-red-500/30 hover:border-red-500/50' : 'from-slate-800/60 to-slate-800/40 border-slate-700/30 hover:border-indigo-500/40'} backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CardTitle className="text-base text-foreground">
                            {plan.maintenance_type}
                          </CardTitle>
                          {isScheduledMaintenance && (
                            <Badge variant="secondary" className="text-xs">
                              Preventiva
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {plan.equipment_name}
                        </CardDescription>
                      </div>
                      {isOverdue && (
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-foreground">{plan.description}</p>
                      <div className="border-t border-border/50 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Data:
                          </span>
                          <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                            {new Date(plan.scheduled_date).toLocaleDateString("pt-PT")}
                          </span>
                        </div>
                        {plan.assigned_name && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Técnico:
                            </span>
                            <span className="text-sm text-foreground">{plan.assigned_name}</span>
                          </div>
                        )}
                        {plan.estimated_duration && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Duração:
                            </span>
                            <span className="text-sm text-foreground">{plan.estimated_duration}h</span>
                          </div>
                        )}
                      </div>
                      {plan.notes && !isScheduledMaintenance && (
                        <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                          {plan.notes}
                        </p>
                      )}
                      {isScheduledMaintenance && plan.notes && (
                        <div className="text-xs text-muted-foreground bg-blue-500/10 p-2 rounded border border-blue-200/50">
                          {plan.notes}
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      {!isScheduledMaintenance && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(plan.id as any)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card/80 to-card/50 backdrop-blur border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingPlan ? "Editar Manutenção" : "Nova Manutenção Planeada"}
            </DialogTitle>
            <DialogDescription>
              Agendar uma nova manutenção preventiva
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="equipment_id">Equipamento *</Label>
                <Select
                  value={formData.equipment_id || "placeholder"}
                  onValueChange={(value) => {
                    if (value !== "placeholder") {
                      setFormData({ ...formData, equipment_id: value });
                    }
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Selecionar equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder" disabled>
                      Selecionar equipamento
                    </SelectItem>
                    {equipments.map((eq) => (
                      <SelectItem key={eq.id} value={String(eq.id)}>
                        {eq.name} - {eq.equipment_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_type">Tipo de Manutenção *</Label>
                <Input
                  id="maintenance_type"
                  required
                  value={formData.maintenance_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maintenance_type: e.target.value,
                    })
                  }
                  placeholder="Ex: Preventiva, Inspeção, Calibração"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva a manutenção a ser realizada..."
                  rows={3}
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Data Agendada *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_date: e.target.value })
                  }
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Técnico Responsável</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assigned_to: value })
                  }
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.full_name} (@{user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_duration">
                  Duração Estimada (horas)
                </Label>
                <Input
                  id="estimated_duration"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimated_duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_duration: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Observações adicionais..."
                  rows={2}
                  className="bg-background/50 border-border/50"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-border/50 pt-4 mt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                {editingPlan ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
