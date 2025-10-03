import { useState, useMemo, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Layers, Info } from "lucide-react";
import { ProductionOrderLine, FoamType } from "@/types/production";
import { productionService } from "@/services/productionService";
import FoamBlock3DViewer from "./FoamBlock3DViewer";
import type { BlockNestingResult } from "@/lib/foamBlockNesting";

type CarouselCut = {
  id: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  foamTypeId?: string;
  label?: string;
};

type CarouselLayer = {
  cut: CarouselCut;
  z: number; // posição Z da camada
};

type CarouselBlock = {
  length: number;
  width: number;
  height: number;
  layers: CarouselLayer[];
  totalPieces: number;
};

type NestingModalCarouselProps = {
  onClose: () => void;
  onApply: (lines: ProductionOrderLine[]) => void;
};

export default function NestingModalCarousel({
  onClose,
  onApply,
}: NestingModalCarouselProps) {
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [cuts, setCuts] = useState<CarouselCut[]>([]);
  const [newCut, setNewCut] = useState({
    length: 1000,
    width: 1000,
    height: 150,
    quantity: 1,
    label: "",
  });
  const [selectedFoamType, setSelectedFoamType] = useState<string>("");
  const [show3DView, setShow3DView] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);

  // Limites da máquina Carrossel
  const [machineLimits] = useState({
    maxLength: 2500,
    maxWidth: 2300,
    maxHeight: 1300,
  });

  const [margins] = useState({
    margin: 10,
    kerf: 5,
  });

  useEffect(() => {
    (async () => {
      try {
        const types = await productionService.getFoamTypes();
        setFoamTypes(types);
        if (types.length > 0) setSelectedFoamType(types[0].id);
      } catch (error) {
        console.error("Erro ao carregar tipos de espuma:", error);
      }
    })();
  }, []); // Run only once on mount

  // Adiciona novo corte à lista
  const handleAddCut = useCallback(() => {
    if (newCut.length <= 0 || newCut.width <= 0 || newCut.height <= 0) {
      alert("Dimensões devem ser maiores que zero");
      return;
    }
    if (newCut.quantity <= 0) {
      alert("Quantidade deve ser maior que zero");
      return;
    }

    const cut: CarouselCut = {
      id: `cut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      length: newCut.length,
      width: newCut.width,
      height: newCut.height,
      quantity: newCut.quantity,
      foamTypeId: selectedFoamType,
      label: newCut.label || `${newCut.length}×${newCut.width}×${newCut.height}`,
    };

    setCuts((prev) => [...prev, cut]);

    // Reseta formulário
    setNewCut({
      length: 1000,
      width: 1000,
      height: 150,
      quantity: 1,
      label: "",
    });
  }, [newCut, selectedFoamType]);

  const handleRemoveCut = useCallback((id: string) => {
    setCuts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Algoritmo de nesting para Carrossel (CORTE VERTICAL APENAS)
  const nestingResult = useMemo(() => {
    if (cuts.length === 0) return null;

    const blocks: CarouselBlock[] = [];
    
    // Expande cortes em peças individuais
    const allPieces: CarouselCut[] = [];
    cuts.forEach((cut) => {
      for (let i = 0; i < cut.quantity; i++) {
        allPieces.push({ ...cut, quantity: 1, id: `${cut.id}-${i}` });
      }
    });

    // Ordena por área (maiores primeiro)
    const sortedPieces = [...allPieces].sort(
      (a, b) => b.length * b.width - a.length * a.width
    );

    console.log(`[Carrossel Nesting] 🎯 Iniciando nesting de ${sortedPieces.length} peças`);

    let remainingPieces = [...sortedPieces];
    let blockIndex = 0;

    while (remainingPieces.length > 0) {
      // Calcula dimensões do bloco
      const piece = remainingPieces[0];
      
      // Largura e comprimento do bloco = máximo da peça + margens
      const blockLength = Math.min(
        machineLimits.maxLength,
        Math.ceil((piece.length + 2 * margins.margin + margins.kerf) / 50) * 50
      );
      const blockWidth = Math.min(
        machineLimits.maxWidth,
        Math.ceil((piece.width + 2 * margins.margin + margins.kerf) / 50) * 50
      );
      
      // Altura = máximo disponível para empilhamento
      const blockHeight = machineLimits.maxHeight;

      const block: CarouselBlock = {
        length: blockLength,
        width: blockWidth,
        height: blockHeight,
        layers: [],
        totalPieces: 0,
      };

      // EMPILHAMENTO EM CAMADAS (Z)
      // Cada camada só pode ter 1 peça (corte vertical)
      let currentZ = margins.margin;

      for (let i = 0; i < remainingPieces.length; i++) {
        const p = remainingPieces[i];
        
        // Verifica se peça cabe no bloco (X, Y)
        if (
          p.length + 2 * margins.margin + margins.kerf <= blockLength &&
          p.width + 2 * margins.margin + margins.kerf <= blockWidth &&
          currentZ + p.height + margins.kerf <= blockHeight - margins.margin
        ) {
          // Coloca peça na camada
          block.layers.push({
            cut: p,
            z: currentZ,
          });
          
          // Próxima camada (empilha em Z)
          currentZ += p.height + margins.kerf;
          block.totalPieces++;
          
          // Remove peça da lista
          remainingPieces.splice(i, 1);
          i--; // Ajusta índice
        }
      }

      // Se colocou ao menos 1 peça, adiciona bloco
      if (block.totalPieces > 0) {
        blocks.push(block);
        console.log(
          `[Carrossel Nesting] 📦 Bloco ${blockIndex + 1}: ${blockLength}×${blockWidth}×${blockHeight}mm | ${block.totalPieces} camadas | ${remainingPieces.length} peças restantes`
        );
        blockIndex++;
      } else {
        // Não conseguiu colocar nenhuma peça - erro
        console.error(
          `[Carrossel Nesting] ❌ ERRO: Peça não cabe no bloco máximo!`,
          remainingPieces[0]
        );
        break;
      }
    }

    const totalPieces = blocks.reduce((sum, b) => sum + b.totalPieces, 0);
    const totalVolume = blocks.reduce(
      (sum, b) => sum + (b.length * b.width * b.height) / 1e9,
      0
    );

    // Converte para placements para visualização 3D
    const placements = blocks.flatMap((block, blockIdx) =>
      block.layers.map((layer) => ({
        ...layer.cut,
        x: margins.margin, // Centralizado em X
        y: margins.margin, // Centralizado em Y
        z: layer.z,
        blockIndex: blockIdx,
      }))
    );

    console.log(
      `[Carrossel Nesting] ✅ Resultado: ${blocks.length} blocos, ${totalPieces} peças, ${totalVolume.toFixed(3)} m³`
    );

    return {
      blocks,
      placements,
      totalBlocks: blocks.length,
      totalPieces,
      totalVolume,
    };
  }, [cuts, machineLimits, margins]);

  const handleApplyToOrder = useCallback(() => {
    if (!nestingResult || cuts.length === 0) return;

    // Agrupa cortes por tipo e dimensões
    const linesMap = new Map<string, { cut: CarouselCut; totalQty: number }>();

    cuts.forEach((cut) => {
      const key = `${cut.foamTypeId}|${cut.length}|${cut.width}|${cut.height}`;
      if (!linesMap.has(key)) {
        linesMap.set(key, { cut, totalQty: 0 });
      }
      const entry = linesMap.get(key)!;
      entry.totalQty += cut.quantity;
    });

    // Cria linhas de produção
    const lines: ProductionOrderLine[] = [];
    linesMap.forEach(({ cut, totalQty }) => {
      const foam = foamTypes.find((f) => f.id === cut.foamTypeId) || foamTypes[0];
      if (!foam) return;

      lines.push({
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        foamType: foam,
        initialDimensions: {
          length: nestingResult.blocks[0]?.length || cut.length,
          width: nestingResult.blocks[0]?.width || cut.width,
          height: cut.height,
        },
        finalDimensions: {
          length: cut.length,
          width: cut.width,
          height: cut.height,
        },
        quantity: totalQty,
        completedQuantity: 0,
        cuttingOperations: [],
        status: "pending",
        priority: 5,
      });
    });

    onApply(lines);
    onClose();
  }, [nestingResult, cuts, foamTypes, onApply, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-background z-10">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5" /> Nesting Carrossel
            </h3>
            <p className="text-xs text-muted-foreground">
              Otimização para corte vertical (camadas empilhadas)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X />
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          {/* Entrada de cortes */}
          <div className="space-y-4">
            <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm">
              <Info className="h-4 w-4 inline mr-2" />
              <strong>Carrossel - Corte Vertical:</strong> Apenas empilhamento
              em camadas. Cada camada = 1 peça.
            </div>

            <div className="p-4 border rounded space-y-3">
              <h4 className="font-medium">Adicionar Corte</h4>

              <div>
                <label className="block text-sm mb-1">Tipo de Espuma</label>
                <select
                  value={selectedFoamType}
                  onChange={(e) => setSelectedFoamType(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  {foamTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm">Comprimento (mm)</label>
                  <input
                    type="number"
                    value={newCut.length}
                    onChange={(e) =>
                      setNewCut({ ...newCut, length: Number(e.target.value) })
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Largura (mm)</label>
                  <input
                    type="number"
                    value={newCut.width}
                    onChange={(e) =>
                      setNewCut({ ...newCut, width: Number(e.target.value) })
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Espessura (mm)</label>
                  <input
                    type="number"
                    value={newCut.height}
                    onChange={(e) =>
                      setNewCut({ ...newCut, height: Number(e.target.value) })
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Quantidade</label>
                  <input
                    type="number"
                    value={newCut.quantity}
                    onChange={(e) =>
                      setNewCut({ ...newCut, quantity: Number(e.target.value) })
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm">Etiqueta (opcional)</label>
                  <input
                    type="text"
                    value={newCut.label}
                    onChange={(e) =>
                      setNewCut({ ...newCut, label: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1"
                    placeholder="Ex: Peça A"
                  />
                </div>
              </div>

              <button
                onClick={handleAddCut}
                className="w-full px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Corte
              </button>
            </div>

            {/* Lista de cortes */}
            <div className="border rounded">
              <div className="p-2 bg-muted font-medium text-sm">
                Série de Cortes ({cuts.length})
              </div>
              <div className="max-h-64 overflow-auto">
                {cuts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum corte adicionado
                  </div>
                ) : (
                  <div className="divide-y">
                    {cuts.map((cut) => (
                      <div
                        key={cut.id}
                        className="p-2 flex items-center justify-between hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {cut.label || `Corte ${cut.id.slice(-4)}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cut.length}×{cut.width}×{cut.height}mm • Qtd:{" "}
                            {cut.quantity}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCut(cut.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultado do Nesting */}
          <div className="space-y-4">
            <div className="p-4 border rounded">
              <h4 className="font-medium mb-2">Limites da Máquina</h4>
              <div className="text-sm space-y-1">
                <div>
                  Comprimento máx: <strong>{machineLimits.maxLength}mm</strong>
                </div>
                <div>
                  Largura máx: <strong>{machineLimits.maxWidth}mm</strong>
                </div>
                <div>
                  Altura máx: <strong>{machineLimits.maxHeight}mm</strong>
                </div>
                <div className="pt-2 border-t mt-2">
                  Margem: <strong>{margins.margin}mm</strong> | Kerf:{" "}
                  <strong>{margins.kerf}mm</strong>
                </div>
              </div>
            </div>

            {nestingResult && (
              <>
                <div className="p-4 border rounded bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-700 dark:text-green-300">
                      ✅ Resultado do Nesting
                    </h4>
                    <button
                      onClick={() => setShow3DView(!show3DView)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      {show3DView ? "📋 Detalhes" : "🎨 Ver 3D"}
                    </button>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      Blocos necessários:{" "}
                      <strong>{nestingResult.totalBlocks}</strong>
                    </div>
                    <div>
                      Total de peças:{" "}
                      <strong>{nestingResult.totalPieces}</strong>
                    </div>
                    <div>
                      Volume total:{" "}
                      <strong>{nestingResult.totalVolume.toFixed(3)} m³</strong>
                    </div>
                  </div>
                </div>

                {show3DView && nestingResult.placements && (() => {
                  // Cria objeto result compatível com BlockNestingResult
                  const block = nestingResult.blocks[selectedBlockIndex];
                  const blockPlacements = nestingResult.placements.filter(
                    (p) => p.blockIndex === selectedBlockIndex
                  );

                  const result3D = {
                    smallBlocks: [block],
                    placements: blockPlacements,
                    totalBlocksNeeded: 1,
                    totalPartsPlaced: blockPlacements.length,
                    utilization: 0,
                    blockDetails: [{
                      blockIndex: selectedBlockIndex,
                      dimensions: block,
                      partsCount: blockPlacements.length,
                      utilizationPercent: 0,
                    }],
                  };

                  return (
                    <div className="border rounded bg-white dark:bg-gray-900 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          Visualização 3D
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedBlockIndex(Math.max(0, selectedBlockIndex - 1))}
                            disabled={selectedBlockIndex === 0}
                            className="px-2 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
                          >
                            ←
                          </button>
                          <span className="text-xs">
                            Bloco {selectedBlockIndex + 1} / {nestingResult.blocks.length}
                          </span>
                          <button
                            onClick={() => setSelectedBlockIndex(Math.min(nestingResult.blocks.length - 1, selectedBlockIndex + 1))}
                            disabled={selectedBlockIndex === nestingResult.blocks.length - 1}
                            className="px-2 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
                          >
                            →
                          </button>
                        </div>
                      </div>
                      <FoamBlock3DViewer result={result3D} selectedBlockIndex={0} />
                    </div>
                  );
                })()}

                {!show3DView && (
                  <div className="border rounded max-h-96 overflow-auto">
                    <div className="p-2 bg-muted font-medium text-sm sticky top-0">
                      Detalhes dos Blocos
                    </div>
                    <div className="divide-y">
                      {nestingResult.blocks.map((block, idx) => (
                        <div key={idx} className="p-3">
                          <div className="font-medium text-sm mb-2">
                            Bloco {idx + 1}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Dimensões: {block.length}×{block.width}×{block.height}
                            mm
                          </div>
                          <div className="text-xs">
                            <strong>{block.layers.length} camadas:</strong>
                            <div className="mt-1 space-y-1">
                              {block.layers.map((layer, layerIdx) => (
                                <div
                                  key={layerIdx}
                                  className="pl-2 border-l-2 border-blue-300"
                                >
                                  Camada {layerIdx + 1} (Z={layer.z}mm):{" "}
                                  {layer.cut.length}×{layer.cut.width}×
                                  {layer.cut.height}mm
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex gap-2 justify-end sticky bottom-0 bg-background">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleApplyToOrder}
            disabled={!nestingResult || cuts.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            Aplicar na OP
          </button>
        </div>
      </div>
    </div>
  );
}
