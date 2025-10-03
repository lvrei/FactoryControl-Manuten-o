import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Factory,
  Calendar,
  User,
  Settings,
  MessageCircle,
  TrendingUp,
  Clock,
  Package,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Edit,
  Eye,
  Play,
  Pause,
  Square,
  Trash2,
  Printer,
} from "lucide-react";
import {
  ProductionOrder,
  Machine,
  OperatorSession,
  ProductionFilters,
  ProductionOrderLine,
} from "@/types/production";
import { productionService } from "@/services/productionService";
import { ProductionOrderManager } from "@/components/production/ProductionOrderManager";
import NestingModalPolygon from "@/components/production/NestingModalPolygon";
import { Layers } from "lucide-react";
import { ProductSheetsManager } from "@/components/production/ProductSheetsManager";
import {
  ProductionChat,
  useChatNotifications,
} from "@/components/production/ProductionChat";
import { cn } from "@/lib/utils";
import { BackToOperatorButton } from "@/components/BackToOperatorButton";
import { useLocation } from "react-router-dom";

function ProductionNew() {
  const location = useLocation();
  const fromOperator = location.search.includes("from=operator");
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    [],
  );
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operatorSessions, setOperatorSessions] = useState<OperatorSession[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"orders" | "machines" | "sheets">(
    "orders",
  );

  const getMachineName = (id: string) =>
    machines.find((m) => m.id === id)?.name || id;

  const printOrder = (order: ProductionOrder) => {
    try {
      const win = window.open("", "_blank");
      if (!win)
        return alert("Não foi possível abrir a pré-visualização de impressão");
      const css = `
        body { font-family: Arial, sans-serif; color: #111; }
        h1 { margin: 0 0 8px; }
        .meta { margin: 4px 0; font-size: 12px; color: #444; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
        th { background: #f5f5f5; text-align: left; }
        .section { margin-top: 16px; }
      `;

      const linesHtml = (order.lines || [])
        .map((line, idx) => {
          const ops = (line.cuttingOperations || [])
            .map((op) => {
              const out = op.outputDimensions || line.finalDimensions;
              return `<tr>
            <td>${getMachineName(op.machineId)}</td>
            <td>${op.quantity || 0}</td>
            <td>${out.length} × ${out.width} × ${out.height} mm</td>
          </tr>`;
            })
            .join("");
          return `
          <div class="section">
            <h3>Linha ${idx + 1}</h3>
            <div class="meta">Blocos BZM: <strong>${line.quantity}</strong> • Medidas Finais: <strong>${line.finalDimensions.length} × ${line.finalDimensions.width} × ${line.finalDimensions.height} mm</strong></div>
            <table>
              <thead><tr><th>Máquina</th><th>Qtd</th><th>Medidas (mm)</th></tr></thead>
              <tbody>${ops || `<tr><td colspan="3">Sem operações</td></tr>`}</tbody>
            </table>
          </div>
        `;
        })
        .join("");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OP ${order.orderNumber}</title>
  <style>${css}</style>
</head>
<body>
  <h1>Ordem de Produção ${order.orderNumber}</h1>
  <div class="meta">Cliente: <strong>${order.customer?.name || ""}</strong></div>
  <div class="meta">Entrega Prevista: <strong>${new Date(order.expectedDeliveryDate).toLocaleDateString("pt-PT")}</strong></div>
  <div class="meta">Prioridade: <strong>${order.priority}</strong> • Estado: <strong>${order.status}</strong></div>
  <div class="section">
    <h2>Linhas</h2>
    ${linesHtml}
  </div>
</body>
</html>`;

      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 300);
    } catch (e) {
      console.error("Erro ao imprimir OP", e);
      alert("Erro ao gerar impressão da OP");
    }
  };
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showNesting, setShowNesting] = useState(false);
  const [nestingLines, setNestingLines] = useState<
    ProductionOrderLine[] | null
  >(null);
  const [showSheetsManager, setShowSheetsManager] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(
    null,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ProductionFilters>({
    status: [],
    priority: [],
    customer: "",
    machine: "",
    foamType: "",
  });

  const { unreadCount } = useChatNotifications();

  useEffect(() => {
    loadData();

    // Pausar auto-refresh quando qualquer modal está aberto
    const hasModalOpen =
      showNesting || showOrderForm || showSheetsManager || showChat;

    if (hasModalOpen) {
      console.log("⏸️  Auto-refresh pausado (modal aberto)");
      return; // Não criar interval se houver modal aberto
    }

    const interval = setInterval(loadData, 30000); // Atualizar a cada 30 segundos
    console.log("▶️  Auto-refresh ativo (30s)");
    return () => {
      clearInterval(interval);
      console.log("⏹️  Auto-refresh limpo");
    };
  }, [showNesting, showOrderForm, showSheetsManager, showChat]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orders, machinesData, sessions] = await Promise.all([
        productionService.getProductionOrders(filters),
        productionService.getMachines(),
        productionService.getOperatorSessions(true),
      ]);

      console.log(`📋 Loaded ${orders.length} production orders`);
      setProductionOrders(orders);
      setMachines(machinesData);
      setOperatorSessions(sessions);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados de produção");
    } finally {
      setLoading(false);
    }
  };

  const changePriority = async (
    orderId: string,
    newPriority: ProductionOrder["priority"],
  ) => {
    try {
      await productionService.updateProductionOrder(orderId, {
        priority: newPriority,
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao alterar prioridade:", error);
      alert("Erro ao alterar prioridade");
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: ProductionOrder["status"],
  ) => {
    try {
      await productionService.updateProductionOrder(orderId, {
        status: newStatus,
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar status");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ordem de produção?"))
      return;

    try {
      await productionService.deleteProductionOrder(orderId);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir ordem:", error);
      alert("Erro ao excluir ordem");
    }
  };

  const filteredOrders = (productionOrders || []).filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filters.status?.length === 0 || filters.status?.includes(order.status);
    const matchesPriority =
      filters.priority?.length === 0 ||
      filters.priority?.includes(order.priority);
    const matchesCustomer =
      !filters.customer ||
      order.customer.name
        .toLowerCase()
        .includes(filters.customer.toLowerCase());

    return matchesSearch && matchesStatus && matchesPriority && matchesCustomer;
  });

  const priorityConfig = {
    low: {
      color: "text-green-600 bg-green-50 border-green-200",
      label: "Baixa",
    },
    medium: {
      color: "text-yellow-600 bg-yellow-50 border-yellow-200",
      label: "Média",
    },
    high: {
      color: "text-orange-600 bg-orange-50 border-orange-200",
      label: "Alta",
    },
    urgent: {
      color: "text-red-600 bg-red-50 border-red-200",
      label: "Urgente",
    },
  };

  const statusConfig = {
    created: { color: "text-blue-600 bg-blue-50", label: "Criada" },
    in_progress: {
      color: "text-purple-600 bg-purple-50",
      label: "Em Andamento",
    },
    completed: { color: "text-green-600 bg-green-50", label: "Concluída" },
    cancelled: { color: "text-gray-600 bg-gray-50", label: "Cancelada" },
    shipped: { color: "text-teal-600 bg-teal-50", label: "Expedida" },
  };

  const machineStatusConfig = {
    available: { color: "text-green-600 bg-green-50", label: "Disponível" },
    busy: { color: "text-yellow-600 bg-yellow-50", label: "Ocupada" },
    maintenance: { color: "text-red-600 bg-red-50", label: "Manutenção" },
    offline: { color: "text-gray-600 bg-gray-50", label: "Offline" },
  };

  // Estatísticas
  const totalOrders = (productionOrders || []).length;
  const inProgressOrders = (productionOrders || []).filter(
    (o) => o.status === "in_progress",
  ).length;
  const completedOrders = (productionOrders || []).filter(
    (o) => o.status === "completed",
  ).length;
  const urgentOrders = (productionOrders || []).filter(
    (o) => o.priority === "urgent",
  ).length;
  const activeMachines = (machines || []).filter(
    (m) => m.status === "busy",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">
          Carregando sistema de produção...
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
            <BackToOperatorButton variant="header" useRouter={true} />
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Sistema de Produção
            </h1>
            <p className="text-muted-foreground">
              Gestão completa de ordens de produção para corte de espuma
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowChat(true)}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2 relative"
          >
            <MessageCircle className="h-4 w-4" />
            Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSheetsManager(true)}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Fichas Técnicas
          </button>

          <button
            onClick={() => setShowOrderForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Ordem
          </button>
          <button
            onClick={() => setShowNesting(true)}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Nova OP (nesting)
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Ordens
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {totalOrders}
              </p>
            </div>
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {inProgressOrders}
              </p>
            </div>
            <Play className="h-6 w-6 text-purple-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Concluídas
              </p>
              <p className="text-2xl font-bold text-green-600">
                {completedOrders}
              </p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Urgentes
              </p>
              <p className="text-2xl font-bold text-red-600">{urgentOrders}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Máquinas Ativas
              </p>
              <p className="text-2xl font-bold text-card-foreground">
                {activeMachines}/{machines.length}
              </p>
            </div>
            <Factory className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "orders"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Ordens de Produção ({productionOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("machines")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "machines"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Máquinas ({machines.length})
        </button>
      </div>

      {/* Filters and Search */}
      {activeTab === "orders" && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por número da OP ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>

          <select
            value={filters.status?.[0] || "all"}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value === "all" ? [] : [e.target.value],
              }))
            }
            className="px-3 py-2 border rounded-lg bg-background min-w-[150px]"
          >
            <option value="all">Todos os status</option>
            <option value="created">Criada</option>
            <option value="in_progress">Em Andamento</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <select
            value={filters.priority?.[0] || "all"}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                priority: e.target.value === "all" ? [] : [e.target.value],
              }))
            }
            className="px-3 py-2 border rounded-lg bg-background min-w-[150px]"
          >
            <option value="all">Todas as prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === "orders" ? (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Ordem
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Linhas
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Prioridade
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Entrega
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Valor
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isLate =
                    new Date(order.expectedDeliveryDate) < new Date() &&
                    order.status !== "completed";
                  const completedLines = order.lines.filter(
                    (line) => line.status === "completed",
                  ).length;
                  const totalOperations = order.lines.reduce(
                    (total, line) => total + line.cuttingOperations.length,
                    0,
                  );
                  const completedOperations = order.lines.reduce(
                    (total, line) =>
                      total +
                      line.cuttingOperations.filter(
                        (op) => op.status === "completed",
                      ).length,
                    0,
                  );

                  return (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">
                            {order.orderNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {completedLines}/{order.lines.length} linhas
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <div>
                          <p className="font-medium text-card-foreground">
                            {order.customer.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.totalVolume.toFixed(3)} m³
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">
                              {order.lines.length}
                            </span>{" "}
                            linhas
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {completedOperations}/{totalOperations} operações
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{
                                width: `${totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            statusConfig[order.status]?.color ||
                              "text-gray-600 bg-gray-50",
                          )}
                        >
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded border px-2 py-1 text-xs font-medium",
                              priorityConfig[order.priority]?.color ||
                                "text-gray-600 bg-gray-50 border-gray-200",
                            )}
                          >
                            {priorityConfig[order.priority]?.label ||
                              order.priority}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => {
                                const priorities: ProductionOrder["priority"][] =
                                  ["low", "medium", "high", "urgent"];
                                const currentIndex = priorities.indexOf(
                                  order.priority,
                                );
                                if (currentIndex < priorities.length - 1) {
                                  changePriority(
                                    order.id,
                                    priorities[currentIndex + 1],
                                  );
                                }
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              disabled={order.priority === "urgent"}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                const priorities: ProductionOrder["priority"][] =
                                  ["low", "medium", "high", "urgent"];
                                const currentIndex = priorities.indexOf(
                                  order.priority,
                                );
                                if (currentIndex > 0) {
                                  changePriority(
                                    order.id,
                                    priorities[currentIndex - 1],
                                  );
                                }
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              disabled={order.priority === "low"}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div
                          className={cn("text-sm", isLate && "text-red-600")}
                        >
                          <p>
                            {new Date(
                              order.expectedDeliveryDate,
                            ).toLocaleDateString("pt-BR")}
                          </p>
                          {isLate && (
                            <p className="text-xs text-red-600 font-medium">
                              Atrasado
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-sm">
                          <p className="font-medium">
                            €{order.estimatedCost.toFixed(2)}
                          </p>
                          {order.actualCost && (
                            <p className="text-xs text-muted-foreground">
                              Real: €{order.actualCost.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingOrder(order);
                              setShowOrderForm(true);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {order.status === "created" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "in_progress")
                              }
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Iniciar produção"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}

                          {order.status === "in_progress" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(order.id, "created")
                              }
                              className="p-1 text-yellow-600 hover:text-yellow-700"
                              title="Pausar produção"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => printOrder(order)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                            title="Imprimir OP"
                          >
                            <Printer className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                            title="Excluir"
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

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                {searchTerm ||
                filters.status?.length ||
                filters.priority?.length
                  ? "Nenhuma ordem encontrada"
                  : "Nenhuma ordem de produção"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                filters.status?.length ||
                filters.priority?.length
                  ? "Tente ajustar os filtros de busca"
                  : "Comece criando sua primeira ordem de produção"}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Tab de máquinas
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(machines || []).map((machine) => {
            const activeSession = operatorSessions.find(
              (s) => s.machineId === machine.id,
            );

            return (
              <div key={machine.id} className="bg-card border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {machine.name}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                        machineStatusConfig[machine.status]?.color ||
                          "text-gray-600 bg-gray-50",
                      )}
                    >
                      {machineStatusConfig[machine.status]?.label ||
                        machine.status}
                    </span>
                  </div>
                  <Factory className="h-8 w-8 text-muted-foreground" />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{machine.type}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Dimensões máx:
                    </span>
                    <span className="font-medium">
                      {machine.maxDimensions.length / 1000}×
                      {machine.maxDimensions.width / 1000}×
                      {machine.maxDimensions.height / 1000}m
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precisão:</span>
                    <span className="font-medium">
                      {machine.cuttingPrecision}mm
                    </span>
                  </div>

                  {activeSession && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Operador:</span>
                        <span className="font-medium text-primary">
                          {activeSession.operatorName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desde:</span>
                        <span className="text-xs">
                          {new Date(
                            activeSession.startTime,
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showOrderForm && (
        <ProductionOrderManager
          editingOrder={editingOrder}
          onClose={() => {
            setShowOrderForm(false);
            setEditingOrder(null);
            setNestingLines(null);
          }}
          onOrderCreated={() => {
            loadData();
          }}
          initialLines={nestingLines || undefined}
        />
      )}

      {showSheetsManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <ProductSheetsManager onClose={() => setShowSheetsManager(false)} />
          </div>
        </div>
      )}

      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full">
            <ProductionChat
              isBackend={true}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}

      {showNesting && (
        <NestingModalPolygon
          onClose={() => setShowNesting(false)}
          onApply={(lines) => {
            setNestingLines(lines);
            setShowNesting(false);
            setShowOrderForm(true);
          }}
        />
      )}
    </div>
  );
}

export default ProductionNew;
