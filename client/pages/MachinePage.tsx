import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  Wrench,
  AlertTriangle,
  Camera,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Clock,
  MapPin,
  Calendar,
  Package,
  QrCode,
} from "lucide-react";
import { productionService } from "@/services/productionService";
import { maintenanceService } from "@/services/maintenanceService";
import { camerasService } from "@/services/camerasService";
import { Machine, MaintenanceRequest } from "@/types/production";
import { QRCodeGenerator } from "@/components/equipment/QRCodeGenerator";
import { ProductionChat } from "@/components/production/ProductionChat";

export default function MachinePage() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<
    MaintenanceRequest[]
  >([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "info" | "maintenance" | "sensors" | "cameras" | "chat" | "qr"
  >("info");

  useEffect(() => {
    if (machineId) {
      loadMachineData();
    }
  }, [machineId]);

  const loadMachineData = async () => {
    try {
      setLoading(true);
      const [machines, requests, cams] = await Promise.all([
        productionService.getMachines(),
        maintenanceService.getMaintenanceRequests(),
        camerasService.listAll().catch(() => []),
      ]);

      const foundMachine = machines.find((m) => m.id === machineId);
      if (foundMachine) {
        setMachine(foundMachine);
        setMaintenanceRequests(
          requests.filter((r) => r.machineId === machineId),
        );
        setCameras(cams.filter((c) => c.machineId === machineId));
      }
    } catch (error) {
      console.error("Error loading machine data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "text-green-600 bg-green-100";
      case "busy":
        return "text-yellow-600 bg-yellow-100";
      case "maintenance":
        return "text-orange-600 bg-orange-100";
      case "offline":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponível";
      case "busy":
        return "Em Uso";
      case "maintenance":
        return "Manutenção";
      case "offline":
        return "Offline";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">
          Carregando equipamento...
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertTriangle className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-bold">Equipamento não encontrado</h2>
        <p className="text-muted-foreground">ID: {machineId}</p>
        <button
          onClick={() => navigate("/equipment")}
          className="px-6 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
        >
          Ver Todos os Equipamentos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl shadow-lg">
        <div className="p-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-blue-600/10 p-4">
                <Activity className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-foreground via-primary to-blue-600 bg-clip-text text-transparent">
                  {machine.name}
                </h1>
                <p className="text-muted-foreground font-medium">
                  {machine.type} • {machine.currentOperator || "Sem operador"}
                </p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(machine.status)}`}
            >
              {getStatusLabel(machine.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[105px] z-30 border-b border-border/40 bg-card/95 backdrop-blur-sm">
        <div className="flex overflow-x-auto scrollbar-hide px-4">
          {[
            { id: "info", label: "Informações", icon: FileText },
            {
              id: "maintenance",
              label: "Manutenção",
              icon: Wrench,
              badge: maintenanceRequests.length,
            },
            { id: "sensors", label: "Sensores", icon: Activity },
            {
              id: "cameras",
              label: "Câmaras",
              icon: Camera,
              badge: cameras.length,
            },
            { id: "chat", label: "Chat", icon: MessageSquare },
            { id: "qr", label: "QR Code", icon: QrCode },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-6xl mx-auto">
        {activeTab === "info" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-bold">Zona A - Setor 1</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-500/10 p-2">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Horas de Operação
                    </p>
                    <p className="font-bold">1,245h</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-500/10 p-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Próxima Manutenção
                    </p>
                    <p className="font-bold">15/02/2024</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Machine Details */}
            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4">Detalhes Técnicos</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-semibold">{machine.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fabricante</p>
                  <p className="font-semibold">ACME Industrial</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-semibold">X-2000 Pro</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Número de Série
                  </p>
                  <p className="font-semibold font-mono">
                    SN-2023-{machine.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Data de Instalação
                  </p>
                  <p className="font-semibold">01/01/2023</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Última Manutenção
                  </p>
                  <p className="font-semibold">01/12/2024</p>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            {machine.maxDimensions && (
              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-6 shadow-lg">
                <h3 className="text-xl font-bold mb-4">Dimensões Máximas</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Comprimento</p>
                    <p className="text-2xl font-bold text-primary">
                      {machine.maxDimensions.length}mm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Largura</p>
                    <p className="text-2xl font-bold text-primary">
                      {machine.maxDimensions.width}mm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Altura</p>
                    <p className="text-2xl font-bold text-primary">
                      {machine.maxDimensions.height}mm
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Pedidos de Manutenção</h3>
              <button
                onClick={() => navigate("/maintenance")}
                className="px-4 py-2 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold text-sm"
              >
                <Wrench className="h-4 w-4 inline mr-2" />
                Nova Manutenção
              </button>
            </div>

            {maintenanceRequests.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-12 text-center">
                <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">
                  Sem Pedidos de Manutenção
                </h3>
                <p className="text-muted-foreground">
                  Nenhum pedido registado para este equipamento
                </p>
              </div>
            ) : (
              maintenanceRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold">{request.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full font-semibold ${
                            request.urgencyLevel === "critical"
                              ? "bg-red-100 text-red-700"
                              : request.urgencyLevel === "high"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {request.urgencyLevel === "critical"
                            ? "Crítico"
                            : request.urgencyLevel === "high"
                              ? "Alta"
                              : "Média"}
                        </span>
                        <span className="text-muted-foreground">
                          Por: {request.operatorName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "sensors" && (
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-12 text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-bold mb-2">Sensores</h3>
            <p className="text-muted-foreground">
              Informação de sensores em desenvolvimento
            </p>
          </div>
        )}

        {activeTab === "cameras" && (
          <div className="space-y-4">
            {cameras.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-12 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">
                  Sem Câmaras Associadas
                </h3>
                <p className="text-muted-foreground">
                  Configure câmaras para este equipamento
                </p>
                <button
                  onClick={() => navigate("/cameras")}
                  className="mt-4 px-6 py-2.5 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                >
                  Configurar Câmaras
                </button>
              </div>
            ) : (
              cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-4 shadow-lg"
                >
                  <h4 className="font-bold">{camera.name}</h4>
                  <p className="text-sm text-muted-foreground">{camera.url}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "chat" && machine && (
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 overflow-hidden shadow-lg">
            <ProductionChat isBackend={true} machineId={machine.id} />
          </div>
        )}

        {activeTab === "qr" && machine && (
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-card/95 p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">QR Code do Equipamento</h3>
            <p className="text-muted-foreground mb-6">
              Imprima e cole na máquina para acesso rápido
            </p>
            <QRCodeGenerator
              equipmentId={machine.id}
              equipmentName={machine.name}
              size={250}
              showControls={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
