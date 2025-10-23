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

interface PlannedMaintenance {
  id: number;
  equipment_id: number;
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
  low: { label: "Baixa", color: "bg-blue-600" },
  medium: { label: "Média", color: "bg-yellow-600" },
  high: { label: "Alta", color: "bg-red-600" },
};

const statusConfig = {
  scheduled: { label: "Agendada", color: "bg-blue-600" },
  in_progress: { label: "Em Progresso", color: "bg-orange-600" },
  completed: { label: "Concluída", color: "bg-green-600" },
  cancelled: { label: "Cancelada", color: "bg-gray-600" },
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
      const [plansRes, equipRes, usersRes] = await Promise.all([
        apiFetch("maintenance/planned"),
        apiFetch("equipment"),
        apiFetch("users"),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (equipRes.ok) {
        const equipData = await equipRes.json();
        setEquipments(equipData);
      }

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
          equipment_id: parseInt(formData.equipment_id),
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
      const response = await fetch(`/api/maintenance/planned/${id}`, {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Planeamento de Manutenções
          </h1>
          <p className="text-muted-foreground">
            Agendar e gerir manutenções preventivas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Manutenção
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Procurar manutenções..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingPlans.length}</div>
            <p className="text-xs text-muted-foreground">Manutenções futuras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressPlans.length}</div>
            <p className="text-xs text-muted-foreground">A decorrer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPlans.length}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Maintenance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Próximas Manutenções</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingPlans.map((plan) => {
            const priorityInfo = priorityConfig[plan.priority];
            const statusInfo = statusConfig[plan.status];
            const isOverdue = new Date(plan.scheduled_date) < new Date();

            return (
              <Card key={plan.id} className={isOverdue ? "border-red-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {plan.maintenance_type}
                      </CardTitle>
                      <CardDescription>{plan.equipment_name}</CardDescription>
                    </div>
                    {isOverdue && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{plan.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Data:
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(plan.scheduled_date).toLocaleDateString()}
                      </span>
                    </div>
                    {plan.assigned_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Técnico:
                        </span>
                        <span className="text-sm">{plan.assigned_name}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Badge className={priorityInfo.color}>
                        {priorityInfo.label}
                      </Badge>
                      <Badge variant="outline" className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
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
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingPlan ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
