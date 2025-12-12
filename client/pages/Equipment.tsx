import { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  QrCode,
  Download,
  Printer,
  Calendar,
  Paperclip,
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
import QRCodeGenerator from "@/components/equipment/QRCodeGenerator";
import { MaintenanceScheduleManager } from "@/components/equipment/MaintenanceScheduleManager";
import { EquipmentFilesManager } from "@/components/equipment/EquipmentFilesManager";

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  installation_date: string;
  location: string;
  status: "active" | "maintenance" | "inactive";
  qr_code?: string;
  notes?: string;
  created_at: string;
}

const statusConfig = {
  active: { label: "Ativo", color: "bg-green-600 hover:bg-green-700", bgGradient: "from-green-500/10 to-emerald-500/10 border-green-200/30", icon: CheckCircle },
  available: { label: "Disponível", color: "bg-green-600 hover:bg-green-700", bgGradient: "from-green-500/10 to-emerald-500/10 border-green-200/30", icon: CheckCircle },
  maintenance: { label: "Manutenção", color: "bg-orange-600 hover:bg-orange-700", bgGradient: "from-orange-500/10 to-amber-500/10 border-orange-200/30", icon: Settings },
  busy: { label: "Em Uso", color: "bg-blue-600 hover:bg-blue-700", bgGradient: "from-blue-500/10 to-cyan-500/10 border-blue-200/30", icon: Settings },
  inactive: { label: "Inativo", color: "bg-gray-600 hover:bg-gray-700", bgGradient: "from-gray-500/10 to-slate-500/10 border-gray-200/30", icon: AlertTriangle },
};

export default function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null,
  );
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedEquipmentForQR, setSelectedEquipmentForQR] =
    useState<Equipment | null>(null);
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [selectedEquipmentForSchedules, setSelectedEquipmentForSchedules] =
    useState<Equipment | null>(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedEquipmentForFiles, setSelectedEquipmentForFiles] =
    useState<Equipment | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    equipment_type: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    location: "",
    status: "active" as "active" | "maintenance" | "inactive",
    notes: "",
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("equipment");
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome do equipamento é obrigatório",
      });
      return;
    }

    try {
      const path = editingEquipment
        ? `equipment/${editingEquipment.id}`
        : "equipment";
      const method = editingEquipment ? "PUT" : "POST";

      const response = await apiFetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: editingEquipment
            ? "Equipamento atualizado"
            : "Equipamento criado",
          description: "Equipamento guardado com sucesso",
        });
        loadEquipment();
        resetForm();
      } else {
        const error = await response.json();
        toast({
          variant: "destructive",
          title: "Erro",
          description: error.error || "Erro ao guardar equipamento",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao guardar equipamento",
      });
    }
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name,
      equipment_type: eq.equipment_type || "",
      manufacturer: eq.manufacturer || "",
      model: eq.model || "",
      serial_number: eq.serial_number || "",
      installation_date: eq.installation_date || "",
      location: eq.location || "",
      status: eq.status,
      notes: eq.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar este equipamento?")) return;

    try {
      const response = await apiFetch(`equipment/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Equipamento eliminado",
          description: "Equipamento removido com sucesso",
        });
        loadEquipment();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar equipamento",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      equipment_type: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      installation_date: "",
      location: "",
      status: "active",
      notes: "",
    });
    setEditingEquipment(null);
    setShowForm(false);
  };

  const handleGenerateQR = (eq: Equipment) => {
    setSelectedEquipmentForQR(eq);
    setShowQRCode(true);
  };

  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.equipment_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    active: equipment.filter(e => e.status === "active").length,
    maintenance: equipment.filter(e => e.status === "maintenance").length,
    inactive: equipment.filter(e => e.status === "inactive").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-8 -right-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-8 -left-20 w-40 h-40 bg-indigo-600/15 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-2 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg">
                <Activity className="h-8 w-8 text-white" />
              </div>
              Equipamentos
            </h1>
            <p className="text-lg text-muted-foreground">
              Gestão de equipamentos e máquinas industriais
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 h-11 px-6"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Equipamento
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-emerald-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-emerald-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Equipamentos Ativos</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{statusCounts.active}</div>
            <p className="text-xs text-slate-400 mt-2">Em operação</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-orange-500/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-orange-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Em Manutenção</CardTitle>
            <Settings className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{statusCounts.maintenance}</div>
            <p className="text-xs text-slate-400 mt-2">Sob manutenção</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-600/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-slate-500/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold text-slate-200">Inativos</CardTitle>
            <AlertTriangle className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-50">{statusCounts.inactive}</div>
            <p className="text-xs text-slate-400 mt-2">Fora de serviço</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar por nome, tipo ou número de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-slate-700/30 text-slate-50 placeholder:text-slate-400"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[220px] bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-slate-700/30 text-slate-50">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estados</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="maintenance">Em Manutenção</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {loading ? (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">A carregar equipamentos...</p>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((eq) => {
            const statusInfo = statusConfig[eq.status] || statusConfig.inactive;
            const StatusIcon = statusInfo.icon;
            return (
              <Card
                key={eq.id}
                className={`bg-gradient-to-br from-slate-800/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-foreground">{eq.name}</CardTitle>
                      <CardDescription className="mt-1">
                        ID: {eq.id}
                      </CardDescription>
                    </div>
                    <div className="p-2 bg-background/50 rounded-lg">
                      <Activity className="h-5 w-5 text-foreground/60" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Estado:
                      </span>
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {eq.equipment_type && (
                      <div className="flex items-center justify-between border-t border-border/30 pt-2">
                        <span className="text-sm text-muted-foreground">
                          Tipo:
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {eq.equipment_type}
                        </span>
                      </div>
                    )}
                    {eq.manufacturer && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Fabricante:
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {eq.manufacturer}
                        </span>
                      </div>
                    )}
                    {eq.serial_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Série:
                        </span>
                        <span className="text-xs font-mono text-foreground">{eq.serial_number}</span>
                      </div>
                    )}
                    {eq.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Localização:
                        </span>
                        <span className="text-sm text-foreground">{eq.location}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 flex-wrap border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 mt-2"
                        onClick={() => handleEdit(eq)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setSelectedEquipmentForSchedules(eq);
                          setShowSchedulesModal(true);
                        }}
                        title="Agendamentos de manutenção"
                      >
                        <Calendar className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setSelectedEquipmentForFiles(eq);
                          setShowFilesModal(true);
                        }}
                        title="Ficheiros"
                      >
                        <Paperclip className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleGenerateQR(eq)}
                        title="Gerar QR Code"
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleDelete(eq.id)}
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
      )}

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card/80 to-card/50 backdrop-blur border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingEquipment ? "Editar Equipamento" : "Novo Equipamento"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do equipamento
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Equipamento *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Compressor Principal"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                <Input
                  id="equipment_type"
                  value={formData.equipment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment_type: e.target.value })
                  }
                  placeholder="Ex: Compressor, Bomba, Motor"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                  placeholder="Ex: Atlas Copco"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="Ex: GA55"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Número de Série</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) =>
                    setFormData({ ...formData, serial_number: e.target.value })
                  }
                  placeholder="Ex: SN123456789"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installation_date">Data de Instalação</Label>
                <Input
                  id="installation_date"
                  type="date"
                  value={formData.installation_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installation_date: e.target.value,
                    })
                  }
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Ex: Setor A - Linha 1"
                  className="bg-background/50 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Informações adicionais sobre o equipamento..."
                  rows={3}
                  className="bg-background/50 border-border/50"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border/50 pt-4 mt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                {editingEquipment ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md bg-gradient-to-br from-card/80 to-card/50 backdrop-blur border-border/50">
          <DialogHeader>
            <DialogTitle>Etiqueta com QR Code</DialogTitle>
            <DialogDescription>
              {selectedEquipmentForQR?.name} (ID: {selectedEquipmentForQR?.id})
            </DialogDescription>
          </DialogHeader>
          {selectedEquipmentForQR && (
            <QRCodeGenerator
              equipmentId={selectedEquipmentForQR.id.toString()}
              equipmentName={selectedEquipmentForQR.name}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRCode(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Schedules Modal */}
      <Dialog open={showSchedulesModal} onOpenChange={setShowSchedulesModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card/80 to-card/50 backdrop-blur border-border/50">
          <DialogHeader>
            <DialogTitle>Agendamentos de Manutenção</DialogTitle>
            <DialogDescription>
              Gerenciar manutenções preventivas para{" "}
              {selectedEquipmentForSchedules?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEquipmentForSchedules && (
            <MaintenanceScheduleManager
              equipmentId={selectedEquipmentForSchedules.id}
              equipmentName={selectedEquipmentForSchedules.name}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSchedulesModal(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Files Manager Modal */}
      {selectedEquipmentForFiles && (
        <EquipmentFilesManager
          equipment_id={selectedEquipmentForFiles.id}
          equipment_name={selectedEquipmentForFiles.name}
          open={showFilesModal}
          onOpenChange={setShowFilesModal}
        />
      )}
    </div>
  );
}
