import { useState } from "react";
import { Plus, X, Square, RectangleHorizontal, Trash2 } from "lucide-react";
import type { NestPart } from "@/lib/nesting";

export type ManualShape = NestPart & {
  id: string;
  label?: string;
};

export type ManualShapeInputProps = {
  shapes: ManualShape[];
  onShapesChange: (shapes: ManualShape[]) => void;
  machineLimits?: {
    length: number;
    width: number;
    height: number;
  };
  cuttingMargins?: {
    length: number;
    width: number;
    height: number;
  };
};

export default function ManualShapeInput({
  shapes,
  onShapesChange,
  machineLimits = { length: 2500, width: 2300, height: 1300 },
  cuttingMargins = { length: 50, width: 50, height: 20 },
}: ManualShapeInputProps) {
  const [formData, setFormData] = useState({
    length: 100,
    width: 100,
    height: 50,
    quantity: 1,
    label: "",
    isSquare: false,
  });

  const [optimizeWaste, setOptimizeWaste] = useState(true);

  const calculateOptimizedBlockSize = () => {
    const partLength = formData.length + cuttingMargins.length;
    const partWidth = formData.width + cuttingMargins.width;
    const partHeight = formData.height + cuttingMargins.height;

    // Calcula quantas peças cabem em cada dimensão do limite da máquina
    const piecesInLength = Math.floor(machineLimits.length / partLength);
    const piecesInWidth = Math.floor(machineLimits.width / partWidth);
    const piecesInHeight = Math.floor(machineLimits.height / partHeight);

    // Se só cabe 1 peça em cada dimensão, usa o tamanho da peça + margem
    const optimizedLength = piecesInLength <= 1 ? partLength : machineLimits.length;
    const optimizedWidth = piecesInWidth <= 1 ? partWidth : machineLimits.width;
    const optimizedHeight = piecesInHeight <= 1 ? partHeight : machineLimits.height;

    return {
      length: optimizedLength,
      width: optimizedWidth,
      height: optimizedHeight,
      waste: {
        length: optimizedLength - formData.length,
        width: optimizedWidth - formData.width,
        height: optimizedHeight - formData.height,
      }
    };
  };

  const handleAdd = () => {
    if (formData.length <= 0 || formData.width <= 0 || formData.height <= 0) {
      alert("As medidas devem ser maiores que zero");
      return;
    }

    if (formData.quantity <= 0) {
      alert("A quantidade deve ser maior que zero");
      return;
    }

    const optimizedSize = optimizeWaste ? calculateOptimizedBlockSize() : null;

    if (optimizedSize && optimizeWaste) {
      const wastePercent = ((optimizedSize.waste.length + optimizedSize.waste.width + optimizedSize.waste.height) /
                            (optimizedSize.length + optimizedSize.width + optimizedSize.height)) * 100;

      console.log(`🔧 Otimização de desperdício:`, {
        original: `${formData.length}×${formData.width}×${formData.height}mm`,
        optimized: `${optimizedSize.length}×${optimizedSize.width}×${optimizedSize.height}mm`,
        waste: `${optimizedSize.waste.length}×${optimizedSize.waste.width}×${optimizedSize.waste.height}mm`,
        wastePercent: `${wastePercent.toFixed(1)}%`
      });
    }

    const newShape: ManualShape = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      length: formData.length,
      width: formData.width,
      height: formData.height,
      quantity: formData.quantity,
      label:
        formData.label ||
        (formData.isSquare
          ? `Quadrado ${formData.length}mm`
          : `Retângulo ${formData.length}×${formData.width}mm`),
    };

    onShapesChange([...shapes, newShape]);

    // Reset form mantendo espessura
    setFormData({
      length: 100,
      width: 100,
      height: formData.height,
      quantity: 1,
      label: "",
      isSquare: false,
    });
  };

  const handleRemove = (id: string) => {
    onShapesChange(shapes.filter((s) => s.id !== id));
  };

  const handleSquareToggle = (isSquare: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isSquare,
      width: isSquare ? prev.length : prev.width,
    }));
  };

  const handleLengthChange = (length: number) => {
    setFormData((prev) => ({
      ...prev,
      length,
      width: prev.isSquare ? length : prev.width,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/5">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Forma Manual
        </h4>

        {/* Tipo de forma */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => handleSquareToggle(false)}
            className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
              !formData.isSquare
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <RectangleHorizontal className="h-4 w-4" />
            Retângulo
          </button>
          <button
            onClick={() => handleSquareToggle(true)}
            className={`px-3 py-2 border rounded flex items-center justify-center gap-2 ${
              formData.isSquare
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <Square className="h-4 w-4" />
            Quadrado
          </button>
        </div>

        {/* Dimensões */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              {formData.isSquare ? "Lado (mm)" : "Comprimento (mm)"}
            </label>
            <input
              type="number"
              value={formData.length}
              onChange={(e) => handleLengthChange(Number(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
              min={1}
            />
          </div>
          {!formData.isSquare && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Largura (mm)
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) =>
                  setFormData({ ...formData, width: Number(e.target.value) })
                }
                className="w-full border rounded px-2 py-1 text-sm"
                min={1}
              />
            </div>
          )}
          {formData.isSquare && (
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                Largura (mm)
              </label>
              <input
                type="number"
                value={formData.length}
                disabled
                className="w-full border rounded px-2 py-1 text-sm bg-muted text-muted-foreground"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1">
              Espessura (mm)
            </label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) =>
                setFormData({ ...formData, height: Number(e.target.value) })
              }
              className="w-full border rounded px-2 py-1 text-sm"
              min={1}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Quantidade</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: Number(e.target.value) })
              }
              className="w-full border rounded px-2 py-1 text-sm"
              min={1}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })
            }
            placeholder="Ex: Peça A, Tampa, Base..."
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Otimização de desperdício */}
        <div className="mb-3 p-2 border rounded bg-muted/30">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={optimizeWaste}
              onChange={(e) => setOptimizeWaste(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium">Otimizar tamanho do bloco</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Ajusta automaticamente o tamanho do bloco para reduzir desperdício
              </div>
            </div>
          </label>
          {optimizeWaste && formData.length > 0 && formData.width > 0 && formData.height > 0 && (() => {
            const opt = calculateOptimizedBlockSize();
            const wastePercent = ((opt.waste.length + opt.waste.width + opt.waste.height) /
                                  (opt.length + opt.width + opt.height)) * 100;
            return (
              <div className="mt-2 pt-2 border-t text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peça:</span>
                  <span className="font-mono">{formData.length}×{formData.width}×{formData.height}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bloco sugerido:</span>
                  <span className="font-mono text-green-700">{opt.length}×{opt.width}×{opt.height}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem total:</span>
                  <span className="font-mono">{opt.waste.length}×{opt.waste.width}×{opt.waste.height}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desperdício:</span>
                  <span className={`font-medium ${wastePercent < 20 ? 'text-green-600' : wastePercent < 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {wastePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        <button
          onClick={handleAdd}
          className="w-full px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar à Lista
        </button>
      </div>

      {/* Lista de formas adicionadas */}
      {shapes.length > 0 && (
        <div className="border rounded-lg p-3 bg-background">
          <h4 className="font-medium mb-2 text-sm">
            Formas Adicionadas ({shapes.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-auto">
            {shapes.map((shape) => (
              <div
                key={shape.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {shape.label ||
                      `${shape.length}×${shape.width}×${shape.height}mm`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shape.length === shape.width ? (
                      <Square className="h-3 w-3 inline mr-1" />
                    ) : (
                      <RectangleHorizontal className="h-3 w-3 inline mr-1" />
                    )}
                    {shape.length}×{shape.width}×{shape.height}mm • Qtd:{" "}
                    {shape.quantity}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(shape.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            Total de peças: {shapes.reduce((sum, s) => sum + s.quantity, 0)} |
            Tipos diferentes: {shapes.length}
          </div>
        </div>
      )}
    </div>
  );
}
