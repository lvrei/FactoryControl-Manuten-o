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
};

export default function ManualShapeInput({
  shapes,
  onShapesChange,
}: ManualShapeInputProps) {
  const [formData, setFormData] = useState({
    length: 100,
    width: 100,
    height: 50,
    quantity: 1,
    label: "",
    isSquare: false,
  });

  const handleAdd = () => {
    if (formData.length <= 0 || formData.width <= 0 || formData.height <= 0) {
      alert("As medidas devem ser maiores que zero");
      return;
    }

    if (formData.quantity <= 0) {
      alert("A quantidade deve ser maior que zero");
      return;
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
