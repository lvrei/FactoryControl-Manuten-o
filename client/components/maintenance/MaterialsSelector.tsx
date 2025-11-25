import { useState, useEffect } from "react";
import { useState, useEffect } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { materialsService, Material } from "@/services/materialsService";

export interface SelectedPart {
  material_id?: string;
  material_name: string;
  quantity_used: number;
  unit?: string;
  cost_per_unit: number;
}

interface MaterialsSelectorProps {
  selectedParts: SelectedPart[];
  onPartsChange: (parts: SelectedPart[]) => void;
}

export function MaterialsSelector({
  selectedParts,
  onPartsChange,
}: MaterialsSelectorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPart, setNewPart] = useState<SelectedPart>({
    material_name: "",
    quantity_used: 1,
    unit: "unidade",
    cost_per_unit: 0,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const data = await materialsService.getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error("Erro ao carregar materiais:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = () => {
    if (!newPart.material_name || newPart.quantity_used <= 0) {
      alert("Por favor, preencha todos os campos corretamente");
      return;
    }

    onPartsChange([...selectedParts, { ...newPart }]);
    setNewPart({
      material_name: "",
      quantity_used: 1,
      unit: "unidade",
      cost_per_unit: 0,
    });
    setShowAddForm(false);
  };

  const handleRemovePart = (index: number) => {
    onPartsChange(selectedParts.filter((_, i) => i !== index));
  };

  const handleSelectFromStock = (material: Material) => {
    setNewPart({
      material_id: material.id,
      material_name: material.name,
      quantity_used: 1,
      unit: material.unit,
      cost_per_unit: material.cost_per_unit,
    });
  };

  const totalCost = selectedParts.reduce(
    (sum, part) => sum + part.quantity_used * part.cost_per_unit,
    0
  );

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">
          Peças e Materiais Utilizados
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Peça
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="border rounded-lg p-4 bg-background space-y-3">
          <div className="grid gap-3">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Selecionar do Stock
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {materials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Carregando..." : "Nenhum material disponível"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() => handleSelectFromStock(material)}
                        className={cn(
                          "w-full text-left p-2 rounded border transition-colors",
                          newPart.material_id === material.id
                            ? "bg-primary/10 border-primary"
                            : "bg-card border-border hover:bg-muted"
                        )}
                      >
                        <div className="font-medium text-sm">
                          {material.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Stock: {material.current_stock} {material.unit} | €
                          {material.cost_per_unit.toFixed(2)}/{material.unit}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ou digitar manualmente */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Ou digite manualmente:
              </p>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1">
                    Nome da Peça *
                  </label>
                  <input
                    type="text"
                    value={newPart.material_name}
                    onChange={(e) =>
                      setNewPart({
                        ...newPart,
                        material_name: e.target.value,
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ex: Correia de Corrente"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={newPart.quantity_used}
                    onChange={(e) =>
                      setNewPart({
                        ...newPart,
                        quantity_used: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={newPart.unit || ""}
                    onChange={(e) =>
                      setNewPart({
                        ...newPart,
                        unit: e.target.value,
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="unidade"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1">
                    Custo Unitário (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPart.cost_per_unit}
                    onChange={(e) =>
                      setNewPart({
                        ...newPart,
                        cost_per_unit: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={handleAddPart}
              className="flex-1 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-3 py-2 text-sm font-medium text-muted-foreground border border-input rounded hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Selected Parts List */}
      {selectedParts.length > 0 && (
        <div className="space-y-2">
          {selectedParts.map((part, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-background border rounded"
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-card-foreground">
                  {part.material_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Quantidade: {part.quantity_used} {part.unit || "unidade"} | €
                  {part.cost_per_unit.toFixed(2)}/un | Total: €
                  {(part.quantity_used * part.cost_per_unit).toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePart(index)}
                className="p-1 text-muted-foreground hover:text-destructive ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {selectedParts.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded">
          <div className="font-medium text-sm text-card-foreground">
            Total de Peças: {selectedParts.length}
          </div>
          <div className="font-semibold text-sm text-primary">
            Custo Total: €{totalCost.toFixed(2)}
          </div>
        </div>
      )}

      {selectedParts.length === 0 && !showAddForm && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Nenhuma peça adicionada. Clique em "Adicionar Peça" para começar.
          </p>
        </div>
      )}
    </div>
  );
}
