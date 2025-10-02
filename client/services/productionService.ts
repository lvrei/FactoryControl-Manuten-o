import {
  ProductionOrder,
  ProductionOrderLine,
  ProductSheet,
  FoamType,
  Machine,
  OperatorWorkItem,
  ChatMessage,
  OperatorSession,
  ProductionFilters,
  FoamBlock,
  StockMovement,
  StockFilters,
  CuttingOperation,
} from "@/types/production";

/**
 * CONSOLIDATED PRODUCTION SERVICE
 * Versão unificada e otimizada dos múltiplos productionService files
 * Inclui as melhores práticas e robustez de todas as versões
 */
class ProductionService {
  private storageKey = "factoryControl_production";
  private initialized = false;

  // Dados mockados para desenvolvimento - em produção conectar ao backend
  private mockFoamTypes: FoamType[] = [
    {
      id: "1",
      name: "Espuma D20",
      density: 20,
      hardness: "Macia",
      color: "Branca",
      specifications: "Espuma de poliuretano flexível D20 - uso geral",
      pricePerM3: 45.0,
      stockColor: "#f8f9fa",
    },
    {
      id: "2",
      name: "Espuma D28",
      density: 28,
      hardness: "Média",
      color: "Amarela",
      specifications: "Espuma de poliuretano flexível D28 - móveis",
      pricePerM3: 65.0,
      stockColor: "#fff3cd",
    },
    {
      id: "3",
      name: "Espuma D35",
      density: 35,
      hardness: "Dura",
      color: "Azul",
      specifications: "Espuma de poliuretano flexível D35 - colchões",
      pricePerM3: 85.0,
      stockColor: "#d1ecf1",
    },
  ];

  private mockMachines: Machine[] = [
    {
      id: "bzm-001",
      name: "BZM-01",
      type: "BZM",
      status: "available",
      maxDimensions: { length: 4200, width: 2000, height: 2000 },
      cuttingPrecision: 1.0,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 1250,
      specifications: "Corte Inicial",
    },
    {
      id: "carousel-001",
      name: "Carrossel-01",
      type: "CAROUSEL",
      status: "busy",
      maxDimensions: { length: 2500, width: 1800, height: 1500 },
      cuttingPrecision: 2.0,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 980,
      specifications: "Coxins",
    },
    {
      id: "pre-cnc-001",
      name: "Pré-CNC-01",
      type: "PRE_CNC",
      status: "available",
      maxDimensions: { length: 2500, width: 1500, height: 1200 },
      cuttingPrecision: 1.0,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 1680,
      specifications: "Pré-processamento",
    },
    {
      id: "cnc-001",
      name: "CNC-01",
      type: "CNC",
      status: "maintenance",
      maxDimensions: { length: 1200, width: 1200, height: 600 },
      cuttingPrecision: 0.5,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 2150,
      specifications: "Acabamento",
    },
  ];

  // Métodos privados - Robustez e inicialização
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeSystem();
      this.initialized = true;
    }
  }

  private initializeSystem(): void {
    try {
      const stored = this.getStoredData();

      // Validar e limpar dados corrompidos se necessário
      if (!stored || typeof stored !== "object") {
        console.warn(
          "🧹 Dados corrompidos detectados, inicializando sistema limpo",
        );
        this.initializeCleanSystem();
        return;
      }

      // Garantir estrutura mínima
      const requiredKeys = [
        "productionOrders",
        "foamTypes",
        "machines",
        "operatorSessions",
        "chatMessages",
      ];
      const missingKeys = requiredKeys.filter(
        (key) => !Array.isArray(stored[key]),
      );

      if (missingKeys.length > 0) {
        console.warn(
          "🔧 Estrutura de dados incompleta, corrigindo:",
          missingKeys,
        );
        this.initializeCleanSystem();
      }

      console.log("✅ ProductionService inicializado com sucesso");
    } catch (error) {
      console.error("❌ Erro na inicializaç��o:", error);
      this.initializeCleanSystem();
    }
  }

  private getStoredData(): any {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Validação básica da estrutura
      if (!parsed || typeof parsed !== "object") {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error("❌ Erro ao ler dados armazenados:", error);
      return null;
    }
  }

  private saveData(data: any): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log("💾 Dados salvos com sucesso");
    } catch (error) {
      console.error("❌ Erro ao salvar dados:", error);

      // Tentar limpeza automática se quota excedida
      if (error.name === "QuotaExceededError") {
        console.warn("🧹 Quota excedida, limpando dados antigos...");
        this.clearOldData();
        // Tentar novamente
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    }
  }

  private clearOldData(): void {
    try {
      const data = this.getStoredData();
      if (data) {
        // Manter apenas dados dos últimos 30 dias
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        // Limpar mensagens antigas
        if (data.chatMessages) {
          data.chatMessages = data.chatMessages.filter(
            (msg) => new Date(msg.timestamp) > cutoffDate,
          );
        }

        // Limpar sess��es antigas
        if (data.operatorSessions) {
          data.operatorSessions = data.operatorSessions.filter(
            (session) => new Date(session.startTime) > cutoffDate,
          );
        }

        this.saveData(data);
      }
    } catch (error) {
      console.error("❌ Erro ao limpar dados antigos:", error);
    }
  }

  // Métodos públicos - Ordens de Produção
  private notifyOnce(key: string, message: string) {
    try {
      const k = `fc_notify_${key}`;
      if (!sessionStorage.getItem(k)) {
        alert(message);
        sessionStorage.setItem(k, "1");
      }
    } catch {}
  }

  async getProductionOrders(
    filters?: ProductionFilters,
  ): Promise<ProductionOrder[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.customer) params.set("customer", filters.customer);
      if ((filters as any)?.createdBy)
        params.set("createdBy", (filters as any).createdBy);
      const resp = await fetch(
        `/api/orders${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!resp.ok) throw new Error("API orders falhou");
      let orders: ProductionOrder[] = await resp.json();
      if (filters) {
        orders = orders.filter((order) => {
          if (
            filters.status &&
            filters.status.length &&
            !filters.status.includes(order.status)
          )
            return false;
          if (
            filters.priority &&
            filters.priority.length &&
            !filters.priority.includes(order.priority)
          )
            return false;
          if (
            filters.customer &&
            !order.customer.name
              .toLowerCase()
              .includes(filters.customer.toLowerCase())
          )
            return false;
          if (
            (filters as any).orderNumber &&
            !order.orderNumber
              .toLowerCase()
              .includes((filters as any).orderNumber.toLowerCase())
          )
            return false;
          if (
            (filters as any).createdBy &&
            order.createdBy !== (filters as any).createdBy
          )
            return false;
          return true;
        });
      }
      return orders;
    } catch (error) {
      console.warn("⚠️ Falha API /api/orders, usando localStorage");
      this.notifyOnce(
        "api_fallback",
        "Ligação ao servidor indisponível. A trabalhar em modo offline (local).",
      );
      this.ensureInitialized();
      const data = this.getStoredData();
      return data?.productionOrders || [];
    }
  }

  async createProductionOrder(
    order: Omit<ProductionOrder, "id" | "createdAt" | "updatedAt">,
  ): Promise<ProductionOrder> {
    try {
      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      if (!resp.ok) throw new Error("API create order falhou");
      const { id } = await resp.json();
      return {
        ...order,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ProductionOrder;
    } catch (error) {
      console.warn("⚠️ Falha API create order, usando localStorage");
      this.notifyOnce(
        "api_fallback",
        "Ligação ao servidor indisponível. A trabalhar em modo offline (local).",
      );
      this.ensureInitialized();
      const data = this.getStoredData() || { productionOrders: [] };
      const newOrder: ProductionOrder = {
        ...order,
        id: `OP-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: order.status || "created",
      };
      data.productionOrders = [...(data.productionOrders || []), newOrder];
      this.saveData(data);
      return newOrder;
    }
  }

  async updateProductionOrder(
    id: string,
    updates: Partial<ProductionOrder>,
  ): Promise<ProductionOrder> {
    try {
      const resp = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!resp.ok) throw new Error("API update order falhou");
      const current = (await this.getProductionOrders()).find(
        (o) => o.id === id,
      ) as ProductionOrder | undefined;
      return { ...(current || ({ id } as any)), ...updates } as ProductionOrder;
    } catch (error) {
      console.warn("⚠️ Falha API update order, usando localStorage");
      this.notifyOnce(
        "api_fallback",
        "Ligação ao servidor indisponível. A trabalhar em modo offline (local).",
      );
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) throw new Error("Dados não encontrados");
      const orderIndex = data.productionOrders.findIndex(
        (o: ProductionOrder) => o.id === id,
      );
      if (orderIndex === -1) throw new Error("Ordem não encontrada");
      data.productionOrders[orderIndex] = {
        ...data.productionOrders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveData(data);
      return data.productionOrders[orderIndex];
    }
  }

  async deleteProductionOrder(id: string): Promise<void> {
    try {
      const resp = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("API delete order falhou");
    } catch (error) {
      console.warn("⚠️ Falha API delete order, usando localStorage");
      this.notifyOnce(
        "api_fallback",
        "Ligação ao servidor indisponível. A trabalhar em modo offline (local).",
      );
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) return;
      data.productionOrders = data.productionOrders.filter(
        (o: ProductionOrder) => o.id !== id,
      );
      this.saveData(data);
    }
  }

  // Métodos públicos - Máquinas (com validação defensiva)
  async getMachines(): Promise<Machine[]> {
    try {
      // Tentar via API (Neon)
      const resp = await fetch("/api/machines");
      if (resp.ok) {
        const list = await resp.json();
        return list as Machine[];
      }
      throw new Error("API machines falhou");
    } catch (error) {
      console.warn(
        "⚠️ Falha API /api/machines, usando localStorage:",
        (error as any)?.message,
      );
      this.ensureInitialized();
      const data = this.getStoredData();
      if (
        !data?.machines ||
        !Array.isArray(data.machines) ||
        data.machines.length === 0
      ) {
        const dataToSave = { ...data, machines: this.mockMachines };
        this.saveData(dataToSave);
        return this.mockMachines;
      }
      return data.machines;
    }
  }

  // Criar máquina
  async createMachine(
    machine: Pick<
      Machine,
      "name" | "type" | "status" | "maxDimensions" | "cuttingPrecision"
    >,
  ): Promise<Machine> {
    try {
      const resp = await fetch("/api/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(machine),
      });
      if (!resp.ok) throw new Error("API createMachine falhou");
      const { id } = await resp.json();
      return {
        id,
        currentOperator: null,
        lastMaintenance: new Date().toISOString(),
        operatingHours: 0,
        specifications: "",
        ...machine,
      } as Machine;
    } catch (error) {
      console.warn(
        "⚠️ Falha API createMachine, usando localStorage:",
        (error as any)?.message,
      );
      this.ensureInitialized();
      const data = this.getStoredData() || {};
      const machines: Machine[] =
        Array.isArray(data.machines) && data.machines.length > 0
          ? data.machines
          : [...this.mockMachines];
      const newMachine: Machine = {
        id: `${machine.type.toLowerCase()}-${Date.now()}`,
        name: machine.name,
        type: machine.type,
        status: machine.status || "available",
        maxDimensions: machine.maxDimensions,
        cuttingPrecision: machine.cuttingPrecision,
        currentOperator: null,
        lastMaintenance: new Date().toISOString(),
        operatingHours: 0,
        specifications: "",
      };
      data.machines = [...machines, newMachine];
      data.lastUpdated = new Date().toISOString();
      this.saveData(data);
      return newMachine;
    }
  }

  // Atualizar máquina (nome, tipo, status, capacidades...)
  async updateMachine(
    machineId: string,
    updates: Partial<Machine>,
  ): Promise<Machine> {
    try {
      const resp = await fetch(`/api/machines/${machineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!resp.ok) throw new Error("API updateMachine falhou");
      // retornar merge local
      const current = (await this.getMachines()).find(
        (m) => m.id === machineId,
      ) as Machine | undefined;
      return {
        ...(current || ({ id: machineId } as any)),
        ...updates,
      } as Machine;
    } catch (error) {
      console.warn(
        "⚠️ Falha API updateMachine, usando localStorage:",
        (error as any)?.message,
      );
      this.ensureInitialized();
      const data = this.getStoredData() || {};
      if (!Array.isArray(data.machines) || data.machines.length === 0)
        data.machines = [...this.mockMachines];
      const idx = data.machines.findIndex((m: Machine) => m.id === machineId);
      if (idx === -1) {
        const mock = this.mockMachines.find((m) => m.id === machineId);
        if (!mock) throw new Error("Máquina não encontrada");
        data.machines.push({ ...mock, ...updates });
      } else {
        data.machines[idx] = { ...data.machines[idx], ...updates };
      }
      data.lastUpdated = new Date().toISOString();
      this.saveData(data);
      return data.machines.find((m: Machine) => m.id === machineId)!;
    }
  }

  // Excluir máquina
  async deleteMachine(machineId: string): Promise<void> {
    try {
      const resp = await fetch(`/api/machines/${machineId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("API deleteMachine falhou");
    } catch (error) {
      console.warn(
        "⚠️ Falha API deleteMachine, usando localStorage:",
        (error as any)?.message,
      );
      this.ensureInitialized();
      const data = this.getStoredData() || {};
      if (!Array.isArray(data.machines) || data.machines.length === 0)
        data.machines = [...this.mockMachines];
      data.machines = data.machines.filter((m: Machine) => m.id !== machineId);
      data.lastUpdated = new Date().toISOString();
      this.saveData(data);
    }
  }

  // Atualizar status da máquina (usado pela manutenção)
  async updateMachineStatus(
    machineId: string,
    status: Machine["status"],
  ): Promise<void> {
    try {
      await this.updateMachine(machineId, { status });
      console.log(
        "🔧 Status da máquina atualizado (API):",
        machineId,
        "→",
        status,
      );
    } catch (error) {
      console.warn(
        "⚠️ Falha API updateMachineStatus, fallback local:",
        (error as any)?.message,
      );
      this.ensureInitialized();
      const data = this.getStoredData() || {};
      if (!Array.isArray(data.machines) || data.machines.length === 0)
        data.machines = [...this.mockMachines];
      const machineIndex = data.machines.findIndex(
        (m: Machine) => m.id === machineId,
      );
      if (machineIndex !== -1) {
        data.machines[machineIndex].status = status;
        if (status === "maintenance")
          data.machines[machineIndex].currentOperator = null;
      }
      data.lastUpdated = new Date().toISOString();
      this.saveData(data);
    }
  }

  // Tipos de Espuma (DB com fallback local)
  async getFoamTypes(): Promise<FoamType[]> {
    try {
      const r = await fetch("/api/foam-types");
      if (!r.ok) throw new Error("API foam-types falhou");
      return r.json();
    } catch (error) {
      console.warn("⚠️ Falha API /api/foam-types, usando localStorage");
      this.ensureInitialized();
      const data = this.getStoredData();
      const foamTypes = data?.foamTypes || this.mockFoamTypes;
      return foamTypes.map((foam) => ({
        id: foam.id || `foam-${Date.now()}`,
        name: foam.name || "Espuma Sem Nome",
        density: foam.density || 20,
        hardness: foam.hardness || "Média",
        color: foam.color || "Branca",
        specifications: foam.specifications || "Especificações não informadas",
        pricePerM3: foam.pricePerM3 || 0,
        stockColor: foam.stockColor || "#f8f9fa",
      }));
    }
  }

  async createFoamType(data: Omit<FoamType, "id">): Promise<string> {
    try {
      const r = await fetch("/api/foam-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("API criar foam-type falhou");
      const j = await r.json();
      return j.id as string;
    } catch (error) {
      console.warn("⚠️ Falha API create foam-type, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      const list: FoamType[] = store.foamTypes || this.mockFoamTypes;
      const id = `foam-${Date.now()}`;
      store.foamTypes = [...list, { ...data, id }];
      this.saveData(store);
      return id;
    }
  }

  async updateFoamType(id: string, patch: Partial<FoamType>): Promise<void> {
    try {
      const r = await fetch(`/api/foam-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error("API atualizar foam-type falhou");
    } catch (error) {
      console.warn("⚠️ Falha API update foam-type, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.foamTypes = (store.foamTypes || this.mockFoamTypes).map(
        (f: FoamType) => (f.id === id ? { ...f, ...patch } : f),
      );
      this.saveData(store);
    }
  }

  async deleteFoamType(id: string): Promise<void> {
    try {
      const r = await fetch(`/api/foam-types/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("API apagar foam-type falhou");
    } catch (error) {
      console.warn("⚠️ Falha API delete foam-type, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.foamTypes = (store.foamTypes || this.mockFoamTypes).filter(
        (f: FoamType) => f.id !== id,
      );
      this.saveData(store);
    }
  }

  // Fichas Técnicas (DB com fallback local)
  async getProductSheets(): Promise<ProductSheet[]> {
    try {
      const r = await fetch("/api/product-sheets");
      if (!r.ok) throw new Error("API product-sheets falhou");
      return r.json();
    } catch (error) {
      console.warn("⚠️ Falha API /api/product-sheets, usando localStorage");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      const foams: FoamType[] = store.foamTypes || this.mockFoamTypes;
      const sheets: any[] = store.productSheets || [];
      return sheets.map((s) => ({
        id: s.id,
        internalReference: s.internalReference,
        foamType: foams.find((f) => f.id === s.foamTypeId) || foams[0],
        standardDimensions: s.standardDimensions || {
          length: 0,
          width: 0,
          height: 0,
        },
        description: s.description || "",
        documents: s.documents || [],
        photos: s.photos || [],
      }));
    }
  }

  async createProductSheet(
    data: Omit<ProductSheet, "id">,
  ): Promise<ProductSheet> {
    try {
      const payload = {
        internalReference: data.internalReference,
        foamTypeId: data.foamType.id,
        standardDimensions: data.standardDimensions,
        description: data.description,
        documents: data.documents,
        photos: data.photos,
      };
      const r = await fetch("/api/product-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("API criar product-sheet falhou");
      const { id } = await r.json();
      return { ...data, id } as ProductSheet;
    } catch (error) {
      console.warn("⚠️ Falha API create product-sheet, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      const id = `ps-${Date.now()}`;
      const entry = {
        id,
        internalReference: data.internalReference,
        foamTypeId: data.foamType.id,
        standardDimensions: data.standardDimensions,
        description: data.description,
        documents: data.documents,
        photos: data.photos,
      };
      store.productSheets = [...(store.productSheets || []), entry];
      this.saveData(store);
      return { ...data, id } as ProductSheet;
    }
  }

  async updateProductSheet(
    id: string,
    data: Omit<ProductSheet, "id">,
  ): Promise<ProductSheet> {
    try {
      const payload = {
        internalReference: data.internalReference,
        foamTypeId: data.foamType.id,
        standardDimensions: data.standardDimensions,
        description: data.description,
        documents: data.documents,
        photos: data.photos,
      };
      const r = await fetch(`/api/product-sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("API atualizar product-sheet falhou");
      return { ...data, id } as ProductSheet;
    } catch (error) {
      console.warn("⚠️ Falha API update product-sheet, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.productSheets = (store.productSheets || []).map((s: any) =>
        s.id === id
          ? {
              ...s,
              internalReference: data.internalReference,
              foamTypeId: data.foamType.id,
              standardDimensions: data.standardDimensions,
              description: data.description,
              documents: data.documents,
              photos: data.photos,
            }
          : s,
      );
      this.saveData(store);
      return { ...data, id } as ProductSheet;
    }
  }

  async deleteProductSheet(id: string): Promise<void> {
    try {
      const r = await fetch(`/api/product-sheets/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("API apagar product-sheet falhou");
    } catch (error) {
      console.warn("⚠️ Falha API delete product-sheet, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.productSheets = (store.productSheets || []).filter(
        (s: any) => s.id !== id,
      );
      this.saveData(store);
    }
  }

  // Stock - Foam Blocks (DB com fallback local)
  async getFoamBlocks(filters?: StockFilters): Promise<FoamBlock[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.warehouse) params.set("warehouse", filters.warehouse);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.qualityStatus)
        params.set("qualityStatus", filters.qualityStatus);
      if (filters?.foamType) params.set("foamType", filters.foamType);
      if (filters?.productionNumber)
        params.set("productionNumber", filters.productionNumber);
      if (filters?.blockNumber) params.set("blockNumber", filters.blockNumber);
      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        params.set("startDate", filters.dateRange.start);
        params.set("endDate", filters.dateRange.end);
      }
      const r = await fetch(
        `/api/foam-blocks${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!r.ok) throw new Error("API foam-blocks falhou");
      return r.json();
    } catch (error) {
      console.warn("⚠️ Falha API /api/foam-blocks, usando localStorage");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      const blocks: any[] = store.foamBlocks || [];
      const foams: FoamType[] = store.foamTypes || this.mockFoamTypes;
      let list: FoamBlock[] = blocks.map((b: any) => ({
        id: b.id,
        productionNumber: b.productionNumber,
        foamType: foams.find((f) => f.id === b.foamTypeId) || foams[0],
        dimensions: b.dimensions,
        volume: b.volume,
        weight: b.weight,
        productionDate: b.productionDate,
        blockNumber: b.blockNumber,
        warehouse: b.warehouse,
        status: b.status,
        qualityStatus: b.qualityStatus,
        nonConformities: b.nonConformities || [],
        comments: b.comments || "",
        receivedDate: b.receivedDate,
        receivedBy: b.receivedBy,
        reservedFor: b.reservedFor,
        consumedDate: b.consumedDate,
        consumedBy: b.consumedBy,
        photos: b.photos || [],
      }));
      if (filters?.warehouse && filters.warehouse !== "all")
        list = list.filter((x) => x.warehouse === filters.warehouse);
      if (filters?.status)
        list = list.filter((x) => x.status === filters.status);
      if (filters?.qualityStatus)
        list = list.filter((x) => x.qualityStatus === filters.qualityStatus);
      if (filters?.foamType)
        list = list.filter((x) =>
          x.foamType.name
            .toLowerCase()
            .includes(filters.foamType!.toLowerCase()),
        );
      if (filters?.productionNumber)
        list = list.filter((x) =>
          x.productionNumber
            .toLowerCase()
            .includes(filters.productionNumber!.toLowerCase()),
        );
      if (filters?.blockNumber)
        list = list.filter((x) =>
          x.blockNumber
            .toLowerCase()
            .includes(filters.blockNumber!.toLowerCase()),
        );
      return list;
    }
  }

  async createFoamBlock(
    data: Omit<FoamBlock, "id" | "volume" | "receivedDate"> & {
      foamType: FoamType;
    },
  ): Promise<string> {
    try {
      const payload = {
        productionNumber: data.productionNumber,
        foamTypeId: data.foamType.id,
        dimensions: data.dimensions,
        weight: data.weight,
        productionDate: data.productionDate,
        blockNumber: data.blockNumber,
        warehouse: data.warehouse,
        status: data.status,
        qualityStatus: data.qualityStatus,
        nonConformities: data.nonConformities,
        comments: data.comments,
        receivedBy: data.receivedBy,
        reservedFor: data.reservedFor,
        consumedDate: data.consumedDate,
        consumedBy: data.consumedBy,
        photos: data.photos,
      };
      const r = await fetch("/api/foam-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("API criar foam-block falhou");
      const j = await r.json();
      return j.id as string;
    } catch (error) {
      console.warn("⚠️ Falha API create foam-block, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      const list: any[] = store.foamBlocks || [];
      const id = `fblk-${Date.now()}`;
      const volume =
        (data.dimensions.length *
          data.dimensions.width *
          data.dimensions.height) /
        1_000_000;
      list.push({
        id,
        productionNumber: data.productionNumber,
        foamTypeId: data.foamType.id,
        dimensions: data.dimensions,
        volume,
        weight: data.weight,
        productionDate: data.productionDate,
        blockNumber: data.blockNumber,
        warehouse: data.warehouse,
        status: data.status,
        qualityStatus: data.qualityStatus,
        nonConformities: data.nonConformities,
        comments: data.comments,
        receivedDate: new Date().toISOString(),
        receivedBy: data.receivedBy,
        reservedFor: data.reservedFor,
        consumedDate: data.consumedDate,
        consumedBy: data.consumedBy,
        photos: data.photos,
      });
      store.foamBlocks = list;
      this.saveData(store);
      return id;
    }
  }

  async updateFoamBlock(
    id: string,
    patch: Partial<Omit<FoamBlock, "id" | "foamType">> & {
      foamType?: FoamType;
    },
  ): Promise<void> {
    try {
      const payload: any = { ...patch };
      if (patch.foamType) payload.foamTypeId = patch.foamType.id;
      delete payload.foamType;
      const r = await fetch(`/api/foam-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("API atualizar foam-block falhou");
    } catch (error) {
      console.warn("⚠️ Falha API update foam-block, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.foamBlocks = (store.foamBlocks || []).map((b: any) =>
        b.id === id
          ? {
              ...b,
              ...patch,
              foamTypeId: (patch as any).foamType
                ? (patch as any).foamType.id
                : b.foamTypeId,
            }
          : b,
      );
      this.saveData(store);
    }
  }

  async deleteFoamBlock(id: string): Promise<void> {
    try {
      const r = await fetch(`/api/foam-blocks/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("API apagar foam-block falhou");
    } catch (error) {
      console.warn("⚠️ Falha API delete foam-block, salvando local");
      this.ensureInitialized();
      const store = this.getStoredData() || {};
      store.foamBlocks = (store.foamBlocks || []).filter(
        (b: any) => b.id !== id,
      );
      this.saveData(store);
    }
  }

  async getStockSummary(): Promise<any> {
    try {
      const r = await fetch("/api/stock/summary");
      if (!r.ok) throw new Error("API stock/summary falhou");
      return r.json();
    } catch (error) {
      console.warn("⚠️ Falha API /api/stock/summary, calculando local");
      const blocks = await this.getFoamBlocks();
      const totalBlocks = blocks.length;
      const totalVolume = blocks.reduce((s, b) => s + (b.volume || 0), 0);
      const byWarehouse: any[] = [];
      const mapW: Record<
        string,
        { warehouse: string; blocks: number; volume: number }
      > = {};
      blocks.forEach((b) => {
        const k = b.warehouse;
        mapW[k] = mapW[k] || { warehouse: k, blocks: 0, volume: 0 };
        mapW[k].blocks++;
        mapW[k].volume += b.volume || 0;
      });
      for (const v of Object.values(mapW)) byWarehouse.push(v);
      const byStatus: any[] = [];
      const mapS: Record<string, { status: string; blocks: number }> = {};
      blocks.forEach((b) => {
        const k = b.status;
        mapS[k] = mapS[k] || { status: k, blocks: 0 };
        mapS[k].blocks++;
      });
      for (const v of Object.values(mapS)) byStatus.push(v);
      return { totalBlocks, totalVolume, byWarehouse, byStatus };
    }
  }

  // Métodos públicos - Itens de Trabalho do Operador
  async getOperatorWorkItems(
    machineId?: string,
    filters?: any,
  ): Promise<OperatorWorkItem[]> {
    try {
      this.ensureInitialized();
      const orders = await this.getProductionOrders();
      const workItems: OperatorWorkItem[] = [];

      for (const order of orders) {
        if (
          order.status === "completed" ||
          order.status === "cancelled" ||
          order.status === "shipped"
        )
          continue;

        for (const line of order.lines || []) {
          if (line.status === "completed") continue;

          for (const operation of line.cuttingOperations || []) {
            if (operation.status === "completed") continue;
            if (machineId && operation.machineId !== machineId) continue;

            // Find machine details
            const machine = this.mockMachines.find(
              (m) => m.id === operation.machineId,
            );
            const machineType = machine?.type || "UNKNOWN";

            // Prerequisite gating: non-BZM ops require BZM completed; CNC also requires PRE_CNC if present
            const bzmOp = (line.cuttingOperations || []).find((op) => {
              const m = this.mockMachines.find((mm) => mm.id === op.machineId);
              return m?.type === "BZM";
            });
            const preCncOp = (line.cuttingOperations || []).find((op) => {
              const m = this.mockMachines.find((mm) => mm.id === op.machineId);
              return m?.type === "PRE_CNC";
            });

            let blocked = false;
            if (
              machineType !== "BZM" &&
              bzmOp &&
              bzmOp.status !== "completed"
            ) {
              blocked = true;
            }
            if (
              !blocked &&
              machineType === "CNC" &&
              preCncOp &&
              preCncOp.status !== "completed"
            ) {
              blocked = true;
            }
            if (blocked) continue;

            // Convert priority string to number
            const priorityMap = { low: 1, medium: 5, high: 8, urgent: 10 };

            workItems.push({
              id: `${order.id}-${line.id}-${operation.id}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              lineId: line.id,
              operationId: operation.id,
              customer: order.customer.name,
              foamType: line.foamType.name,
              inputDimensions: operation.inputDimensions,
              outputDimensions: operation.outputDimensions,
              quantity: operation.quantity,
              remainingQuantity:
                operation.quantity - (operation.completedQuantity || 0),
              machineId: operation.machineId,
              machineName: machine?.name || "Máquina Desconhecida",
              machineType: machineType,
              priority: priorityMap[order.priority] || 5,
              expectedDeliveryDate: order.expectedDeliveryDate,
              estimatedTime: operation.estimatedTime,
              observations: operation.observations || "",
            });
          }
        }
      }

      return workItems.sort((a, b) => {
        // Sort by priority (higher number = higher priority)
        return (b.priority || 0) - (a.priority || 0);
      });
    } catch (error) {
      console.error("❌ Erro ao buscar itens de trabalho:", error);
      return [];
    }
  }

  // Método ROBUSTO para completar item de trabalho (melhor de todas as versões)
  async completeWorkItem(
    workItemId: string,
    completedQuantity: number,
    operatorNotes?: string,
  ): Promise<void> {
    try {
      this.ensureInitialized();
      console.log(
        "🔧 Completando item:",
        workItemId,
        "Qtd:",
        completedQuantity,
      );

      // Parse robusto do ID (formato: ${orderId}-${lineId}-${operationId})
      // Usar getProductionOrders() ao invés de getStoredData() para garantir que temos os dados mais recentes
      const orders = await this.getProductionOrders();
      if (!orders || orders.length === 0) {
        throw new Error("Não há ordens de produção no sistema");
      }

      console.log(`🔍 Analisando workItemId: ${workItemId}`);
      console.log(`📊 Total de ordens no sistema: ${orders.length}`);

      let orderId = "";
      let lineId = "";
      let operationId = "";

      // Estratégia 1: Procurar a ordem e linha nos dados reais
      let foundOrder: any = null;
      let foundLine: any = null;
      let foundOperation: any = null;

      // Procurar em todas as ordens
      for (const order of orders) {
        for (const line of order.lines || []) {
          for (const op of line.cuttingOperations || []) {
            // Construir o ID esperado
            const expectedId = `${order.id}-${line.id}-${op.id}`;
            if (expectedId === workItemId) {
              foundOrder = order;
              foundLine = line;
              foundOperation = op;
              orderId = order.id;
              lineId = line.id;
              operationId = op.id;
              console.log(`✅ Match exato encontrado!`);
              break;
            }
          }
          if (foundOperation) break;
        }
        if (foundOperation) break;
      }

      // Estratégia 2: Se não encontrou match exato, tentar parsing por partes
      if (!foundOperation) {
        console.log(`🔄 Match exato não encontrado, tentando parsing por partes...`);

        // Primeiro, achar a ordem que começa o workItemId
        for (const order of orders) {
          if (workItemId.startsWith(order.id + "-")) {
            foundOrder = order;
            orderId = order.id;
            const remainder = workItemId.substring(order.id.length + 1);

            console.log(`✅ Ordem encontrada: ${orderId}`);
            console.log(`📝 Restante para analisar: "${remainder}"`);

            // Agora achar a linha
            for (const line of order.lines || []) {
              if (remainder.startsWith(line.id + "-")) {
                foundLine = line;
                lineId = line.id;
                const opRemainder = remainder.substring(line.id.length + 1);
                operationId = opRemainder;

                // Verificar se a operação existe
                foundOperation = line.cuttingOperations?.find(op => op.id === operationId);

                if (foundOperation) {
                  console.log(`✅ Linha: ${lineId}, Operação: ${operationId}`);
                  break;
                }
              }
            }

            if (foundOperation) break;
          }
        }
      }

      // Estratégia 3: Busca flexível se ainda não encontrou
      if (!foundOperation && orderId) {
        console.log(`🔄 Tentando busca flexível na ordem ${orderId}...`);
        const order = orders.find(o => o.id === orderId);

        if (order) {
          for (const line of order.lines || []) {
            for (const op of line.cuttingOperations || []) {
              // Verificar se os IDs estão contidos no workItemId
              if (workItemId.includes(`-${line.id}-`) && workItemId.endsWith(`-${op.id}`)) {
                foundLine = line;
                foundOperation = op;
                lineId = line.id;
                operationId = op.id;
                console.log(`✅ Match flexível - Linha: ${lineId}, Op: ${operationId}`);
                break;
              }
            }
            if (foundOperation) break;
          }
        }
      }

      // Verificação final
      if (!foundOrder || !foundLine || !foundOperation) {
        console.error(`❌ Não foi possível encontrar a operação`);
        console.error(`   Parsed orderId: "${orderId}"`);
        console.error(`   Parsed lineId: "${lineId}"`);
        console.error(`   Parsed operationId: "${operationId}"`);
        console.error(`\n📋 Ordens disponíveis:`);
        orders.forEach(o => {
          console.error(`   Ordem: ${o.id} - ${o.orderNumber}`);
          o.lines?.forEach(l => {
            console.error(`     Linha: ${l.id}`);
            l.cuttingOperations?.forEach(op => {
              console.error(`       Op: ${op.id} - Status: ${op.status}`);
            });
          });
        });
        throw new Error(`Item de trabalho não encontrado no sistema: ${workItemId}`);
      }

      console.log("✅ Parsing completo:", { orderId, lineId, operationId });

      // Encontrar ordem
      const order = data.productionOrders.find((o) => o.id === orderId);
      if (!order) {
        throw new Error(`Ordem não encontrada: ${orderId}`);
      }

      // Encontrar linha
      const line = order.lines?.find((l) => l.id === lineId);
      if (!line) {
        throw new Error(`Linha n��o encontrada: ${lineId}`);
      }

      // Encontrar operação (estratégias múltiplas)
      let operation = line.cuttingOperations?.find(
        (op) => op.id === operationId,
      );

      if (!operation) {
        // Estratégia 2: toString()
        operation = line.cuttingOperations?.find(
          (op) => op.id?.toString() === operationId,
        );
      }

      if (!operation) {
        // Estratégia 3: índice numérico
        const numericIndex = parseInt(operationId);
        if (
          !isNaN(numericIndex) &&
          line.cuttingOperations &&
          line.cuttingOperations[numericIndex]
        ) {
          operation = line.cuttingOperations[numericIndex];
        }
      }

      if (!operation) {
        throw new Error(`Operação não encontrada: ${operationId}`);
      }

      // Validações
      const currentCompleted = operation.completedQuantity || 0;
      const opTargetQty =
        typeof operation.quantity === "number" && operation.quantity > 0
          ? operation.quantity
          : line.quantity;
      const remaining = opTargetQty - currentCompleted;

      if (completedQuantity > remaining) {
        throw new Error(
          `Quantidade excede o restante: ${completedQuantity} > ${remaining}`,
        );
      }

      if (completedQuantity <= 0) {
        throw new Error("Quantidade deve ser positiva");
      }

      // Atualizar operação
      operation.completedQuantity = currentCompleted + completedQuantity;
      operation.status =
        operation.completedQuantity >= opTargetQty
          ? "completed"
          : "in_progress";
      operation.completedAt = new Date().toISOString();

      if (operatorNotes) {
        operation.notes =
          (operation.notes || "") +
          `\n[${new Date().toLocaleString()}] ${operatorNotes}`;
      }

      // Atualizar linha
      const opCompletions = (line.cuttingOperations || []).map(
        (op) => op.completedQuantity || 0,
      );
      const minCompleted =
        opCompletions.length > 0 ? Math.min(...opCompletions) : 0;
      line.completedQuantity = Math.min(minCompleted, line.quantity);
      const allOpsCompleted = (line.cuttingOperations || []).every(
        (op) =>
          op.status === "completed" &&
          (op.completedQuantity || 0) >= (op.quantity || 0),
      );
      line.status = allOpsCompleted ? "completed" : "in_progress";

      // Atualizar ordem
      const allLinesCompleted =
        order.lines?.every((l) => l.status === "completed") || false;
      if (allLinesCompleted) {
        order.status = "completed";
        order.completedAt = new Date().toISOString();
      } else {
        order.status = "in_progress";
      }

      order.updatedAt = new Date().toISOString();

      // Salvar os dados atualizados
      // Primeiro, obter todos os dados do localStorage
      const storedData = this.getStoredData() || {};
      // Atualizar o array de ordens
      storedData.productionOrders = orders;
      // Salvar de volta
      this.saveData(storedData);

      // Verificação pós-save (detecta problemas de quota/corrupção)
      const verification = this.getStoredData();
      const verifyOrder = verification?.productionOrders?.find(
        (o) => o.id === orderId,
      );

      if (!verifyOrder) {
        console.warn("⚠️ Aviso: Verificação pós-save falhou, mas a operação foi completada");
      }

      console.log("✅ Item completado com sucesso");
      alert(`✅ ${completedQuantity} unidades completadas com sucesso!`);
    } catch (error) {
      console.error("❌ Erro ao completar item:", error);
      alert(`❌ Erro: ${error.message}`);
      throw error;
    }
  }

  // Métodos públicos - Chat
  async getChatMessages(
    machineId?: string,
    operatorId?: string,
  ): Promise<ChatMessage[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      let messages = data?.chatMessages || [];

      if (machineId) {
        messages = messages.filter((msg) => msg.machineId === machineId);
      }

      if (operatorId) {
        messages = messages.filter(
          (msg) => msg.from === operatorId || msg.to === operatorId,
        );
      }

      return messages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    } catch (error) {
      console.error("❌ Erro ao buscar mensagens:", error);
      return [];
    }
  }

  async sendChatMessage(
    message: Omit<ChatMessage, "id" | "timestamp" | "isRead">,
  ): Promise<ChatMessage> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || { chatMessages: [] };

      const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      data.chatMessages = [...(data.chatMessages || []), newMessage];
      this.saveData(data);

      return newMessage;
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.chatMessages) return;

      const message = data.chatMessages.find((m) => m.id === messageId);
      if (message) {
        message.isRead = true;
        this.saveData(data);
      }
    } catch (error) {
      console.error("❌ Erro ao marcar mensagem:", error);
    }
  }

  // M��todos públicos - Sessões de Operador
  async startOperatorSession(
    operatorId: string,
    operatorName: string,
    machineId: string,
  ): Promise<OperatorSession> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || { operatorSessions: [] };

      // Encerrar sessões anteriores do mesmo operador
      if (data.operatorSessions) {
        data.operatorSessions.forEach((session) => {
          if (session.operatorId === operatorId && !session.endTime) {
            session.endTime = new Date().toISOString();
          }
        });
      }

      const newSession: OperatorSession = {
        id: `session-${Date.now()}`,
        operatorId,
        operatorName,
        machineId,
        machineName:
          (await this.getMachines()).find((m) => m.id === machineId)?.name ||
          "Máquina Desconhecida",
        startTime: new Date().toISOString(),
        status: "active",
      };

      data.operatorSessions = [...(data.operatorSessions || []), newSession];
      this.saveData(data);

      console.log("✅ Sessão iniciada:", newSession);
      return newSession;
    } catch (error) {
      console.error("❌ Erro ao iniciar sessão:", error);
      throw error;
    }
  }

  async endOperatorSession(sessionId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.operatorSessions) return;

      const session = data.operatorSessions.find((s) => s.id === sessionId);
      if (session) {
        session.endTime = new Date().toISOString();
        session.status = "completed";
        this.saveData(data);
        console.log("✅ Sessão encerrada:", sessionId);
      }
    } catch (error) {
      console.error("❌ Erro ao encerrar sessão:", error);
    }
  }

  async getOperatorSessions(activeOnly = false): Promise<OperatorSession[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      let sessions = data?.operatorSessions || [];

      if (activeOnly) {
        sessions = sessions.filter((s) => s.status === "active" && !s.endTime);
      }

      return sessions.sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    } catch (error) {
      console.error("❌ Erro ao buscar sessões:", error);
      return [];
    }
  }

  // Método para marcar linha como enviada
  async markOrderLineAsShipped(orderId: string, lineId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) return;

      const order = data.productionOrders.find((o) => o.id === orderId);
      if (!order) return;

      const line = order.lines?.find((l) => l.id === lineId);
      if (!line) return;

      line.status = "shipped";
      line.shippedAt = new Date().toISOString();

      // Verificar se toda a ordem foi enviada
      const allShipped =
        order.lines?.every((l) => l.status === "shipped") || false;
      if (allShipped) {
        order.status = "shipped";
        order.shippedAt = new Date().toISOString();
      }

      order.updatedAt = new Date().toISOString();
      this.saveData(data);

      console.log(
        "✅ Linha marcada como enviada:",
        lineId,
        "Status da linha:",
        line.status,
      );
      if (allShipped) {
        console.log(
          "✅ Toda a ordem foi enviada:",
          orderId,
          "Status da ordem:",
          order.status,
        );
      }
    } catch (error) {
      console.error("❌ Erro ao marcar como enviada:", error);
    }
  }

  // Métodos de limpeza e inicialização
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      this.initialized = false;
      console.log("🧹 Todos os dados limpos");
    } catch (error) {
      console.error("❌ Erro ao limpar dados:", error);
    }
  }

  async initializeCleanSystem(): Promise<void> {
    try {
      const cleanData = {
        productionOrders: [],
        foamTypes: this.mockFoamTypes,
        machines: this.mockMachines,
        operatorSessions: [],
        chatMessages: [],
        productSheets: [],
        version: "4.0-consolidated",
        lastUpdated: new Date().toISOString(),
      };

      this.saveData(cleanData);
      this.initialized = true;
      console.log("✅ Sistema inicializado com dados limpos");
    } catch (error) {
      console.error("❌ Erro ao inicializar sistema:", error);
    }
  }

  // Método de teste para validação rápida
  async testCompleteWorkItem(
    workItemId: string,
    quantity: number,
  ): Promise<void> {
    try {
      console.log("🧪 Testando completeWorkItem:", workItemId, quantity);
      await this.completeWorkItem(workItemId, quantity, "Teste automatizado");
      console.log("✅ Teste bem-sucedido");
    } catch (error) {
      console.error("�� Teste falhou:", error);
    }
  }

  // Método para testar todos os métodos principais
  testAllMethods(): void {
    const methods = [
      "getProductionOrders",
      "createProductionOrder",
      "updateProductionOrder",
      "deleteProductionOrder",
      "getMachines",
      "getFoamTypes",
      "getOperatorWorkItems",
      "completeWorkItem",
      "getChatMessages",
      "sendChatMessage",
      "markMessageAsRead",
      "startOperatorSession",
      "endOperatorSession",
      "getOperatorSessions",
      "markOrderLineAsShipped",
      "clearAllData",
      "initializeCleanSystem",
    ];

    console.log("🧪 Testando existência de m��todos:");
    methods.forEach((method) => {
      const exists = typeof this[method] === "function";
      console.log(
        `${exists ? "✅" : "❌"} ${method}: ${exists ? "OK" : "MISSING"}`,
      );
    });
  }
}

// Criar instância única
const productionService = new ProductionService();

// Expor para debug (apenas em desenvolvimento)
if (typeof window !== "undefined") {
  (window as any).productionService = productionService;
  (window as any).clearProductionData = () => productionService.clearAllData();
  (window as any).initializeCleanSystem = () =>
    productionService.initializeCleanSystem();
}

// Runtime safety: ensure methods exist even if older bundles import a different instance shape
// This protects against "getFoamBlocks is not a function" during HMR or mixed bundles.
if (typeof (productionService as any).getFoamBlocks !== "function") {
  (productionService as any).getFoamBlocks = async (filters?: StockFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.warehouse) params.set("warehouse", filters.warehouse);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.qualityStatus)
        params.set("qualityStatus", filters.qualityStatus);
      if (filters?.foamType) params.set("foamType", filters.foamType);
      if (filters?.productionNumber)
        params.set("productionNumber", filters.productionNumber);
      if (filters?.blockNumber) params.set("blockNumber", filters.blockNumber);
      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        params.set("startDate", filters.dateRange.start);
        params.set("endDate", filters.dateRange.end);
      }
      const r = await fetch(
        `/api/foam-blocks${params.toString() ? `?${params.toString()}` : ""}`,
      );
      if (!r.ok) throw new Error("API foam-blocks falhou");
      return r.json();
    } catch (error) {
      try {
        const dataRaw = localStorage.getItem("factoryControl_production");
        const store = dataRaw ? JSON.parse(dataRaw) : {};
        const blocks: any[] = store.foamBlocks || [];
        const foams: FoamType[] = store.foamTypes || [];
        let list = blocks.map((b: any) => ({
          id: b.id,
          productionNumber: b.productionNumber,
          foamType:
            foams.find((f: FoamType) => f.id === b.foamTypeId) || foams[0],
          dimensions: b.dimensions,
          volume: b.volume,
          weight: b.weight,
          productionDate: b.productionDate,
          blockNumber: b.blockNumber,
          warehouse: b.warehouse,
          status: b.status,
          qualityStatus: b.qualityStatus,
          nonConformities: b.nonConformities || [],
          comments: b.comments || "",
          receivedDate: b.receivedDate,
          receivedBy: b.receivedBy,
          reservedFor: b.reservedFor,
          consumedDate: b.consumedDate,
          consumedBy: b.consumedBy,
          photos: b.photos || [],
        }));
        if (filters?.warehouse && filters.warehouse !== "all")
          list = list.filter((x: any) => x.warehouse === filters.warehouse);
        if (filters?.status)
          list = list.filter((x: any) => x.status === filters.status);
        if (filters?.qualityStatus)
          list = list.filter(
            (x: any) => x.qualityStatus === filters.qualityStatus,
          );
        if (filters?.foamType)
          list = list.filter((x: any) =>
            x.foamType?.name
              ?.toLowerCase()
              .includes(filters.foamType!.toLowerCase()),
          );
        if (filters?.productionNumber)
          list = list.filter((x: any) =>
            x.productionNumber
              ?.toLowerCase()
              .includes(filters.productionNumber!.toLowerCase()),
          );
        if (filters?.blockNumber)
          list = list.filter((x: any) =>
            x.blockNumber
              ?.toLowerCase()
              .includes(filters.blockNumber!.toLowerCase()),
          );
        return list;
      } catch {
        return [];
      }
    }
  };
}

if (typeof (productionService as any).getStockSummary !== "function") {
  (productionService as any).getStockSummary = async () => {
    try {
      const r = await fetch("/api/stock/summary");
      if (!r.ok) throw new Error("API stock/summary falhou");
      return r.json();
    } catch (error) {
      const blocks = (await (productionService as any).getFoamBlocks?.()) || [];
      const totalBlocks = blocks.length;
      const totalVolume = blocks.reduce(
        (s: number, b: any) => s + (b.volume || 0),
        0,
      );
      const byWarehouseMap: Record<
        string,
        { warehouse: string; blocks: number; volume: number }
      > = {};
      blocks.forEach((b: any) => {
        const k = b.warehouse;
        byWarehouseMap[k] = byWarehouseMap[k] || {
          warehouse: k,
          blocks: 0,
          volume: 0,
        };
        byWarehouseMap[k].blocks++;
        byWarehouseMap[k].volume += b.volume || 0;
      });
      const byWarehouse = Object.values(byWarehouseMap);
      const byStatusMap: Record<string, { status: string; blocks: number }> =
        {};
      blocks.forEach((b: any) => {
        const k = b.status;
        byStatusMap[k] = byStatusMap[k] || { status: k, blocks: 0 };
        byStatusMap[k].blocks++;
      });
      const byStatus = Object.values(byStatusMap);
      return { totalBlocks, totalVolume, byWarehouse, byStatus };
    }
  };
}

export { productionService };
