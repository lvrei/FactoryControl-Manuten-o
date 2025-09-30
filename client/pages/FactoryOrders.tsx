import { useEffect, useMemo, useState } from "react";
import { productionService } from "@/services/productionService";
import { authService } from "@/services/authService";
import {
  FoamType,
  ProductionOrder,
  ProductionOrderLine,
} from "@/types/production";
import { Plus, Save, Trash2, Layers } from "lucide-react";
import NestingModal from "@/components/production/NestingModal";

export default function FactoryOrders() {
  const user = authService.getCurrentUser();
  const factoryName = user?.factoryName || "";
  const creatorId = user?.id || user?.userId || "";

  const [loading, setLoading] = useState(true);
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);

  const [orderNumber, setOrderNumber] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<ProductionOrderLine[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNesting, setShowNesting] = useState(false);

  const totalVolume = useMemo(() => {
    return (lines || []).reduce(
      (sum, l) =>
        sum +
        (l.finalDimensions.length *
          l.finalDimensions.width *
          l.finalDimensions.height *
          l.quantity) /
          1_000_000_000,
      0,
    );
  }, [lines]);

  useEffect(() => {
    void init();
  }, []);

  async function init() {
    try {
      const [foams, ordersData] = await Promise.all([
        productionService.getFoamTypes(),
        productionService.getProductionOrders({
          customer: factoryName,
          ...(creatorId ? ({ createdBy: creatorId } as any) : {}),
        }),
      ]);
      setFoamTypes(foams);
      setOrders(
        ordersData.filter((o) =>
          (o.customer?.name || "")
            .toLowerCase()
            .includes(factoryName.toLowerCase()),
        ),
      );
    } catch (e) {
      console.error("Erro ao carregar dados da fábrica:", e);
    } finally {
      setLoading(false);
    }
  }

  function addLine() {
    const foam = foamTypes[0];
    if (!foam) return alert("Sem tipos de espuma disponíveis");
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        foamType: foam,
        initialDimensions: { length: 40000, width: 2000, height: 2000 },
        finalDimensions: { length: 2000, width: 1000, height: 500 },
        quantity: 1,
        completedQuantity: 0,
        cuttingOperations: [],
        status: "pending",
        priority: 5,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<ProductionOrderLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  async function submit() {
    if (!orderNumber || !factoryName || lines.length === 0) {
      alert("Preencha nº ordem, e pelo menos uma linha");
      return;
    }

    const payload: Omit<ProductionOrder, "id" | "createdAt" | "updatedAt"> = {
      orderNumber,
      customer: { id: factoryName, name: factoryName, contact: "" },
      expectedDeliveryDate: expectedDate,
      lines,
      status: "created",
      priority,
      totalVolume,
      estimatedCost: 0,
      notes,
      createdBy: creatorId || factoryName,
    } as any;

    try {
      if (editingId) {
        await productionService.updateProductionOrder(
          editingId,
          payload as any,
        );
      } else {
        const created = await productionService.createProductionOrder(
          payload as any,
        );
        setEditingId(created.id);
      }
      // Reset and reload
      setOrderNumber("");
      setLines([]);
      setNotes("");
      setPriority("medium");
      await init();
      alert("Ordem guardada!");
    } catch (e) {
      console.error("Erro ao guardar OP:", e);
      alert("Erro ao guardar OP");
    }
  }

  if (loading) {
    return <div className="p-6">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nova OP (Fábrica)</h1>
          <p className="text-muted-foreground">
            Fábrica: <strong>{factoryName || "—"}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowNesting(true)}
          className="px-3 py-2 border rounded flex items-center gap-2"
        >
          <Layers className="h-4 w-4" /> Nova OP (nesting)
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm mb-1">Nº Ordem</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="OP-0001"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Entrega Prevista</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Prioridade</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm mb-1">Notas</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Linhas ({lines.length})</h2>
        <button
          onClick={addLine}
          className="px-3 py-2 border rounded flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Linha
        </button>
      </div>

      <div className="space-y-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className="border rounded p-3 grid gap-3 sm:grid-cols-6"
          >
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Tipo de Espuma</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={line.foamType.id}
                onChange={(e) => {
                  const foam = foamTypes.find((f) => f.id === e.target.value);
                  if (foam) updateLine(line.id, { foamType: foam });
                }}
              >
                {foamTypes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} D{f.density}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Comp. (mm)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={line.finalDimensions.length}
                onChange={(e) =>
                  updateLine(line.id, {
                    finalDimensions: {
                      ...line.finalDimensions,
                      length: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Larg. (mm)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={line.finalDimensions.width}
                onChange={(e) =>
                  updateLine(line.id, {
                    finalDimensions: {
                      ...line.finalDimensions,
                      width: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Alt. (mm)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={line.finalDimensions.height}
                onChange={(e) =>
                  updateLine(line.id, {
                    finalDimensions: {
                      ...line.finalDimensions,
                      height: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Qtd</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={line.quantity}
                onChange={(e) =>
                  updateLine(line.id, { quantity: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex items-end justify-end gap-2">
              <button
                onClick={() => removeLine(line.id)}
                className="px-3 py-2 border rounded text-destructive flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Volume total: {totalVolume.toFixed(3)} m³
        </div>
        <button
          onClick={submit}
          className="px-4 py-2 bg-primary text-primary-foreground rounded flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Guardar OP
        </button>
      </div>

      <div className="pt-6">
        <h2 className="font-semibold mb-2">As minhas OP</h2>
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border rounded p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{o.orderNumber}</div>
                <div className="text-sm text-muted-foreground">
                  Cliente: {o.customer?.name} • Estado: {o.status}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(o.id);
                    setOrderNumber(o.orderNumber);
                    setExpectedDate(
                      (o.expectedDeliveryDate || "").slice(0, 10),
                    );
                    setPriority(o.priority);
                    setNotes(o.notes || "");
                    setLines(o.lines || []);
                  }}
                  className="px-3 py-2 border rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() =>
                    alert("A validação e início só na página geral.")
                  }
                  className="px-3 py-2 border rounded"
                >
                  Início na página geral
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showNesting && (
        <NestingModal
          onClose={() => setShowNesting(false)}
          onApply={(newLines) => {
            setLines((prev) => [...prev, ...newLines]);
            setShowNesting(false);
          }}
        />
      )}
    </div>
  );
}
