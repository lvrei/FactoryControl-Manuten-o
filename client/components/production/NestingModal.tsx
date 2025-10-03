import { useEffect, useMemo, useState, useRef } from "react";
import { X, Upload, Package, AlertTriangle, Layers, Info } from "lucide-react";
import { productionService } from "@/services/productionService";
import { FoamBlock, FoamType, ProductionOrderLine } from "@/types/production";
import {
  fileLoaderService,
  FileLoaderError,
} from "@/services/fileLoaderService";
import type { Part, LoadedDrawing } from "@/services/fileLoaderService";
import { NestPart, Sheet, packRectangles } from "@/lib/nesting";
import DxfDebugPanel from "./DxfDebugPanel";

export type NestingModalProps = {
  onClose: () => void;
  onApply: (lines: ProductionOrderLine[]) => void;
};

export default function NestingModal({ onClose, onApply }: NestingModalProps) {
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parts, setParts] = useState<NestPart[]>([]);
  const [mappingFoamTypeId, setMappingFoamTypeId] = useState<string>("");
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
  const [manualQty, setManualQty] = useState<number>(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragCurr, setDragCurr] = useState<{ x: number; y: number } | null>(
    null,
  );
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
      setParts(loadedDrawing.parts as NestPart[]);

      if (loadedDrawing.parts.length === 0 && loadedDrawing.paths.length > 0) {
        setErrorMessage(
          "DXF carregado com sucesso! Desenho visualizado abaixo. " +
            "Não foram detetados retângulos automáticamente. " +
            "Use o mouse para selecionar áreas manualmente ou forneça um JSON com as dimensões.",
        );
      } else if (loadedDrawing.parts.length > 0) {
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
      setParts([]);
    } finally {
      setIsLoading(false);
    }
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
    // Stock warning é apenas informativo, não bloqueia criação
    if (stockWarning) {
      console.warn('⚠️ Stock warning:', stockWarning);
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
              Importe desenhos e gere linhas para OP. Suporta DXF (ASCII) e
              JSON.
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
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".json,.dxf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  disabled={isLoading}
                  className="flex-1"
                />
                {fileName && !isLoading && (
                  <button
                    onClick={() => {
                      setFileName('');
                      setDrawing(null);
                      setParts([]);
                      setErrorMessage('');
                    }}
                    className="px-3 py-1 border rounded text-sm hover:bg-muted flex items-center gap-1"
                    title="Limpar ficheiro"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
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
              {drawing?.metadata && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  {drawing.format.toUpperCase()} |
                  {drawing.metadata.entityCount &&
                    ` ${drawing.metadata.entityCount} entidades`}
                  {drawing.metadata.layerCount &&
                    ` | ${drawing.metadata.layerCount} layers`}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                <details>
                  <summary className="cursor-pointer hover:text-foreground">
                    Exemplo JSON
                  </summary>
                  <code className="block mt-1 p-2 bg-muted rounded text-xs">
                    {`[
  {
    "length": 500,
    "width": 300,
    "height": 50,
    "quantity": 10,
    "foamTypeId": "1",
    "label": "Peça A"
  }
]`}
                  </code>
                </details>
              </div>
            </div>

            {errorMessage && (
              <div
                className={`p-3 rounded border text-sm ${
                  errorMessage.includes("sucesso")
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
              <label className="block text-sm font-medium mb-1">
                Espessura padrão (mm)
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
              <div className="p-2 border rounded bg-muted/30 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" /> Blocos necessários:{" "}
                  <strong>{result.sheetsUsed}</strong>
                </div>
                <div>Utilização: {(result.utilization * 100).toFixed(1)}%</div>
                <div>
                  Peças detetadas: <strong>{parts.length}</strong> • Quantidade
                  total:{" "}
                  <strong>
                    {parts.reduce((s, p) => s + (p.quantity || 1), 0)}
                  </strong>
                </div>
              </div>
            )}

            {stockWarning && (
              <div className="p-2 border rounded bg-yellow-50 text-yellow-700 text-sm flex gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <div>
                  <div className="font-medium mb-1">⚠️ Aviso de Stock</div>
                  <div className="text-xs">{stockWarning}</div>
                  <div className="text-xs mt-1 opacity-75">A OP pode ser criada mesmo assim.</div>
                </div>
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
            {result ? (
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
            ) : drawing && drawing.paths.length > 0 ? (
              (() => {
                const bb = drawing.bbox!;
                const pad = 10;
                const scale = Math.min(
                  800 / Math.max(1, bb.maxX - bb.minX),
                  600 / Math.max(1, bb.maxY - bb.minY),
                );
                const width = Math.max(
                  420,
                  (bb.maxX - bb.minX) * scale + pad * 2,
                );
                const height = (bb.maxY - bb.minY) * scale + pad * 2;
                const toSvgX = (x: number) => (x - bb.minX) * scale + pad;
                const toSvgY = (y: number) => (bb.maxY - y) * scale + pad;
                const fromClientToDrawing = (
                  clientX: number,
                  clientY: number,
                ) => {
                  const svg = svgRef.current;
                  if (!svg) return null;
                  const rect = svg.getBoundingClientRect();
                  const sx = clientX - rect.left;
                  const sy = clientY - rect.top;
                  const dx = (sx - pad) / scale + bb.minX;
                  const dy = bb.maxY - (sy - pad) / scale;
                  return { x: dx, y: dy };
                };
                const onDown = (e: React.MouseEvent<SVGSVGElement>) => {
                  const p = fromClientToDrawing(e.clientX, e.clientY);
                  if (!p) return;
                  setDragStart(p);
                  setDragCurr(p);
                };
                const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
                  if (!dragStart) return;
                  const p = fromClientToDrawing(e.clientX, e.clientY);
                  if (!p) return;
                  setDragCurr(p);
                };
                const onUp = () => {
                  if (!dragStart || !dragCurr) {
                    setDragStart(null);
                    setDragCurr(null);
                    return;
                  }
                  const x1 = Math.min(dragStart.x, dragCurr.x);
                  const x2 = Math.max(dragStart.x, dragCurr.x);
                  const y1 = Math.min(dragStart.y, dragCurr.y);
                  const y2 = Math.max(dragStart.y, dragCurr.y);
                  const widthMm = Math.max(0, x2 - x1);
                  const lengthMm = Math.max(0, y2 - y1);
                  if (widthMm > 0 && lengthMm > 0) {
                    setParts((prev) => [
                      ...prev,
                      {
                        length: Math.round(lengthMm),
                        width: Math.round(widthMm),
                        height: manualHeight,
                        quantity: manualQty,
                      },
                    ]);
                  }
                  setDragStart(null);
                  setDragCurr(null);
                };
                return (
                  <>
                    <div className="mb-2 p-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded">
                      <Info className="h-3 w-3 inline mr-1" />
                      Arraste no desenho para selecionar áreas manualmente
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs">
                          Altura seleção (mm)
                        </label>
                        <input
                          type="number"
                          value={manualHeight}
                          onChange={(e) =>
                            setManualHeight(Number(e.target.value))
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs">Quantidade</label>
                        <input
                          type="number"
                          value={manualQty}
                          onChange={(e) => setManualQty(Number(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                    <svg
                      ref={svgRef}
                      onMouseDown={onDown}
                      onMouseMove={onMove}
                      onMouseUp={onUp}
                      width={width}
                      height={height}
                      style={{ background: "#f7fafc", cursor: "crosshair" }}
                    >
                      <rect
                        x={0}
                        y={0}
                        width="100%"
                        height="100%"
                        fill="#fff"
                        stroke="#e2e8f0"
                      />
                      {drawing.paths.map((poly, i) => (
                        <polyline
                          key={i}
                          fill="none"
                          stroke="#1f2937"
                          strokeWidth={1}
                          points={poly
                            .map(([x, y]) => `${toSvgX(x)},${toSvgY(y)}`)
                            .join(" ")}
                        />
                      ))}
                      {dragStart &&
                        dragCurr &&
                        (() => {
                          const sx = Math.min(
                            toSvgX(dragStart.x),
                            toSvgX(dragCurr.x),
                          );
                          const sy = Math.min(
                            toSvgY(dragStart.y),
                            toSvgY(dragCurr.y),
                          );
                          const sw = Math.abs(
                            toSvgX(dragCurr.x) - toSvgX(dragStart.x),
                          );
                          const sh = Math.abs(
                            toSvgY(dragCurr.y) - toSvgY(dragStart.y),
                          );
                          return (
                            <rect
                              x={sx}
                              y={sy}
                              width={sw}
                              height={sh}
                              fill="rgba(59,130,246,0.2)"
                              stroke="#3b82f6"
                              strokeDasharray="4 2"
                            />
                          );
                        })()}
                    </svg>
                  </>
                );
              })()
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Carregue um ficheiro DXF ou JSON para começar</p>
                <p className="text-xs mt-2">
                  DXF: Exporte como ASCII (R12/R2000/R2004)
                  <br />
                  JSON: Array com dimensões das peças
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
