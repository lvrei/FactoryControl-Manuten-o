import { useEffect, useMemo, useState } from "react";
import { X, Upload, Package, AlertTriangle, Layers } from "lucide-react";
import { productionService } from "@/services/productionService";
import { FoamBlock, FoamType, ProductionOrderLine } from "@/types/production";
import {
  NestPart,
  Sheet,
  packRectangles,
  parseDxfRectangles,
  parseJsonParts,
} from "@/lib/nesting";

export type NestingModalProps = {
  onClose: () => void;
  onApply: (lines: ProductionOrderLine[]) => void;
};

export default function NestingModal({ onClose, onApply }: NestingModalProps) {
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parts, setParts] = useState<NestPart[]>([]);
  const [mappingFoamTypeId, setMappingFoamTypeId] = useState<string>("");
  const [sheet, setSheet] = useState<Sheet>({
    length: 2000,
    width: 1000,
    kerf: 5,
    margin: 10,
  });
  const [quantityMultiplier, setQuantityMultiplier] = useState<number>(1);
  const [stockBlocks, setStockBlocks] = useState<FoamBlock[] | null>(null);
  const [stockWarning, setStockWarning] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const types = await productionService.getFoamTypes();
        setFoamTypes(types);
      } catch {}
      // Try to fetch blocks if method exists
      try {
        const anySvc: any = productionService as any;
        if (typeof anySvc.getFoamBlocks === "function") {
          const blocks = await anySvc.getFoamBlocks({ status: "available" });
          setStockBlocks(blocks);
        }
      } catch {}
    })();
  }, []);

  const result = useMemo(() => {
    if (parts.length === 0) return null;
    const scaled = parts.map((p) => ({
      ...p,
      quantity: Math.max(
        0,
        Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
      ),
    }));
    return packRectangles(scaled, sheet);
  }, [parts, sheet, quantityMultiplier]);

  useEffect(() => {
    if (!result) {
      setStockWarning("");
      return;
    }
    // Rough stock check: compare total volume to available blocks of selected foamType
    const totalVolumeM3 = parts.reduce(
      (s, p) => s + (p.length * p.width * p.height * p.quantity) / 1e9,
      0,
    );
    if (stockBlocks && mappingFoamTypeId) {
      const availableBlocks = stockBlocks.filter(
        (b) => b.foamType?.id === mappingFoamTypeId && b.status === "available",
      );
      const availableVol = availableBlocks.reduce(
        (s, b) => s + (b.volume || 0),
        0,
      );
      if (availableVol + 1e-9 < totalVolumeM3) {
        setStockWarning(
          `Aviso: stock insuficiente para ${totalVolumeM3.toFixed(3)} m³; disponível ${availableVol.toFixed(3)} m³.`,
        );
      } else {
        setStockWarning("");
      }
    } else {
      setStockWarning("");
    }
  }, [result, stockBlocks, parts, mappingFoamTypeId]);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        if (file.name.toLowerCase().endsWith(".json")) {
          const ps = parseJsonParts(text);
          setParts(ps);
        } else if (file.name.toLowerCase().endsWith(".dxf")) {
          const ps = parseDxfRectangles(text);
          setParts(ps);
          if (!ps || ps.length === 0) {
            alert(
              "DXF carregado, mas não foram encontrados retângulos fechados. Use polylines fechadas (LWPOLYLINE/POLYLINE) ou forneça JSON."
            );
          }
        } else {
          alert("Formato não suportado. Use DXF ou JSON.");
        }
      } catch (e: any) {
        console.error(e);
        alert("Falha ao ler ficheiro: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function applyToOrder() {
    if (!result) return;
    const scaled = parts.map((p) => ({
      ...p,
      quantity: Math.max(
        0,
        Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
      ),
    }));
    // Group parts by (foamTypeId,length,width,height)
    const map = new Map<string, { part: NestPart; qty: number }>();
    for (const p of scaled) {
      const foamId =
        p.foamTypeId || mappingFoamTypeId || foamTypes[0]?.id || "";
      const key = `${foamId}|${p.length}|${p.width}|${p.height}`;
      if (!map.has(key))
        map.set(key, { part: { ...p, foamTypeId: foamId }, qty: 0 });
      const rec = map.get(key)!;
      rec.qty += p.quantity;
    }
    const lines: ProductionOrderLine[] = [] as any;
    for (const { part, qty } of map.values()) {
      const foam =
        foamTypes.find(
          (f) => f.id === (part.foamTypeId || mappingFoamTypeId),
        ) || foamTypes[0];
      if (!foam) continue;
      lines.push({
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        foamType: foam,
        initialDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: part.height,
        },
        finalDimensions: {
          length: part.length,
          width: part.width,
          height: part.height,
        },
        quantity: qty,
        completedQuantity: 0,
        cuttingOperations: [],
        status: "pending",
        priority: 5,
      });
    }
    if (stockWarning) {
      alert(stockWarning + "\nA OP será criada mesmo assim.");
    }
    onApply(lines);
    onClose();
  }

  const firstSheetPlacements = useMemo(() => {
    if (!result) return [] as ReturnType<typeof packRectangles>["placements"];
    return result.placements.filter((p) => p.sheetIndex === 0);
  }, [result]);

  const svgScale = 400 / Math.max(1, sheet.width);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" /> Nesting (DXF/JSON)
            </h3>
            <p className="text-xs text-muted-foreground">
              Importe desenhos e gere linhas para OP. Visualização do 1º painel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X />
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ficheiro DXF/JSON
              </label>
              <input
                type="file"
                accept=".json,.dxf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {fileName && (
                <div className="text-xs text-muted-foreground mt-1">
                  {fileName}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                <code>
                  {
                    'JSON exemplo: [{"length":500,"width":300,"height":50,"quantity":10,"foamTypeId":"1"}]'
                  }
                </code>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Mapear Tipo de Espuma
              </label>
              <select
                value={mappingFoamTypeId}
                onChange={(e) => setMappingFoamTypeId(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">Selecionar (ou use foamTypeId no JSON)</option>
                {foamTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Largura painel (mm)</label>
                <input
                  type="number"
                  value={sheet.width}
                  onChange={(e) =>
                    setSheet((s) => ({ ...s, width: Number(e.target.value) }))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm">Comprimento painel (mm)</label>
                <input
                  type="number"
                  value={sheet.length}
                  onChange={(e) =>
                    setSheet((s) => ({ ...s, length: Number(e.target.value) }))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm">Kerf (mm)</label>
                <input
                  type="number"
                  value={sheet.kerf}
                  onChange={(e) =>
                    setSheet((s) => ({ ...s, kerf: Number(e.target.value) }))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm">Margem (mm)</label>
                <input
                  type="number"
                  value={sheet.margin}
                  onChange={(e) =>
                    setSheet((s) => ({ ...s, margin: Number(e.target.value) }))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Quantidade total (multiplicador)
              </label>
              <input
                type="number"
                min={1}
                value={quantityMultiplier}
                onChange={(e) =>
                  setQuantityMultiplier(Math.max(1, Number(e.target.value)))
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>

            {result && (
              <div className="p-2 border rounded bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Painéis necessários:{" "}
                  <strong>{result.sheetsUsed}</strong>
                </div>
                <div>Utilização: {(result.utilization * 100).toFixed(1)}%</div>
              </div>
            )}

            {stockWarning && (
              <div className="p-2 border rounded bg-yellow-50 text-yellow-700 text-sm flex gap-2">
                <AlertTriangle className="h-4 w-4" />
                {stockWarning}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-2 border rounded">
                Cancelar
              </button>
              <button
                onClick={applyToOrder}
                className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
                disabled={!result || parts.length === 0}
              >
                Aplicar na OP
              </button>
            </div>
          </div>

          <div className="md:col-span-2 border rounded p-2 bg-white overflow-auto">
            {/* Preview of first sheet */}
            <svg
              width={Math.max(420, sheet.width * svgScale)}
              height={sheet.length * svgScale + 20}
              style={{ background: "#f7fafc" }}
            >
              {/* panel outline */}
              <rect
                x={10}
                y={10}
                width={sheet.width * svgScale}
                height={sheet.length * svgScale}
                fill="#fff"
                stroke="#e2e8f0"
              />
              {firstSheetPlacements.map((p, idx) => {
                const x = 10 + p.x * svgScale;
                const y = 10 + p.y * svgScale;
                const w = p.width * svgScale;
                const h = p.length * svgScale;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="#c7f9cc"
                      stroke="#2b8a3e"
                    />
                    <text x={x + 4} y={y + 12} fontSize={10} fill="#1a202c">
                      {Math.round(p.length)}×{Math.round(p.width)}×
                      {Math.round(p.height)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
