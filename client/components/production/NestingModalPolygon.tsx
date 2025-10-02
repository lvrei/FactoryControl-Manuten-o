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
  Maximize2,
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
import FoamBlock3DViewer from "./FoamBlock3DViewer";

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
  const [margins, setMargins] = useState({
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  });
  const [selectedMachine, setSelectedMachine] = useState<"CNC" | "Carousel">(
    "CNC",
  );
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
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d"); // 3D por padrão para melhor experiência
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);

  // Limites da máquina CNC (padrão)
  const [cncConstraints, setCncConstraints] = useState<BlockConstraints>({
    maxLength: 2500, // 2.5m
    maxWidth: 2300, // 2.3m
    maxHeight: 1300, // 1.3m
    kerf: 5,
    margin: 10,
  });
  const [foam3dMargins, setFoam3dMargins] = useState({
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
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

    // Usa margens específicas
    const effectiveMargin = Math.max(
      margins.top,
      margins.bottom,
      margins.left,
      margins.right,
    );
    const sheetWithMargins = { ...sheet, margin: effectiveMargin };

    return packRectangles(allParts, sheetWithMargins);
  }, [drawing, sheet, quantityMultiplier, nestingMode, manualShapes, margins]);

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

    // Usa margens específicas para foam3d
    const effectiveMargin = Math.max(
      foam3dMargins.top,
      foam3dMargins.bottom,
      foam3dMargins.left,
      foam3dMargins.right,
    );
    const constraintsWithMargins = { ...cncConstraints, margin: effectiveMargin };

    return nestFoamParts(allParts, constraintsWithMargins);
  }, [
    drawing,
    cncConstraints,
    quantityMultiplier,
    nestingMode,
    manualShapes,
    mappingFoamTypeId,
    foam3dMargins,
  ]);

  // Reset selected block index when foam3d results change
  useEffect(() => {
    if (foam3dResult && selectedBlockIndex >= foam3dResult.totalBlocksNeeded) {
      setSelectedBlockIndex(0);
    }
  }, [foam3dResult, selectedBlockIndex]);

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

        // Operação BZM (cortar blocos)
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

        // Agrupa formas distintas para criar múltiplas operações CNC
        const shapeGroups = new Map<string, { part: FoamPart; qty: number }>();

        // Combina peças do ficheiro com formas manuais
        const allSourceParts: FoamPart[] = [];

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
          allSourceParts.push(...scaled);
        }

        if (manualShapes.length > 0) {
          allSourceParts.push(
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

        // Agrupa por dimensões
        for (const part of allSourceParts) {
          const key = `${part.length}|${part.width}|${part.height}`;
          if (!shapeGroups.has(key)) {
            shapeGroups.set(key, { part, qty: 0 });
          }
          shapeGroups.get(key)!.qty += part.quantity;
        }

        // Cria uma operação CNC para cada forma distinta
        const cuttingOperations: CuttingOperation[] = [bzmCuttingOp];

        for (const { part, qty } of shapeGroups.values()) {
          const cncOp: CuttingOperation = {
            id: `cnc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            machineId: cncMachine.id,
            inputDimensions: ops.cncOperation.inputDimensions,
            outputDimensions: {
              length: part.length,
              width: part.width,
              height: part.height,
            },
            quantity: qty,
            completedQuantity: 0,
            estimatedTime: qty * 5,
            status: "pending",
            observations: `CNC: Cortar ${qty} peça(s) de ${part.length}×${part.width}×${part.height}mm${part.label ? ` (${part.label})` : ""}`,
          };
          cuttingOperations.push(cncOp);
        }

        // Usa as dimensões da primeira forma como referência
        const firstPart = Array.from(shapeGroups.values())[0]?.part || {
          length: ops.cncOperation.inputDimensions.length,
          width: ops.cncOperation.inputDimensions.width,
          height: ops.cncOperation.inputDimensions.height,
        };

        lines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          foamType: foam,
          initialDimensions: ops.bzmOperation.inputDimensions,
          finalDimensions: {
            length: firstPart.length,
            width: firstPart.width,
            height: firstPart.height,
          },
          quantity: foam3dResult.totalPartsPlaced,
          completedQuantity: 0,
          cuttingOperations,
          status: "pending",
          priority: 5,
        } as any);
      } catch (error: any) {
        alert(`Erro ao gerar operações: ${error.message || error}`);
        return;
      }
    } else if (nestingMode === "polygon" && polygonResult) {
      // Nesting de polígonos a partir de ficheiro
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
          "Máquinas BZM e CNC não encontradas. Configure as máquinas primeiro.",
        );
        return;
      }

      // Cria uma linha com operações BZM e CNC
      const totalParts = polygonResult.placements.length;
      const sheetsNeeded = polygonResult.sheetsUsed;

      const bzmOperation: CuttingOperation = {
        id: `bzm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        machineId: bzmMachine.id,
        inputDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: manualHeight,
        },
        outputDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: manualHeight,
        },
        quantity: sheetsNeeded,
        completedQuantity: 0,
        estimatedTime: sheetsNeeded * 15,
        status: "pending",
        observations: `BZM: Cortar ${sheetsNeeded} painel(is) de ${sheet.length}×${sheet.width}×${manualHeight}mm`,
      };

      const cncOperation: CuttingOperation = {
        id: `cnc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        machineId: cncMachine.id,
        inputDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: manualHeight,
        },
        outputDimensions: {
          length: 0,
          width: 0,
          height: manualHeight,
        },
        quantity: totalParts,
        completedQuantity: 0,
        estimatedTime: totalParts * 5,
        status: "pending",
        observations: `CNC: Nesting de ${totalParts} peça(s) de polígonos em ${sheetsNeeded} painel(is). Aproveitamento: ${(polygonResult.utilization * 100).toFixed(1)}%`,
      };

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
        quantity: totalParts,
        completedQuantity: 0,
        cuttingOperations: [bzmOperation, cncOperation],
        status: "pending",
        priority: 5,
      } as any);
    } else if (rectangleResult) {
      // Lógica para retângulos (ficheiro + manual)
      // Agrupa peças por tipo de espuma e cria operações separadas para cada forma distinta

      const foam =
        foamTypes.find((f) => f.id === mappingFoamTypeId) || foamTypes[0];
      if (!foam) {
        alert("Selecione um tipo de espuma antes de aplicar.");
        return;
      }

      const bzmMachine = machines.find((m) => m.type === "BZM");
      const targetMachine = machines.find((m) => m.type === selectedMachine);

      if (!bzmMachine || !targetMachine) {
        alert(
          `Máquinas BZM e ${selectedMachine} não encontradas. Configure as máquinas primeiro.`,
        );
        return;
      }

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

      // Agrupa por dimensões
      const shapeGroups = new Map<string, { part: NestPart; qty: number }>();

      for (const p of allParts) {
        const dimensionsKey = `${p.length}|${p.width}|${p.height}`;

        if (!shapeGroups.has(dimensionsKey)) {
          shapeGroups.set(dimensionsKey, {
            part: p,
            qty: 0,
          });
        }

        const rec = shapeGroups.get(dimensionsKey)!;
        rec.qty += p.quantity;
      }

      // Cria operação BZM (cortar painéis)
      const sheetsNeeded = rectangleResult.sheetsUsed;
      const bzmOperation: CuttingOperation = {
        id: `bzm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        machineId: bzmMachine.id,
        inputDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: manualHeight,
        },
        outputDimensions: {
          length: sheet.length,
          width: sheet.width,
          height: manualHeight,
        },
        quantity: sheetsNeeded,
        completedQuantity: 0,
        estimatedTime: sheetsNeeded * 15,
        status: "pending",
        observations: `BZM: Cortar ${sheetsNeeded} painel(is) de ${sheet.length}×${sheet.width}×${manualHeight}mm`,
      };

      // Cria uma operação para cada forma distinta
      const cuttingOperations: CuttingOperation[] = [bzmOperation];
      let totalQuantity = 0;

      for (const { part, qty } of shapeGroups.values()) {
        totalQuantity += qty;

        const machineOp: CuttingOperation = {
          id: `${selectedMachine.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          machineId: targetMachine.id,
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
          estimatedTime: qty * 5,
          status: "pending",
          observations: `${selectedMachine}: Cortar ${qty} peça(s) de ${part.length}×${part.width}×${part.height}mm${part.label ? ` (${part.label})` : ""}. Aproveitamento: ${(rectangleResult.utilization * 100).toFixed(1)}%`,
        };

        cuttingOperations.push(machineOp);
      }

      // Usa as dimensões da primeira forma como referência para a linha
      const firstPart = Array.from(shapeGroups.values())[0].part;

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
              <div className="space-y-3">
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setCncConstraints((c) => ({
                            ...c,
                            maxLength: val ? Number(val) : 0,
                          }));
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Larg. Máx (mm)</label>
                      <input
                        type="number"
                        value={cncConstraints.maxWidth}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCncConstraints((c) => ({
                            ...c,
                            maxWidth: val ? Number(val) : 0,
                          }));
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Alt. Máx (mm)</label>
                      <input
                        type="number"
                        value={cncConstraints.maxHeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCncConstraints((c) => ({
                            ...c,
                            maxHeight: val ? Number(val) : 0,
                          }));
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Kerf (mm)</label>
                      <input
                        type="number"
                        value={cncConstraints.kerf}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCncConstraints((c) => ({
                            ...c,
                            kerf: val ? Number(val) : 0,
                          }));
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Margens Específicas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs">Margem Topo (mm)</label>
                      <input
                        type="number"
                        value={foam3dMargins.top}
                        onChange={(e) =>
                          setFoam3dMargins((m) => ({
                            ...m,
                            top: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Margem Base (mm)</label>
                      <input
                        type="number"
                        value={foam3dMargins.bottom}
                        onChange={(e) =>
                          setFoam3dMargins((m) => ({
                            ...m,
                            bottom: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">
                        Margem Esquerda (mm)
                      </label>
                      <input
                        type="number"
                        value={foam3dMargins.left}
                        onChange={(e) =>
                          setFoam3dMargins((m) => ({
                            ...m,
                            left: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">
                        Margem Direita (mm)
                      </label>
                      <input
                        type="number"
                        value={foam3dMargins.right}
                        onChange={(e) =>
                          setFoam3dMargins((m) => ({
                            ...m,
                            right: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dimensões do Painel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs">Largura (mm)</label>
                      <input
                        type="number"
                        value={sheet.width}
                        onChange={(e) =>
                          setSheet((s) => ({
                            ...s,
                            width: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Comprimento (mm)</label>
                      <input
                        type="number"
                        value={sheet.length}
                        onChange={(e) =>
                          setSheet((s) => ({
                            ...s,
                            length: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Máquina de Corte
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedMachine("CNC")}
                      className={`px-3 py-2 border rounded flex items-center justify-center gap-2 text-sm ${
                        selectedMachine === "CNC"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      CNC
                    </button>
                    <button
                      onClick={() => setSelectedMachine("Carousel")}
                      className={`px-3 py-2 border rounded flex items-center justify-center gap-2 text-sm ${
                        selectedMachine === "Carousel"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      Carrossel
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Margens Específicas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs">Margem Topo (mm)</label>
                      <input
                        type="number"
                        value={margins.top}
                        onChange={(e) =>
                          setMargins((m) => ({
                            ...m,
                            top: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Margem Base (mm)</label>
                      <input
                        type="number"
                        value={margins.bottom}
                        onChange={(e) =>
                          setMargins((m) => ({
                            ...m,
                            bottom: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">
                        Margem Esquerda (mm)
                      </label>
                      <input
                        type="number"
                        value={margins.left}
                        onChange={(e) =>
                          setMargins((m) => ({
                            ...m,
                            left: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">
                        Margem Direita (mm)
                      </label>
                      <input
                        type="number"
                        value={margins.right}
                        onChange={(e) =>
                          setMargins((m) => ({
                            ...m,
                            right: Number(e.target.value),
                          }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm">Kerf (mm)</label>
                  <input
                    type="number"
                    value={sheet.kerf}
                    onChange={(e) =>
                      setSheet((s) => ({ ...s, kerf: Number(e.target.value) }))
                    }
                    className="w-full border rounded px-2 py-1 text-sm"
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
                      necessários:{" "}
                      <strong>
                        {nestingMode === "polygon" && polygonResult
                          ? polygonResult.sheetsUsed
                          : rectangleResult
                            ? rectangleResult.sheetsUsed
                            : 0}
                      </strong>
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
            {result && nestingMode === "rectangle" && rectangleResult ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    Nesting 2D/3D - Retângulos ({rectangleResult.sheetsUsed}{" "}
                    painel{rectangleResult.sheetsUsed !== 1 ? "is" : ""})
                  </div>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("2d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "2d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 inline mr-1" />
                      Vista 2D
                    </button>
                    <button
                      onClick={() => setViewMode("3d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "3d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5 inline mr-1" />
                      Vista 3D
                    </button>
                  </div>
                </div>

                {viewMode === "3d" ? (
                  <FoamBlock3DViewer
                    result={{
                      placements: rectangleResult.placements.map((p, idx) => ({
                        x: p.x,
                        y: p.y,
                        z: p.sheetIndex * (manualHeight + 10),
                        length: p.length,
                        width: p.width,
                        height: manualHeight,
                        blockIndex: p.sheetIndex,
                        label: p.label,
                      })),
                      blockDetails: Array.from(
                        { length: rectangleResult.sheetsUsed },
                        (_, i) => ({
                          blockIndex: i,
                          dimensions: {
                            length: sheet.length,
                            width: sheet.width,
                            height: manualHeight,
                          },
                          partsCount: rectangleResult.placements.filter(
                            (p) => p.sheetIndex === i,
                          ).length,
                          utilizationPercent: rectangleResult.utilization * 100,
                        }),
                      ),
                      totalBlocksNeeded: rectangleResult.sheetsUsed,
                      totalPartsPlaced: rectangleResult.placements.length,
                      utilization: rectangleResult.utilization,
                      smallBlocks: [],
                    }}
                    selectedBlockIndex={selectedBlockIndex}
                  />
                ) : (
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
                      .filter((p) => p.sheetIndex === selectedBlockIndex)
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
                            <text
                              x={x + 4}
                              y={y + 12}
                              fontSize={10}
                              fill="#1a202c"
                            >
                              {Math.round(p.length)}×{Math.round(p.width)}
                            </text>
                          </g>
                        );
                      })}
                  </svg>
                )}

                {rectangleResult.sheetsUsed > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      Selecionar painel:
                    </span>
                    {Array.from({ length: rectangleResult.sheetsUsed }).map(
                      (_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedBlockIndex(i)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            selectedBlockIndex === i
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          Painel #{i + 1} (
                          {
                            rectangleResult.placements.filter(
                              (p) => p.sheetIndex === i,
                            ).length
                          }
                          ×)
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : result && nestingMode === "polygon" && polygonResult ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    Nesting Polígonos ({polygonResult.sheetsUsed} painel
                    {polygonResult.sheetsUsed !== 1 ? "is" : ""})
                  </div>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("2d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "2d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 inline mr-1" />
                      Vista 2D
                    </button>
                    <button
                      onClick={() => setViewMode("3d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "3d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5 inline mr-1" />
                      Vista 3D
                    </button>
                  </div>
                </div>

                {viewMode === "3d" ? (
                  <FoamBlock3DViewer
                    result={{
                      placements: polygonResult.placements.map((p) => {
                        // Calcula bounding box do polígono
                        const minX = Math.min(...p.polygon.map(([x, y]) => x));
                        const maxX = Math.max(...p.polygon.map(([x, y]) => x));
                        const minY = Math.min(...p.polygon.map(([x, y]) => y));
                        const maxY = Math.max(...p.polygon.map(([x, y]) => y));

                        return {
                          x: p.x,
                          y: p.y,
                          z: p.sheetIndex * (manualHeight + 10),
                          length: maxX - minX,
                          width: maxY - minY,
                          height: manualHeight,
                          blockIndex: p.sheetIndex,
                          label: p.part?.label,
                        };
                      }),
                      blockDetails: Array.from(
                        { length: polygonResult.sheetsUsed },
                        (_, i) => ({
                          blockIndex: i,
                          dimensions: {
                            length: sheet.length,
                            width: sheet.width,
                            height: manualHeight,
                          },
                          partsCount: polygonResult.placements.filter(
                            (p) => p.sheetIndex === i,
                          ).length,
                          utilizationPercent: polygonResult.utilization * 100,
                        }),
                      ),
                      totalBlocksNeeded: polygonResult.sheetsUsed,
                      totalPartsPlaced: polygonResult.placements.length,
                      utilization: polygonResult.utilization,
                      smallBlocks: [],
                    }}
                    selectedBlockIndex={selectedBlockIndex}
                  />
                ) : (
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
                      .filter((p) => p.sheetIndex === selectedBlockIndex)
                      .map((placement, idx) => {
                        const points = placement.polygon
                          .map(
                            ([x, y]) =>
                              `${10 + x * svgScale},${10 + y * svgScale}`,
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
                )}

                {polygonResult.sheetsUsed > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">
                      Selecionar painel:
                    </span>
                    {Array.from({ length: polygonResult.sheetsUsed }).map(
                      (_, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedBlockIndex(i)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            selectedBlockIndex === i
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted border-border"
                          }`}
                        >
                          Painel #{i + 1} (
                          {
                            polygonResult.placements.filter(
                              (p) => p.sheetIndex === i,
                            ).length
                          }
                          ×)
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : result && nestingMode === "foam3d" && foam3dResult ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    Blocos de Espuma 3D ({foam3dResult.totalBlocksNeeded} bloco
                    {foam3dResult.totalBlocksNeeded !== 1 ? "s" : ""})
                  </div>
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("2d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "2d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5 inline mr-1" />
                      Vista 2D
                    </button>
                    <button
                      onClick={() => setViewMode("3d")}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        viewMode === "3d"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5 inline mr-1" />
                      Vista 3D
                    </button>
                  </div>
                </div>

                {viewMode === "3d" ? (
                  <div className="space-y-4">
                    {foam3dResult.totalBlocksNeeded > 1 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">
                          Selecionar bloco:
                        </span>
                        {foam3dResult.blockDetails.map((block) => (
                          <button
                            key={block.blockIndex}
                            onClick={() =>
                              setSelectedBlockIndex(block.blockIndex)
                            }
                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                              selectedBlockIndex === block.blockIndex
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border"
                            }`}
                          >
                            Bloco #{block.blockIndex + 1} ({block.partsCount}×)
                          </button>
                        ))}
                      </div>
                    )}
                    <FoamBlock3DViewer
                      result={foam3dResult}
                      selectedBlockIndex={selectedBlockIndex}
                    />
                  </div>
                ) : (
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
                          {(() => {
                            const uniqueLayers = Array.from(
                              new Set(
                                foam3dResult.placements
                                  .filter(
                                    (p) => p.blockIndex === block.blockIndex,
                                  )
                                  .map((p) => p.z),
                              ),
                            );
                            return uniqueLayers.length > 1 ? (
                              <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                Vista de topo - {uniqueLayers.length} camadas
                                (L0, L1, L2...). Cores diferentes =
                                profundidades diferentes (sem sobreposição real)
                              </div>
                            ) : null;
                          })()}
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

                              const zLayers = Array.from(
                                new Set(blockPlacements.map((p) => p.z)),
                              ).sort((a, b) => a - b);
                              const layerIndex = zLayers.indexOf(part.z);
                              const layerColors = [
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
                              const color =
                                layerColors[layerIndex % layerColors.length];
                              const opacity = 0.7 + layerIndex * 0.1;

                              return (
                                <g key={idx}>
                                  <rect
                                    x={px}
                                    y={py}
                                    width={pw}
                                    height={ph}
                                    fill={color}
                                    stroke="#2b8a3e"
                                    strokeWidth={1.5}
                                    opacity={Math.min(opacity, 0.95)}
                                    strokeDasharray={
                                      layerIndex > 0 ? "2,2" : "none"
                                    }
                                  />
                                  <text
                                    x={px + 3}
                                    y={py + 10}
                                    fontSize={8}
                                    fill="#1a202c"
                                    fontWeight="500"
                                  >
                                    #{idx + 1} L{layerIndex}
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
                )}
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
