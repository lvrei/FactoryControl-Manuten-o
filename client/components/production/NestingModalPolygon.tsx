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
  Box,
} from "lucide-react";
import { productionService } from "@/services/productionService";
import {
  FoamBlock,
  FoamType,
  ProductionOrderLine,
  Machine,
  CuttingOperation,
} from "@/types/production";
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
import {
  nestFoamParts,
  convertNestingToOperations,
  type FoamPart,
  type BlockConstraints,
  type BlockNestingResult,
} from "@/lib/foamBlockNesting";
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
  const [machines, setMachines] = useState<Machine[]>([]);
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
  const [nestingMode, setNestingMode] = useState<
    "rectangle" | "polygon" | "foam3d"
  >(
    "foam3d", // Modo padrão para blocos de espuma
  );
  const [inputMode, setInputMode] = useState<"file" | "manual">("manual"); // Manual por padrão
  const [manualShapes, setManualShapes] = useState<ManualShape[]>([]);

  // Limites da máquina CNC (padrão)
  const [cncConstraints, setCncConstraints] = useState<BlockConstraints>({
    maxLength: 2500, // 2.5m
    maxWidth: 2300, // 2.3m
    maxHeight: 1300, // 1.3m
    kerf: 5,
    margin: 10,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const types = await productionService.getFoamTypes();
        setFoamTypes(types);
      } catch {}
      try {
        const machinesData = await productionService.getMachines();
        setMachines(machinesData);
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
    if (nestingMode !== "rectangle") return null;

    // Combina peças do ficheiro (se houver) com formas manuais
    const allParts: NestPart[] = [];

    // Adiciona peças do ficheiro
    if (drawing && drawing.parts) {
      const scaled = drawing.parts.map((p) => ({
        ...p,
        quantity: Math.max(
          0,
          Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
        ),
      }));
      allParts.push(...(scaled as NestPart[]));
    }

    // Adiciona formas manuais
    if (manualShapes.length > 0) {
      allParts.push(...manualShapes);
    }

    if (allParts.length === 0) return null;

    return packRectangles(allParts, sheet);
  }, [drawing, sheet, quantityMultiplier, nestingMode, manualShapes]);

  // Nesting 3D para blocos de espuma
  const foam3dResult = useMemo(() => {
    if (nestingMode !== "foam3d") return null;

    // Combina peças do ficheiro (se houver) com formas manuais
    const allParts: FoamPart[] = [];

    // Adiciona peças do ficheiro
    if (drawing && drawing.parts) {
      const scaled = drawing.parts.map((p) => ({
        length: p.length,
        width: p.width,
        height: p.height,
        quantity: Math.max(
          0,
          Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
        ),
        label: p.label,
        foamTypeId: p.foamTypeId || mappingFoamTypeId,
      }));
      allParts.push(...scaled);
    }

    // Adiciona formas manuais
    if (manualShapes.length > 0) {
      allParts.push(
        ...manualShapes.map((s) => ({
          length: s.length,
          width: s.width,
          height: s.height,
          quantity: s.quantity,
          label: s.label,
          foamTypeId: s.foamTypeId || mappingFoamTypeId,
        })),
      );
    }

    if (allParts.length === 0) return null;

    return nestFoamParts(allParts, cncConstraints);
  }, [
    drawing,
    cncConstraints,
    quantityMultiplier,
    nestingMode,
    manualShapes,
    mappingFoamTypeId,
  ]);

  const result =
    nestingMode === "polygon"
      ? polygonResult
      : nestingMode === "foam3d"
        ? foam3dResult
        : rectangleResult;

  function applyToOrder() {
    if (!result) return;

    const lines: ProductionOrderLine[] = [];

    if (nestingMode === "foam3d" && foam3dResult) {
      const foam =
        foamTypes.find((f) => f.id === mappingFoamTypeId) || foamTypes[0];
      if (!foam) {
        alert("Selecione um tipo de espuma antes de aplicar.");
        return;
      }

      const bzmMachine = machines.find((m) => m.type === "BZM");
      const cncMachine = machines.find((m) => m.type === "CNC");

      if (!bzmMachine || !cncMachine) {
        alert(
          "M��quinas BZM e CNC não encontradas. Configure as máquinas primeiro.",
        );
        return;
      }

      try {
        const ops = convertNestingToOperations(
          foam3dResult,
          foam.id,
          bzmMachine.id,
          cncMachine.id,
        );

        // Obtém as dimensões das peças introduzidas (não do bloco)
        let pieceDimensions = { length: 0, width: 0, height: 0 };

        if (manualShapes.length > 0) {
          // Usa a primeira forma manual como referência
          const firstShape = manualShapes[0];
          pieceDimensions = {
            length: firstShape.length,
            width: firstShape.width,
            height: firstShape.height,
          };
        } else if (drawing?.parts && drawing.parts.length > 0) {
          // Usa a primeira peça do ficheiro
          const firstPart = drawing.parts[0];
          pieceDimensions = {
            length: firstPart.length,
            width: firstPart.width,
            height: firstPart.height,
          };
        } else {
          // Fallback: usa dimensões do bloco
          pieceDimensions = ops.cncOperation.inputDimensions;
        }

        const bzmCuttingOp: CuttingOperation = {
          id: `bzm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          machineId: ops.bzmOperation.machineId,
          inputDimensions: ops.bzmOperation.inputDimensions,
          outputDimensions: ops.bzmOperation.outputDimensions,
          quantity: ops.bzmOperation.quantity,
          completedQuantity: 0,
          estimatedTime: ops.bzmOperation.quantity * 15,
          status: "pending",
          observations: `BZM: Cortar ${ops.bzmOperation.quantity} bloco(s) de ${ops.bzmOperation.outputDimensions.length}×${ops.bzmOperation.outputDimensions.width}×${ops.bzmOperation.outputDimensions.height}mm`,
        };

        const cncCuttingOp: CuttingOperation = {
          id: `cnc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          machineId: ops.cncOperation.machineId,
          inputDimensions: ops.cncOperation.inputDimensions,
          outputDimensions: pieceDimensions,
          quantity: ops.cncOperation.quantity,
          completedQuantity: 0,
          estimatedTime: ops.cncOperation.quantity * 5,
          status: "pending",
          observations: `CNC: Nesting de ${ops.cncOperation.quantity} peça(s) de ${pieceDimensions.length}×${pieceDimensions.width}×${pieceDimensions.height}mm em ${foam3dResult.totalBlocksNeeded} bloco(s). Aproveitamento: ${(foam3dResult.utilization * 100).toFixed(1)}%`,
        };

        const smallBlock = foam3dResult.smallBlocks[0];

        lines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          foamType: foam,
          initialDimensions: ops.bzmOperation.inputDimensions,
          finalDimensions: pieceDimensions,
          quantity: foam3dResult.totalPartsPlaced,
          completedQuantity: 0,
          cuttingOperations: [bzmCuttingOp, cncCuttingOp],
          status: "pending",
          priority: 5,
        } as any);
      } catch (error: any) {
        alert(`Erro ao gerar operações: ${error.message || error}`);
        return;
      }
    } else if (nestingMode === "polygon" && polygonResult) {
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
      // Lógica para retângulos (ficheiro + manual)
      // Agrupa peças por tipo de espuma e cria operações CNC separadas para cada forma distinta

      const foamGroups = new Map<string, Map<string, { part: NestPart; qty: number }>>();

      // Combina peças do ficheiro com formas manuais
      const allParts: NestPart[] = [];

      if (drawing && drawing.parts) {
        const scaled = (drawing.parts as NestPart[]).map((p) => ({
          ...p,
          quantity: Math.max(
            0,
            Math.floor((p.quantity || 1) * Math.max(1, quantityMultiplier)),
          ),
        }));
        allParts.push(...scaled);
      }

      allParts.push(...manualShapes);

      // Agrupa por tipo de espuma e depois por dimensões
      for (const p of allParts) {
        const foamId = p.foamTypeId || mappingFoamTypeId || foamTypes[0]?.id || "";

        if (!foamGroups.has(foamId)) {
          foamGroups.set(foamId, new Map());
        }

        const dimensionsKey = `${p.length}|${p.width}|${p.height}`;
        const partsMap = foamGroups.get(foamId)!;

        if (!partsMap.has(dimensionsKey)) {
          partsMap.set(dimensionsKey, { part: { ...p, foamTypeId: foamId }, qty: 0 });
        }

        const rec = partsMap.get(dimensionsKey)!;
        rec.qty += p.quantity;
      }

      // Cria uma linha por tipo de espuma com múltiplas operações CNC
      for (const [foamId, partsMap] of foamGroups) {
        const foam = foamTypes.find((f) => f.id === foamId) || foamTypes[0];
        if (!foam) continue;

        const cncMachine = machines.find((m) => m.type === "CNC");
        if (!cncMachine) continue;

        // Cria uma operação CNC para cada forma distinta
        const cuttingOperations: CuttingOperation[] = [];
        let totalQuantity = 0;

        for (const { part, qty } of partsMap.values()) {
          totalQuantity += qty;

          const cncOp: CuttingOperation = {
            id: `cnc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            machineId: cncMachine.id,
            inputDimensions: {
              length: sheet.length,
              width: sheet.width,
              height: part.height,
            },
            outputDimensions: {
              length: part.length,
              width: part.width,
              height: part.height,
            },
            quantity: qty,
            completedQuantity: 0,
            estimatedTime: qty * 5, // 5min por peça
            status: "pending",
            observations: `CNC: Cortar ${qty} peça(s) de ${part.length}×${part.width}×${part.height}mm${part.label ? ` (${part.label})` : ""}`,
          };

          cuttingOperations.push(cncOp);
        }

        // Usa as dimensões da primeira forma como referência para a linha
        const firstPart = Array.from(partsMap.values())[0].part;

        lines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          foamType: foam,
          initialDimensions: {
            length: sheet.length,
            width: sheet.width,
            height: firstPart.height,
          },
          finalDimensions: {
            length: firstPart.length,
            width: firstPart.width,
            height: firstPart.height,
          },
          quantity: totalQuantity,
          completedQuantity: 0,
          cuttingOperations,
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
              <Layers className="h-5 w-5" /> Nesting Avançado
            </h3>
            <p className="text-xs text-muted-foreground">
              Ficheiros DXF/JSON ou entrada manual de quadrados e retângulos
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
            {/* Modo de Entrada: Ficheiro ou Manual */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Origem das Peças
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMode("file")}
                  className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
                    inputMode === "file"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Ficheiro
                </button>
                <button
                  onClick={() => setInputMode("manual")}
                  className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
                    inputMode === "manual"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Edit3 className="h-4 w-4" />
                  Manual
                </button>
              </div>
            </div>

            {/* Entrada de Ficheiro */}
            {inputMode === "file" && (
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
            )}

            {/* Entrada Manual */}
            {inputMode === "manual" && (
              <ManualShapeInput
                shapes={manualShapes}
                onShapesChange={setManualShapes}
              />
            )}

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
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setNestingMode("rectangle")}
                  className={`px-2 py-2 border rounded flex items-center justify-center gap-1 text-xs ${
                    nestingMode === "rectangle"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Square className="h-4 w-4" />
                  2D
                </button>
                <button
                  onClick={() => setNestingMode("polygon")}
                  className={`px-2 py-2 border rounded flex items-center justify-center gap-1 text-xs ${
                    nestingMode === "polygon"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  disabled={!drawing?.polygons || drawing.polygons.length === 0}
                >
                  <Pentagon className="h-4 w-4" />
                  Polígono
                </button>
                <button
                  onClick={() => setNestingMode("foam3d")}
                  className={`px-2 py-2 border rounded flex items-center justify-center gap-1 text-xs ${
                    nestingMode === "foam3d"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Box className="h-4 w-4" />
                  Blocos 3D
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

            {nestingMode === "foam3d" ? (
              <div className="border rounded p-3 bg-muted/20">
                <label className="block text-sm font-medium mb-2">
                  Limites da Máquina CNC
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs">Comp. Máx (mm)</label>
                    <input
                      type="number"
                      value={cncConstraints.maxLength}
                      onChange={(e) =>
                        setCncConstraints((c) => ({
                          ...c,
                          maxLength: Number(e.target.value),
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Larg. Máx (mm)</label>
                    <input
                      type="number"
                      value={cncConstraints.maxWidth}
                      onChange={(e) =>
                        setCncConstraints((c) => ({
                          ...c,
                          maxWidth: Number(e.target.value),
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Alt. Máx (mm)</label>
                    <input
                      type="number"
                      value={cncConstraints.maxHeight}
                      onChange={(e) =>
                        setCncConstraints((c) => ({
                          ...c,
                          maxHeight: Number(e.target.value),
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Kerf (mm)</label>
                    <input
                      type="number"
                      value={cncConstraints.kerf}
                      onChange={(e) =>
                        setCncConstraints((c) => ({
                          ...c,
                          kerf: Number(e.target.value),
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs">Margem (mm)</label>
                    <input
                      type="number"
                      value={cncConstraints.margin}
                      onChange={(e) =>
                        setCncConstraints((c) => ({
                          ...c,
                          margin: Number(e.target.value),
                        }))
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
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
                  <label className="block text-sm">
                    Comprimento painel (mm)
                  </label>
                  <input
                    type="number"
                    value={sheet.length}
                    onChange={(e) =>
                      setSheet((s) => ({
                        ...s,
                        length: Number(e.target.value),
                      }))
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
                      setSheet((s) => ({
                        ...s,
                        margin: Number(e.target.value),
                      }))
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
            )}

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
                {nestingMode === "foam3d" && foam3dResult ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4" /> Blocos necessários:{" "}
                      <strong>{foam3dResult.totalBlocksNeeded}</strong>
                    </div>
                    <div>
                      Peças a cortar:{" "}
                      <strong>{foam3dResult.totalPartsPlaced}</strong>
                    </div>
                    <div>
                      Aproveitamento:{" "}
                      {(foam3dResult.utilization * 100).toFixed(1)}%
                    </div>
                    {foam3dResult.smallBlocks.length > 0 && (
                      <div className="pt-1 border-t text-xs">
                        Bloco CNC: {foam3dResult.smallBlocks[0].length}×
                        {foam3dResult.smallBlocks[0].width}×
                        {foam3dResult.smallBlocks[0].height}mm
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />{" "}
                      {nestingMode === "polygon" ? "Painéis" : "Blocos"}{" "}
                      necessários: <strong>{result.sheetsUsed}</strong>
                    </div>
                    <div>
                      Utilização: {(result.utilization * 100).toFixed(1)}%
                    </div>
                    {nestingMode === "polygon" && polygonResult && (
                      <div>
                        Formas colocadas:{" "}
                        <strong>{polygonResult.placements.length}</strong>
                      </div>
                    )}
                  </>
                )}
                {inputMode === "manual" && manualShapes.length > 0 && (
                  <div className="pt-1 border-t">
                    Formas manuais: <strong>{manualShapes.length}</strong> tipos
                    • {manualShapes.reduce((sum, s) => sum + s.quantity, 0)}{" "}
                    peças
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
                disabled={
                  !result ||
                  (inputMode === "manual" && manualShapes.length === 0)
                }
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
            ) : result && nestingMode === "foam3d" && foam3dResult ? (
              <div className="p-4 space-y-4">
                <div className="text-sm font-medium mb-2">
                  Blocos de Espuma 3D ({foam3dResult.totalBlocksNeeded} bloco
                  {foam3dResult.totalBlocksNeeded !== 1 ? "s" : ""})
                </div>
                <div className="grid gap-4 max-h-[600px] overflow-y-auto">
                  {foam3dResult.blockDetails.map((block) => {
                    const blockPlacements = foam3dResult.placements.filter(
                      (p) => p.blockIndex === block.blockIndex,
                    );
                    const scale = 0.15;
                    const blockW = block.dimensions.width * scale;
                    const blockL = block.dimensions.length * scale;

                    return (
                      <div
                        key={block.blockIndex}
                        className="border rounded p-3 bg-white"
                      >
                        <div className="text-xs font-medium mb-2">
                          Bloco #{block.blockIndex + 1} - {block.partsCount}{" "}
                          peça{block.partsCount !== 1 ? "s" : ""} -{" "}
                          {block.utilizationPercent.toFixed(1)}% usado
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Dimensões: {block.dimensions.length}×
                          {block.dimensions.width}×{block.dimensions.height}mm
                        </div>
                        <svg
                          width={Math.max(300, blockW + 20)}
                          height={Math.max(200, blockL + 20)}
                          className="border rounded bg-gray-50"
                        >
                          <rect
                            x={10}
                            y={10}
                            width={blockW}
                            height={blockL}
                            fill="#f8f9fa"
                            stroke="#adb5bd"
                            strokeWidth={2}
                          />
                          {blockPlacements.map((part, idx) => {
                            const px = 10 + part.x * scale;
                            const py = 10 + part.y * scale;
                            const pw = part.length * scale;
                            const ph = part.width * scale;
                            const colors = [
                              "#c7f9cc",
                              "#a5d8ff",
                              "#ffc9c9",
                              "#ffe066",
                              "#d0bfff",
                              "#b2f2bb",
                              "#99e9f2",
                              "#ffdeeb",
                              "#ffd8a8",
                              "#e7f5ff",
                            ];
                            const color = colors[idx % colors.length];

                            return (
                              <g key={idx}>
                                <rect
                                  x={px}
                                  y={py}
                                  width={pw}
                                  height={ph}
                                  fill={color}
                                  stroke="#2b8a3e"
                                  strokeWidth={1}
                                  opacity={0.9}
                                />
                                <text
                                  x={px + 3}
                                  y={py + 10}
                                  fontSize={8}
                                  fill="#1a202c"
                                  fontWeight="500"
                                >
                                  #{idx + 1}
                                </text>
                                <text
                                  x={px + 3}
                                  y={py + 20}
                                  fontSize={7}
                                  fill="#495057"
                                >
                                  {Math.round(part.length)}×
                                  {Math.round(part.width)}×
                                  {Math.round(part.height)}
                                </text>
                                <text
                                  x={px + 3}
                                  y={py + 29}
                                  fontSize={6}
                                  fill="#868e96"
                                >
                                  z:{Math.round(part.z)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted-foreground text-center">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  Carregue um ficheiro DXF ou JSON ou adicione formas
                  manualmente
                </p>
                <p className="text-xs mt-2">
                  Sistema suporta formas irregulares complexas e blocos 3D!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
