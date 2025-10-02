import { useEffect, useMemo, useState, useRef } from "react";
import {
  X,
  Upload,
  Package,
  AlertTriangle,
  Layers,
  Info,
  Square,
  Pentagon,
  FileText,
  Edit3,
} from "lucide-react";
import { productionService } from "@/services/productionService";
import { FoamBlock, FoamType, ProductionOrderLine } from "@/types/production";
import {
  fileLoaderService,
  FileLoaderError,
} from "@/services/fileLoaderService";
import type { LoadedDrawing } from "@/services/fileLoaderService";
import { NestPart, Sheet, packRectangles } from "@/lib/nesting";
import {
  packPolygons,
  pathToPolygonPart,
  polygonArea,
  type PolygonPart,
} from "@/lib/polygonNesting";
import DxfDebugPanel from "./DxfDebugPanel";
import ManualShapeInput, { type ManualShape } from "./ManualShapeInput";

export type NestingModalPolygonProps = {
  onClose: () => void;
  onApply: (lines: ProductionOrderLine[]) => void;
};

export default function NestingModalPolygon({
  onClose,
  onApply,
}: NestingModalPolygonProps) {
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [drawing, setDrawing] = useState<LoadedDrawing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sheet, setSheet] = useState<Sheet>({
    length: 2000,
    width: 1000,
    kerf: 5,
    margin: 10,
  });
  const [quantityMultiplier, setQuantityMultiplier] = useState<number>(1);
  const [stockBlocks, setStockBlocks] = useState<FoamBlock[] | null>(null);
  const [stockWarning, setStockWarning] = useState<string>("");
  const [manualHeight, setManualHeight] = useState<number>(50);
  const [mappingFoamTypeId, setMappingFoamTypeId] = useState<string>("");
  const [nestingMode, setNestingMode] = useState<"rectangle" | "polygon">(
    "rectangle",
  );
  const [inputMode, setInputMode] = useState<"file" | "manual">("file");
  const [manualShapes, setManualShapes] = useState<ManualShape[]>([]);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const types = await productionService.getFoamTypes();
        setFoamTypes(types);
      } catch {}
      try {
        const anySvc: any = productionService as any;
        if (typeof anySvc.getFoamBlocks === "function") {
          const blocks = await anySvc.getFoamBlocks({ status: "available" });
          setStockBlocks(blocks);
        }
      } catch {}
    })();
  }, []);

  async function handleFile(file: File) {
    setFileName(file.name);
    setIsLoading(true);
    setErrorMessage("");

    try {
      const loadedDrawing = await fileLoaderService.loadFile(file, {
        defaultHeight: manualHeight,
        detectRectangles: true,
        extractPaths: true,
      });

      setDrawing(loadedDrawing);

      if (loadedDrawing.polygons && loadedDrawing.polygons.length > 0) {
        setNestingMode("polygon");
        setErrorMessage(
          `DXF carregado! ${loadedDrawing.polygons.length} forma(s) irregular(es) detetada(s). Modo de nesting de polígonos ativado.`,
        );
      } else if (loadedDrawing.parts.length > 0) {
        setNestingMode("rectangle");
        setErrorMessage("");
      }
    } catch (error) {
      if (error instanceof FileLoaderError) {
        setErrorMessage(error.message);
        console.error("File loader error:", error.code, error.details);
      } else {
        setErrorMessage(
          `Erro ao carregar ficheiro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
        console.error("Unexpected error:", error);
      }
      setDrawing(null);
    } finally {
      setIsLoading(false);
    }
  }

  const polygonResult = useMemo(() => {
    if (!drawing || !drawing.polygons || nestingMode !== "polygon") return null;

    const polygonParts: PolygonPart[] = drawing.polygons.map((path) =>
      pathToPolygonPart(
        path,
        manualHeight,
        quantityMultiplier,
        mappingFoamTypeId,
        "Forma irregular",
      ),
    );

    return packPolygons(polygonParts, sheet);
  }, [
    drawing,
    sheet,
    quantityMultiplier,
    manualHeight,
    mappingFoamTypeId,
    nestingMode,
  ]);

  const rectangleResult = useMemo(() => {
    if (!drawing || !drawing.parts || nestingMode !== "rectangle") return null;

    const scaled = drawing.parts.map((p) => ({
      ...p,
      quantity: Math.max(
        0,
        Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
      ),
    }));
    return packRectangles(scaled as NestPart[], sheet);
  }, [drawing, sheet, quantityMultiplier, nestingMode]);

  const result = nestingMode === "polygon" ? polygonResult : rectangleResult;

  function applyToOrder() {
    if (!result) return;

    const lines: ProductionOrderLine[] = [];

    if (nestingMode === "polygon" && polygonResult) {
      // Agrupa por sheet
      const bySheet = new Map<number, typeof polygonResult.placements>();
      for (const p of polygonResult.placements) {
        if (!bySheet.has(p.sheetIndex)) bySheet.set(p.sheetIndex, []);
        bySheet.get(p.sheetIndex)!.push(p);
      }

      for (const [sheetIdx, placements] of bySheet) {
        const foam =
          foamTypes.find((f) => f.id === mappingFoamTypeId) || foamTypes[0];
        if (!foam) continue;

        const totalArea = placements.reduce(
          (sum, p) => sum + polygonArea(p.polygon),
          0,
        );

        lines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          foamType: foam,
          initialDimensions: {
            length: sheet.length,
            width: sheet.width,
            height: manualHeight,
          },
          finalDimensions: {
            length: sheet.length,
            width: sheet.width,
            height: manualHeight,
          },
          quantity: placements.length,
          completedQuantity: 0,
          cuttingOperations: [],
          status: "pending",
          priority: 5,
        } as any);
      }
    } else if (rectangleResult) {
      // Lógica existente para retângulos
      const map = new Map<string, { part: NestPart; qty: number }>();
      const parts = drawing!.parts as NestPart[];
      const scaled = parts.map((p) => ({
        ...p,
        quantity: Math.max(
          0,
          Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
        ),
      }));

      for (const p of scaled) {
        const foamId =
          p.foamTypeId || mappingFoamTypeId || foamTypes[0]?.id || "";
        const key = `${foamId}|${p.length}|${p.width}|${p.height}`;
        if (!map.has(key))
          map.set(key, { part: { ...p, foamTypeId: foamId }, qty: 0 });
        const rec = map.get(key)!;
        rec.qty += p.quantity;
      }

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
        } as any);
      }
    }

    if (stockWarning) {
      alert(stockWarning + "\nA OP será criada mesmo assim.");
    }

    onApply(lines);
    onClose();
  }

  const svgScale = 400 / Math.max(1, sheet.width);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" /> Nesting Avançado (Formas
              Irregulares)
            </h3>
            <p className="text-xs text-muted-foreground">
              Suporta retângulos E formas irregulares (polígonos, curvas)
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
                disabled={isLoading}
                className="w-full"
              />
              {fileName && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                      A carregar...
                    </>
                  ) : (
                    fileName
                  )}
                </div>
              )}
            </div>

            {errorMessage && (
              <div
                className={`p-3 rounded border text-sm ${
                  errorMessage.includes("sucesso") ||
                  errorMessage.includes("carregado")
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {errorMessage}
              </div>
            )}

            <DxfDebugPanel drawing={drawing} />

            <div>
              <label className="block text-sm font-medium mb-2">
                Modo de Nesting
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNestingMode("rectangle")}
                  className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
                    nestingMode === "rectangle"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Square className="h-4 w-4" />
                  Retângulos
                </button>
                <button
                  onClick={() => setNestingMode("polygon")}
                  className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
                    nestingMode === "polygon"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  disabled={!drawing?.polygons || drawing.polygons.length === 0}
                >
                  <Pentagon className="h-4 w-4" />
                  Polígonos
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Espessura (mm)
              </label>
              <input
                type="number"
                value={manualHeight}
                onChange={(e) => setManualHeight(Number(e.target.value))}
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Espuma
              </label>
              <select
                value={mappingFoamTypeId}
                onChange={(e) => setMappingFoamTypeId(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">Selecionar</option>
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
                Quantidade (multiplicador)
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
              <div className="p-2 border rounded bg-muted/30 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Painéis necessários:{" "}
                  <strong>{result.sheetsUsed}</strong>
                </div>
                <div>Utilização: {(result.utilization * 100).toFixed(1)}%</div>
                {nestingMode === "polygon" && polygonResult && (
                  <div>
                    Formas colocadas:{" "}
                    <strong>{polygonResult.placements.length}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-2 border rounded">
                Cancelar
              </button>
              <button
                onClick={applyToOrder}
                className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
                disabled={!result}
              >
                Aplicar na OP
              </button>
            </div>
          </div>

          <div className="md:col-span-2 border rounded p-2 bg-white overflow-auto">
            {result && nestingMode === "polygon" && polygonResult ? (
              <svg
                ref={svgRef}
                width={Math.max(420, sheet.width * svgScale)}
                height={sheet.length * svgScale + 20}
                style={{ background: "#f7fafc" }}
              >
                <rect
                  x={10}
                  y={10}
                  width={sheet.width * svgScale}
                  height={sheet.length * svgScale}
                  fill="#fff"
                  stroke="#e2e8f0"
                  strokeWidth={2}
                />
                {polygonResult.placements
                  .filter((p) => p.sheetIndex === 0)
                  .map((placement, idx) => {
                    const points = placement.polygon
                      .map(
                        ([x, y]) => `${10 + x * svgScale},${10 + y * svgScale}`,
                      )
                      .join(" ");

                    return (
                      <g key={idx}>
                        <polygon
                          points={points}
                          fill="#c7f9cc"
                          stroke="#2b8a3e"
                          strokeWidth={1.5}
                        />
                        <text
                          x={10 + placement.x * svgScale + 4}
                          y={10 + placement.y * svgScale + 12}
                          fontSize={9}
                          fill="#1a202c"
                        >
                          #{idx + 1} {placement.rotation}°
                        </text>
                      </g>
                    );
                  })}
              </svg>
            ) : result && nestingMode === "rectangle" && rectangleResult ? (
              <svg
                width={Math.max(420, sheet.width * svgScale)}
                height={sheet.length * svgScale + 20}
                style={{ background: "#f7fafc" }}
              >
                <rect
                  x={10}
                  y={10}
                  width={sheet.width * svgScale}
                  height={sheet.length * svgScale}
                  fill="#fff"
                  stroke="#e2e8f0"
                />
                {rectangleResult.placements
                  .filter((p) => p.sheetIndex === 0)
                  .map((p, idx) => {
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
                          {Math.round(p.length)}×{Math.round(p.width)}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Carregue um ficheiro DXF ou JSON para começar</p>
                <p className="text-xs mt-2">
                  Sistema suporta formas irregulares complexas!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
