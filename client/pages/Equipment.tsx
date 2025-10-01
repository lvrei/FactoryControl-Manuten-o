import { useState, useEffect } from "react";
import {
  Factory,
  Plus,
  Edit,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  X,
  Play,
  Pause,
  Square,
  Wrench,
  Gauge,
  Ruler,
  Upload,
  Image,
  File,
  Download,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { BackToOperatorButton } from "@/components/BackToOperatorButton";
import { Machine, MachineFile } from "@/types/production";
import { productionService } from "@/services/productionService";
import { camerasService } from "@/services/camerasService";

interface EquipmentDetails extends Machine {
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  operatingHours: number;
  notes?: string;
  coverPhoto?: string;
  files: MachineFile[];
}

export default function Equipment() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if came from operator portal
  const fromOperator =
    location.state?.fromOperator || location.search.includes("from=operator");
  const [equipment, setEquipment] = useState<EquipmentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] =
    useState<EquipmentDetails | null>(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedEquipmentForFiles, setSelectedEquipmentForFiles] =
    useState<EquipmentDetails | null>(null);
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({});

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [selectedEquipmentForCamera, setSelectedEquipmentForCamera] =
    useState<EquipmentDetails | null>(null);
  const [equipmentCameras, setEquipmentCameras] = useState<
    { id: string; name: string; url: string; protocol?: string }[]
  >([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "BZM" as "BZM" | "CAROUSEL" | "PRE_CNC" | "CNC",
    status: "available" as "available" | "busy" | "maintenance" | "offline",
    location: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    maxDimensions: { length: 0, width: 0, height: 0 },
    cuttingPrecision: 0,
    installationDate: "",
    nextMaintenance: "",
    notes: "",
    coverPhoto: "",
    files: [],
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      // Buscar máquinas do sistema de produção
      const [machines, allCameras] = await Promise.all([
        productionService.getMachines(),
        camerasService.listAll().catch(() => []),
      ]);

      const counts: Record<string, number> = {};
      for (const cam of allCameras) {
        if (cam.machineId)
          counts[cam.machineId] = (counts[cam.machineId] || 0) + 1;
      }
      setCameraCounts(counts);

      // Converter para formato estendido com dados salvos no localStorage
      const savedEquipment = localStorage.getItem("factoryControl_equipment");
      const equipmentDetails = savedEquipment ? JSON.parse(savedEquipment) : [];

      const equipmentList: EquipmentDetails[] = machines.map((machine) => {
        const existingDetails = equipmentDetails.find(
          (eq: any) => eq.id === machine.id,
        );
        return {
          ...machine,
          location:
            existingDetails?.location || getDefaultLocation(machine.type),
          manufacturer: existingDetails?.manufacturer || "Fabricante Padr��o",
          model: existingDetails?.model || machine.type + "-Model",
          serialNumber: existingDetails?.serialNumber || `SN-${machine.id}`,
          installationDate: existingDetails?.installationDate || "2023-01-01",
          lastMaintenance: existingDetails?.lastMaintenance,
          nextMaintenance: existingDetails?.nextMaintenance,
          operatingHours: existingDetails?.operatingHours || 0,
          notes: existingDetails?.notes || "",
        };
      });

      setEquipment(equipmentList);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultLocation = (type: string): string => {
    switch (type) {
      case "BZM":
        return "Setor A - Corte Inicial";
      case "CAROUSEL":
        return "Setor B - Coxins";
      case "PRE_CNC":
        return "Setor C - Pré-processamento";
      case "CNC":
        return "Setor D - Acabamento";
      default:
        return "Setor Geral";
    }
  };

  const saveEquipmentDetails = (equipmentList: EquipmentDetails[]) => {
    const detailsToSave = equipmentList.map((eq) => ({
      id: eq.id,
      location: eq.location,
      manufacturer: eq.manufacturer,
      model: eq.model,
      serialNumber: eq.serialNumber,
      installationDate: eq.installationDate,
      lastMaintenance: eq.lastMaintenance,
      nextMaintenance: eq.nextMaintenance,
      operatingHours: eq.operatingHours,
      notes: eq.notes,
    }));
    localStorage.setItem(
      "factoryControl_equipment",
      JSON.stringify(detailsToSave),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      alert("Preencha pelo menos nome e tipo");
      return;
    }

    try {
      if (editingEquipment) {
        // Atualizar equipamento existente
        const updatedEquipment: EquipmentDetails = {
          ...editingEquipment,
          name: formData.name,
          type: formData.type,
          status: formData.status,
          location: formData.location,
          manufacturer: formData.manufacturer,
          model: formData.model,
          serialNumber: formData.serialNumber,
          maxDimensions: formData.maxDimensions,
          cuttingPrecision: formData.cuttingPrecision,
          installationDate: formData.installationDate,
          nextMaintenance: formData.nextMaintenance,
          notes: formData.notes,
        };

        // Atualizar no sistema de produção
        await productionService.updateMachine(editingEquipment.id, {
          name: formData.name,
          type: formData.type,
          status: formData.status,
          maxDimensions: formData.maxDimensions,
          cuttingPrecision: formData.cuttingPrecision,
        });

        const updatedList = equipment.map((eq) =>
          eq.id === editingEquipment.id ? updatedEquipment : eq,
        );
        setEquipment(updatedList);
        saveEquipmentDetails(updatedList);
      } else {
        // Criar novo equipamento
        const newMachine = await productionService.createMachine({
          name: formData.name,
          type: formData.type,
          status: formData.status,
          maxDimensions: formData.maxDimensions,
          cuttingPrecision: formData.cuttingPrecision,
        });

        const newEquipment: EquipmentDetails = {
          ...newMachine,
          location: formData.location,
          manufacturer: formData.manufacturer,
          model: formData.model,
          serialNumber: formData.serialNumber,
          installationDate: formData.installationDate,
          nextMaintenance: formData.nextMaintenance,
          operatingHours: 0,
          notes: formData.notes,
        };

        const updatedList = [...equipment, newEquipment];
        setEquipment(updatedList);
        saveEquipmentDetails(updatedList);
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao salvar equipamento:", error);
      alert("Erro ao salvar equipamento");
    }
  };

  const handleEdit = (eq: EquipmentDetails) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name,
      type: eq.type,
      status: eq.status,
      location: eq.location,
      manufacturer: eq.manufacturer,
      model: eq.model,
      serialNumber: eq.serialNumber,
      maxDimensions: eq.maxDimensions,
      cuttingPrecision: eq.cuttingPrecision,
      installationDate: eq.installationDate,
      nextMaintenance: eq.nextMaintenance || "",
      notes: eq.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;

    try {
      await productionService.deleteMachine(id);
      const updatedList = equipment.filter((eq) => eq.id !== id);
      setEquipment(updatedList);
      saveEquipmentDetails(updatedList);
    } catch (error) {
      console.error("Erro ao excluir equipamento:", error);
      alert("Erro ao excluir equipamento");
    }
  };

  const handleFileUpload = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const addFileToEquipment = async (
    equipmentId: string,
    file: File,
    type: "photo" | "manual" | "certificate" | "maintenance" | "other",
  ) => {
    try {
      const url = await handleFileUpload(file);

      const newFile: MachineFile = {
        id: Date.now().toString(),
        name: file.name,
        type,
        url,
        uploadedBy: "Utilizador Atual",
        uploadedAt: new Date().toISOString(),
        size: file.size,
      };

      const updatedEquipment = equipment.map((eq) =>
        eq.id === equipmentId
          ? { ...eq, files: [...(eq.files || []), newFile] }
          : eq,
      );

      setEquipment(updatedEquipment);
      saveEquipmentDetails(updatedEquipment);

      return newFile;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      throw error;
    }
  };

  const setCoverPhoto = async (equipmentId: string, file: File) => {
    try {
      const url = await handleFileUpload(file);

      const updatedEquipment = equipment.map((eq) =>
        eq.id === equipmentId ? { ...eq, coverPhoto: url } : eq,
      );

      setEquipment(updatedEquipment);
      saveEquipmentDetails(updatedEquipment);
    } catch (error) {
      console.error("Erro ao definir foto de capa:", error);
      throw error;
    }
  };

  const removeFile = (equipmentId: string, fileId: string) => {
    const updatedEquipment = equipment.map((eq) =>
      eq.id === equipmentId
        ? { ...eq, files: eq.files?.filter((f) => f.id !== fileId) || [] }
        : eq,
    );

    setEquipment(updatedEquipment);
    saveEquipmentDetails(updatedEquipment);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "BZM",
      status: "available",
      location: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      maxDimensions: { length: 0, width: 0, height: 0 },
      cuttingPrecision: 0,
      installationDate: "",
      nextMaintenance: "",
      notes: "",
    });
    setEditingEquipment(null);
  };

  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || eq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    available: {
      color: "text-green-600 bg-green-50",
      label: "Disponível",
      icon: CheckCircle,
    },
    busy: {
      color: "text-yellow-600 bg-yellow-50",
      label: "Em Uso",
      icon: Clock,
    },
    maintenance: {
      color: "text-red-600 bg-red-50",
      label: "Manutenção",
      icon: Wrench,
    },
    offline: {
      color: "text-gray-600 bg-gray-50",
      label: "Offline",
      icon: AlertTriangle,
    },
  };

  const typeConfig = {
    BZM: { label: "BZM - Corte Inicial", icon: "🔪" },
    CAROUSEL: { label: "Carrossel - Coxins", icon: "🔄" },
    PRE_CNC: { label: "Pré-CNC", icon: "⚙️" },
    CNC: { label: "CNC - Acabamento", icon: "🎯" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">
          Carregando equipamentos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {fromOperator && (
            <BackToOperatorButton useRouter={true} variant="header" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Gestão de Equipamentos
            </h1>
            <p className="text-muted-foreground">
              Máquinas de corte de espuma da fábrica
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Equipamento
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">
                {equipment.length}
              </p>
            </div>
            <Factory className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Disponível
              </p>
              <p className="text-2xl font-bold text-green-600">
                {equipment.filter((eq) => eq.status === "available").length}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Em Uso
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {equipment.filter((eq) => eq.status === "busy").length}
              </p>
            </div>
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Manutenção
              </p>
              <p className="text-2xl font-bold text-red-600">
                {equipment.filter((eq) => eq.status === "maintenance").length}
              </p>
            </div>
            <Wrench className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar equipamentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background min-w-[150px]"
        >
          <option value="all">Todos os status</option>
          <option value="available">Disponível</option>
          <option value="busy">Em Uso</option>
          <option value="maintenance">Manutenção</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Equipment Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map((eq) => {
          const statusInfo = statusConfig[eq.status] || statusConfig.offline;
          const StatusIcon = statusInfo.icon;

          return (
            <div key={eq.id} className="bg-card border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {typeConfig[eq.type]?.icon || "⚙️"}
                    </span>
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                      {eq.name}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        title="Câmaras associadas"
                      >
                        🎥 {cameraCounts[eq.id] || 0}
                      </span>
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {typeConfig[eq.type]?.label || "Equipamento"}
                  </p>
                  <p className="text-xs text-muted-foreground">{eq.location}</p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedEquipmentForFiles(eq);
                      setShowFileManager(true);
                    }}
                    className="p-1 text-muted-foreground hover:text-info"
                    title="Gerir Ficheiros"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setSelectedEquipmentForCamera(eq);
                        const cams = await camerasService.listByMachine(eq.id);
                        setEquipmentCameras(
                          cams.map((c) => ({
                            id: c.id,
                            name: c.name,
                            url: c.url,
                            protocol: c.protocol,
                          })),
                        );
                        setSelectedCameraId(cams[0]?.id || null);
                        setShowCameraModal(true);
                      } catch (e) {
                        alert("Sem câmaras associadas ou erro ao carregar.");
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-blue-600"
                    title="Ver Câmara"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(eq)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      navigate(`/alerts?tab=history&machine=${eq.id}`)
                    }
                    className="p-1 text-muted-foreground hover:text-blue-600"
                    title="Ver Histórico de Manutenção"
                  >
                    <Wrench className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(eq.id)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                      statusInfo.color,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Dimensões max:
                  </span>
                  <span className="text-sm font-medium">
                    {eq.maxDimensions.length / 1000}×
                    {eq.maxDimensions.width / 1000}×
                    {eq.maxDimensions.height / 1000}m
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Precisão:
                  </span>
                  <span className="text-sm font-medium">
                    {eq.cuttingPrecision}mm
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Fabricante:
                  </span>
                  <span className="text-sm font-medium">{eq.manufacturer}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Modelo:</span>
                  <span className="text-sm font-medium">{eq.model}</span>
                </div>

                {eq.nextMaintenance && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Próxima manutenção:
                      </span>
                      <span className="text-xs font-medium">
                        {new Date(eq.nextMaintenance).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {eq.currentOperator && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Operador atual:
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {eq.currentOperator}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <Factory className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            {searchTerm || statusFilter !== "all"
              ? "Nenhum equipamento encontrado"
              : "Nenhum equipamento cadastrado"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Comece adicionando o primeiro equipamento"}
          </p>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && selectedEquipmentForCamera && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  Câmara — {selectedEquipmentForCamera.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione a câmara abaixo para visualizar
                </p>
              </div>
              <button
                onClick={() => setShowCameraModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1 space-y-2 overflow-auto max-h-[60vh] pr-2 border-r">
                {equipmentCameras.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma câmara associada.
                  </div>
                )}
                {equipmentCameras.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCameraId(c.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded border",
                      selectedCameraId === c.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {c.protocol || "rtsp"} • {c.url}
                    </div>
                  </button>
                ))}
              </div>
              <div className="md:col-span-2 min-h-[50vh] bg-black/80 flex items-center justify-center">
                {(() => {
                  const cam = equipmentCameras.find((cc) => cc.id === selectedCameraId);
                  if (!cam)
                    return <div className="text-sm text-muted-foreground">Selecione uma câmara</div>;

                  const MJpegOrPollingImage: React.FC<{ camId: string; alt: string; isHttp: boolean }> = ({ camId, alt, isHttp }) => {
                    const [fallback, setFallback] = useState<boolean>(isHttp);
                    const [src, setSrc] = useState<string>(
                      isHttp ? camerasService.getSnapshotUrl(camId) : camerasService.getMjpegUrl(camId),
                    );
                    useEffect(() => {
                      if (!fallback) return;
                      const interval = setInterval(() => {
                        setSrc(camerasService.getSnapshotUrl(camId));
                      }, 1000);
                      return () => clearInterval(interval);
                    }, [fallback, camId]);
                    return (
                      <img
                        src={src}
                        alt={alt}
                        className="max-h-[70vh] w-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={() => {
                          // If MJPEG fails, start polling snapshots
                          setFallback(true);
                          setSrc(camerasService.getSnapshotUrl(camId));
                        }}
                      />
                    );
                  };

                  const isHttp = cam.protocol === "http" || cam.url.startsWith("http");
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-black/50">
                      <MJpegOrPollingImage camId={cam.id} alt={cam.name} isHttp={isHttp} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingEquipment ? "Editar Equipamento" : "Novo Equipamento"}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome do Equipamento *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: BZM-02, Carrossel-03"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="BZM">BZM - Corte Inicial</option>
                      <option value="CAROUSEL">Carrossel - Coxins</option>
                      <option value="PRE_CNC">Pré-CNC</option>
                      <option value="CNC">CNC - Acabamento</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="available">Disponível</option>
                      <option value="busy">Em Uso</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Localização
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: Setor A - Linha 1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Fabricante
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          manufacturer: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Nome do fabricante"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          model: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Modelo do equipamento"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Número de Série
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          serialNumber: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="SN-123456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Precisão de Corte (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cuttingPrecision}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cuttingPrecision: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: 0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dimensões Máximas (mm)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Comprimento
                      </label>
                      <input
                        type="number"
                        value={formData.maxDimensions.length}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxDimensions: {
                              ...prev.maxDimensions,
                              length: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="40000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Largura
                      </label>
                      <input
                        type="number"
                        value={formData.maxDimensions.width}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxDimensions: {
                              ...prev.maxDimensions,
                              width: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Altura
                      </label>
                      <input
                        type="number"
                        value={formData.maxDimensions.height}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxDimensions: {
                              ...prev.maxDimensions,
                              height: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="2000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Data de Instalação
                    </label>
                    <input
                      type="date"
                      value={formData.installationDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          installationDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Próxima Manutenção
                    </label>
                    <input
                      type="date"
                      value={formData.nextMaintenance}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          nextMaintenance: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    rows={3}
                    placeholder="Observações adicionais sobre o equipamento..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    {editingEquipment ? "Atualizar" : "Adicionar"} Equipamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* File Manager Modal */}
      {showFileManager && selectedEquipmentForFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  Ficheiros - {selectedEquipmentForFiles.name}
                </h3>
                <button
                  onClick={() => {
                    setShowFileManager(false);
                    setSelectedEquipmentForFiles(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Cover Photo Section */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">Foto de Capa</h4>
                <div className="flex items-center gap-4">
                  {selectedEquipmentForFiles.coverPhoto ? (
                    <div className="relative">
                      <img
                        src={selectedEquipmentForFiles.coverPhoto}
                        alt="Foto de capa"
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => {
                          const updated = equipment.map((eq) =>
                            eq.id === selectedEquipmentForFiles.id
                              ? { ...eq, coverPhoto: undefined }
                              : eq,
                          );
                          setEquipment(updated);
                          setSelectedEquipmentForFiles((prev) =>
                            prev ? { ...prev, coverPhoto: undefined } : null,
                          );
                          saveEquipmentDetails(updated);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            await setCoverPhoto(
                              selectedEquipmentForFiles.id,
                              file,
                            );
                            const updated = equipment.find(
                              (eq) => eq.id === selectedEquipmentForFiles.id,
                            );
                            if (updated) setSelectedEquipmentForFiles(updated);
                          } catch (error) {
                            alert("Erro ao definir foto de capa");
                          }
                        }
                      }}
                      className="hidden"
                      id="coverPhoto"
                    />
                    <label
                      htmlFor="coverPhoto"
                      className="px-3 py-2 text-sm font-medium border rounded-lg hover:bg-muted cursor-pointer flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {selectedEquipmentForFiles.coverPhoto
                        ? "Alterar Foto"
                        : "Adicionar Foto"}
                    </label>
                  </div>
                </div>
              </div>

              {/* Files Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium">Documentos</h4>
                  <div>
                    <input
                      type="file"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          try {
                            await addFileToEquipment(
                              selectedEquipmentForFiles.id,
                              file,
                              "manual",
                            );
                          } catch (error) {
                            alert(`Erro ao fazer upload de ${file.name}`);
                          }
                        }
                        const updated = equipment.find(
                          (eq) => eq.id === selectedEquipmentForFiles.id,
                        );
                        if (updated) setSelectedEquipmentForFiles(updated);
                      }}
                      className="hidden"
                      id="fileUpload"
                    />
                    <label
                      htmlFor="fileUpload"
                      className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 cursor-pointer flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Ficheiros
                    </label>
                  </div>
                </div>

                {/* Files List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(selectedEquipmentForFiles.files || []).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <File className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Nenhum ficheiro adicionado</p>
                    </div>
                  ) : (
                    selectedEquipmentForFiles.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB •{" "}
                              {new Date(file.uploadedAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Open file in new tab
                              window.open(file.url, "_blank");
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Ver ficheiro"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Download file
                              const link = document.createElement("a");
                              link.href = file.url;
                              link.download = file.name;
                              link.click();
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Descarregar"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Remover este ficheiro?")) {
                                removeFile(
                                  selectedEquipmentForFiles.id,
                                  file.id,
                                );
                                const updated = equipment.find(
                                  (eq) =>
                                    eq.id === selectedEquipmentForFiles.id,
                                );
                                if (updated)
                                  setSelectedEquipmentForFiles(updated);
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowFileManager(false);
                    setSelectedEquipmentForFiles(null);
                  }}
                  className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
