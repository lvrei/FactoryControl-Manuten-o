import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  Edit2,
  X,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MaintenanceSchedule,
  equipmentScheduleService,
} from "@/services/equipmentScheduleService";

interface MaintenanceScheduleManagerProps {
  equipmentId: string;
  equipmentName: string;
}

export function MaintenanceScheduleManager({
  equipmentId,
  equipmentName,
}: MaintenanceScheduleManagerProps) {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<MaintenanceSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    maintenance_type: "",
    description: "",
    interval_days: 30,
  });

  useEffect(() => {
    loadSchedules();
  }, [equipmentId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await equipmentScheduleService.getSchedules(equipmentId);
      setSchedules(data.filter((s) => s.is_active));
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule?: MaintenanceSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        maintenance_type: schedule.maintenance_type,
        description: schedule.description || "",
        interval_days: schedule.interval_days,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        maintenance_type: "",
        description: "",
        interval_days: 30,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSchedule(null);
    setFormData({
      maintenance_type: "",
      description: "",
      interval_days: 30,
    });
  };

  const handleSave = async () => {
    if (!formData.maintenance_type || formData.interval_days <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Tipo de manutenção e intervalo são obrigatórios",
      });
      return;
    }

    try {
      if (editingSchedule) {
        await equipmentScheduleService.updateSchedule(editingSchedule.id, {
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          interval_days: formData.interval_days,
        });

        toast({
          title: "Sucesso",
          description: "Agendamento atualizado com sucesso",
        });
      } else {
        await equipmentScheduleService.createSchedule({
          equipment_id: equipmentId,
          maintenance_type: formData.maintenance_type,
          description: formData.description,
          interval_days: formData.interval_days,
          is_active: true,
          last_scheduled_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso",
        });
      }

      loadSchedules();
      handleCloseDialog();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao guardar agendamento",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este agendamento?")) return;

    try {
      await equipmentScheduleService.deleteSchedule(id);
      toast({
        title: "Sucesso",
        description: "Agendamento eliminado com sucesso",
      });
      loadSchedules();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar agendamento",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("pt-PT");
    } catch {
      return "N/A";
    }
  };

  const getDaysUntilDue = (dueDate?: string): number | null => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return "bg-gray-100";
    if (daysUntilDue <= 0) return "bg-red-100";
    if (daysUntilDue <= 7) return "bg-orange-100";
    return "bg-green-100";
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manutenções Preventivas Agendadas
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os ciclos de manutenção automática para {equipmentName}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">
          A carregar agendamentos...
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Sem agendamentos de manutenção.</p>
          <p className="text-sm">
            Clique em "Novo Agendamento" para adicionar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => {
            const daysUntilDue = getDaysUntilDue(schedule.next_due_date);
            return (
              <div
                key={schedule.id}
                className={`p-3 rounded-lg border ${getStatusColor(daysUntilDue)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">
                      {schedule.maintenance_type}
                    </h4>
                    {schedule.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {schedule.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />A cada{" "}
                        {schedule.interval_days} dias
                      </span>
                      {schedule.next_due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Próxima: {formatDate(schedule.next_due_date)}
                          {daysUntilDue !== null && (
                            <span className="font-semibold ml-1">
                              ({daysUntilDue} dias)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(schedule)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule
                ? "Editar Agendamento"
                : "Novo Agendamento de Manutenção"}
            </DialogTitle>
            <DialogDescription>
              Defina um ciclo de manutenção automática para {equipmentName}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
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
                placeholder="Ex: Lubrificação, Limpeza, Inspeção, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval_days">Intervalo (dias) *</Label>
              <Input
                id="interval_days"
                type="number"
                min="1"
                required
                value={formData.interval_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    interval_days: parseInt(e.target.value) || 30,
                  })
                }
                placeholder="90"
              />
              <p className="text-xs text-muted-foreground">
                A manutenção será agendada novamente a cada{" "}
                {formData.interval_days} dias após conclusão.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Detalhes sobre esta manutenção..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingSchedule ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
