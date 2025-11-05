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

interface Equipment {
  id: number;
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
  active: { label: "Ativo", color: "bg-green-600", icon: CheckCircle },
  available: { label: "Disponível", color: "bg-green-600", icon: CheckCircle },
  maintenance: { label: "Manutenção", color: "bg-orange-600", icon: Settings },
  busy: { label: "Em Uso", color: "bg-blue-600", icon: Settings },
  inactive: { label: "Inativo", color: "bg-gray-600", icon: AlertTriangle },
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

  const handleDelete = async (id: number) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Equipamentos
          </h1>
          <p className="text-muted-foreground">
            Gestão de equipamentos e máquinas industriais
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Equipamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar equipamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Estados</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {loading ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            A carregar equipamentos...
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((eq) => {
            const statusInfo = statusConfig[eq.status] || statusConfig.inactive;
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={eq.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{eq.name}</CardTitle>
                      <CardDescription>ID: {eq.id}</CardDescription>
                    </div>
                    <Activity className="h-5 w-5 text-muted-foreground" />
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Tipo:
                        </span>
                        <span className="text-sm font-medium">
                          {eq.equipment_type}
                        </span>
                      </div>
                    )}
                    {eq.serial_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Série:
                        </span>
                        <span className="text-sm">{eq.serial_number}</span>
                      </div>
                    )}
                    {eq.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Localização:
                        </span>
                        <span className="text-sm">{eq.location}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(eq)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateQR(eq)}
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
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
                  placeholder="Ex: Compressor, Bomba, Motor, etc."
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
                  <SelectTrigger>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingEquipment ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md">
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
    </div>
  );
}
