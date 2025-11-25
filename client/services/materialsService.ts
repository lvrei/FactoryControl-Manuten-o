import { apiFetch } from "@/config/api";

export interface Material {
  id: string;
  name: string;
  code?: string;
  category?: string;
  unit?: string;
  min_stock: number;
  current_stock: number;
  cost_per_unit: number;
  supplier?: string;
  equipment_id?: string;
  is_general_stock: boolean;
  notes?: string;
  created_at: string;
}

export interface MaintenancePartUsed {
  id: string;
  maintenance_id: string;
  material_id?: string;
  material_name: string;
  quantity_used: number;
  unit?: string;
  cost_per_unit: number;
  total_cost: number;
  created_at: string;
}

class MaterialsService {
  async getMaterials(): Promise<Material[]> {
    try {
      const r = await apiFetch("materials");
      if (!r.ok) throw new Error("Falha ao listar materiais");
      return r.json();
    } catch (e) {
      console.error("Error fetching materials:", e);
      return [];
    }
  }

  async getMaterialById(id: string): Promise<Material | null> {
    try {
      const materials = await this.getMaterials();
      return materials.find((m) => m.id === id) || null;
    } catch (e) {
      console.error("Error fetching material:", e);
      return null;
    }
  }

  async createMaterial(material: Omit<Material, "id" | "created_at">): Promise<string> {
    try {
      const r = await apiFetch("materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(material),
      });
      if (!r.ok) throw new Error("Falha ao criar material");
      const { id } = await r.json();
      return id;
    } catch (e) {
      console.error("Error creating material:", e);
      throw e;
    }
  }

  async updateMaterialStock(
    materialId: string,
    quantity: number,
    operation: "add" | "subtract"
  ): Promise<{ currentStock: number; newStock: number }> {
    try {
      const r = await apiFetch(`materials/${materialId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, operation }),
      });
      if (!r.ok) throw new Error("Falha ao atualizar stock");
      const data = await r.json();
      return {
        currentStock: data.currentStock,
        newStock: data.newStock,
      };
    } catch (e) {
      console.error("Error updating material stock:", e);
      throw e;
    }
  }

  async recordMaintenanceParts(
    maintenanceId: string,
    parts: Array<{
      material_id?: string;
      material_name: string;
      quantity_used: number;
      unit?: string;
      cost_per_unit: number;
    }>
  ): Promise<string[]> {
    try {
      const r = await apiFetch(`maintenance/${maintenanceId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parts),
      });
      if (!r.ok) throw new Error("Falha ao registar peças usadas");
      const { parts: partIds } = await r.json();
      return partIds;
    } catch (e) {
      console.error("Error recording maintenance parts:", e);
      throw e;
    }
  }

  async getMaintenanceParts(maintenanceId: string): Promise<MaintenancePartUsed[]> {
    try {
      const r = await apiFetch(`maintenance/${maintenanceId}/parts`);
      if (!r.ok) throw new Error("Falha ao listar peças utilizadas");
      return r.json();
    } catch (e) {
      console.error("Error fetching maintenance parts:", e);
      return [];
    }
  }

  async getAvailableMaterials(minStock: number = 0): Promise<Material[]> {
    try {
      const materials = await this.getMaterials();
      return materials.filter((m) => m.current_stock > minStock);
    } catch (e) {
      console.error("Error fetching available materials:", e);
      return [];
    }
  }
}

export const materialsService = new MaterialsService();
