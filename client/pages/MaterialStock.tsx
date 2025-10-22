import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Material {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  min_stock: number;
  current_stock: number;
  cost_per_unit: number;
  supplier: string;
  equipment_id?: number;
  equipment_name?: string;
  is_general_stock: boolean;
  notes?: string;
}

interface Equipment {
  id: number;
  name: string;
}

export default function MaterialStock() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    category: "",
    unit: "un",
    min_stock: 0,
    current_stock: 0,
    cost_per_unit: 0,
    supplier: "",
    equipment_id: "general",
    is_general_stock: true,
    notes: "",
  });

  useEffect(() => {
    loadMaterials();
    loadEquipments();
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await fetch("/api/materials");
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error("Erro ao carregar materiais:", error);
    }
  };

  const loadEquipments = async () => {
    try {
      const response = await fetch("/api/equipment");
      if (response.ok) {
        const data = await response.json();
        setEquipments(data);
      }
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingMaterial 
        ? `/api/materials/${editingMaterial.id}`
        : "/api/materials";
      
      const method = editingMaterial ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          equipment_id: formData.equipment_id && formData.equipment_id !== "general" ? parseInt(formData.equipment_id) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: editingMaterial ? "Material atualizado" : "Material criado",
          description: "Material guardado com sucesso",
        });
        loadMaterials();
        resetForm();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao guardar material",
      });
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      code: material.code,
      category: material.category,
      unit: material.unit,
      min_stock: material.min_stock,
      current_stock: material.current_stock,
      cost_per_unit: material.cost_per_unit,
      supplier: material.supplier || "",
      equipment_id: material.equipment_id?.toString() || "general",
      is_general_stock: material.is_general_stock,
      notes: material.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem a certeza que deseja eliminar este material?")) return;

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Material eliminado",
          description: "Material removido com sucesso",
        });
        loadMaterials();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao eliminar material",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      category: "",
      unit: "un",
      min_stock: 0,
      current_stock: 0,
      cost_per_unit: 0,
      supplier: "",
      equipment_id: "general",
      is_general_stock: true,
      notes: "",
    });
    setEditingMaterial(null);
    setIsDialogOpen(false);
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || material.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(materials.map(m => m.category).filter(Boolean)));

  const lowStockMaterials = materials.filter(m => m.current_stock <= m.min_stock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock de Material</h1>
          <p className="text-muted-foreground">
            Gestão de materiais e componentes para manutenção
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Material
        </Button>
      </div>

      {lowStockMaterials.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Alertas de Stock Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{material.name}</span>
                  <Badge variant="destructive">
                    {material.current_stock} / {material.min_stock} {material.unit}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar materiais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMaterials.map((material) => (
          <Card key={material.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{material.name}</CardTitle>
                  <CardDescription>{material.code}</CardDescription>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={material.current_stock <= material.min_stock ? "text-red-600 font-semibold" : "font-semibold"}>
                    {material.current_stock} {material.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mínimo:</span>
                  <span>{material.min_stock} {material.unit}</span>
                </div>
                {material.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Categoria:</span>
                    <Badge variant="secondary">{material.category}</Badge>
                  </div>
                )}
                {material.equipment_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipamento:</span>
                    <span className="text-xs">{material.equipment_name}</span>
                  </div>
                )}
                {material.is_general_stock && (
                  <Badge variant="outline" className="w-full justify-center">
                    Stock Geral
                  </Badge>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(material)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(material.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Editar Material" : "Novo Material"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do material para manutenção
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="kg">Quilograma</SelectItem>
                    <SelectItem value="l">Litro</SelectItem>
                    <SelectItem value="m">Metro</SelectItem>
                    <SelectItem value="cx">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stock Atual</Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Stock Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_per_unit">Custo Unitário (€)</Label>
                <Input
                  id="cost_per_unit"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="equipment_id">Equipamento Associado</Label>
                <Select
                  value={formData.equipment_id}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    equipment_id: value,
                    is_general_stock: value === "general"
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Stock Geral (todos os equipamentos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Stock Geral</SelectItem>
                    {equipments.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id.toString()}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingMaterial ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
