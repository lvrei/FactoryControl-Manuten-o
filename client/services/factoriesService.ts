import { apiFetch } from "@/config/api";
export type FactoryRecord = {
  id: string;
  name: string;
  createdAt?: string;
};

class FactoriesService {
  async list(): Promise<FactoryRecord[]> {
    const r = await apiFetch("factories");
    if (!r.ok) throw new Error("Falha ao listar fábricas");
    return r.json();
  }
  async create(data: { id?: string; name: string }): Promise<FactoryRecord> {
    const r = await apiFetch("factories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e?.error || "Falha ao criar fábrica");
    }
    return r.json();
  }
}

export const factoriesService = new FactoriesService();
