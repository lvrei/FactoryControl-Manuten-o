import {
  ShippableItem,
  ShipmentLoad,
  ShippedItem,
  BarcodeScanner,
  ShippingFilters,
} from "@/types/production";
import { productionService } from "./productionService";
import { labelService } from "./labelService";

class ShippingService {
  private storageKey = "factorycontrol_shipping";
  private loadStorageKey = "factorycontrol_loads";
  private scannerState: BarcodeScanner = {
    isScanning: false,
  };

  private getStoredData(): {
    shippableItems: ShippableItem[];
    loads: ShipmentLoad[];
  } {
    const shippingData = localStorage.getItem(this.storageKey);
    const loadData = localStorage.getItem(this.loadStorageKey);

    return {
      shippableItems: shippingData ? JSON.parse(shippingData) : [],
      loads: loadData ? JSON.parse(loadData) : [],
    };
  }

  private saveShippableItems(items: ShippableItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private saveLoads(loads: ShipmentLoad[]): void {
    localStorage.setItem(this.loadStorageKey, JSON.stringify(loads));
  }

  // Generate available items for shipping based on completed production (always fresh data)
  async generateShippableItems(): Promise<ShippableItem[]> {
    try {
      console.log(
        "🔍 [generateShippableItems] Gerando lista de itens disponíveis...",
      );

      // Always get fresh data from production service
      const [orders, labels, machines] = await Promise.all([
        productionService.getProductionOrders(),
        labelService.getLabels(),
        productionService.getMachines(),
      ]);

      console.log(
        `📊 [generateShippableItems] Total de ordens: ${orders.length}`,
      );

      const machineById = new Map(machines.map((m) => [m.id, m]));
      const shippableItems: ShippableItem[] = [];

      // Define a simple process priority: BZM (0) -> PRE_CNC/CAROUSEL (1) -> CNC (2)
      const typePriority: Record<string, number> = {
        BZM: 0,
        PRE_CNC: 1,
        CAROUSEL: 1,
        CNC: 2,
      };

      for (const order of orders) {
        for (const line of order.lines) {
          // IMPORTANTE: Filtrar linhas que já foram shipped
          if (line.status === "shipped") {
            console.log(
              `⏭️  [generateShippableItems] Linha ${line.id} já enviada, ignorando`,
            );
            continue;
          }
          const ops = Array.isArray(line.cuttingOperations)
            ? line.cuttingOperations
            : [];
          if (ops.length === 0) continue;

          // Classify operations by machine type
          const opsWithType = ops.map((op) => {
            const machine = machineById.get(op.machineId);
            const type = machine?.type || "UNKNOWN";
            return { op, type, priority: typePriority[type] ?? -1 };
          });

          const hasNonBZM = opsWithType.some((o) => o.type !== "BZM");
          const bzmOp = opsWithType.find((o) => o.type === "BZM")?.op;

          // Determine terminal operation (highest priority)
          const terminal = opsWithType
            .filter((o) => o.priority >= 0)
            .sort((a, b) => b.priority - a.priority)[0];

          // Decide shipping readiness and quantities
          if (!hasNonBZM) {
            // Only BZM in the line: ship blocks after BZM completes
            if (
              bzmOp &&
              bzmOp.status === "completed" &&
              (bzmOp.completedQuantity || 0) > 0 &&
              line.status !== "shipped"
            ) {
              const matchingLabel = labels.find(
                (label) =>
                  label.orderId === order.id && label.lineId === line.id,
              );
              const qty = bzmOp.completedQuantity || 0;
              const dims = bzmOp.outputDimensions || line.finalDimensions;
              const volume =
                (dims.length * dims.width * dims.height * qty) / 1000000000;

              shippableItems.push({
                id: `${order.id}-${line.id}`,
                orderId: order.id,
                orderNumber: order.orderNumber,
                lineId: line.id,
                operationId: bzmOp.id,
                barcodeId: matchingLabel?.barcodeId,
                customerName: order.customer.name,
                foamType: line.foamType.name,
                quantity: qty,
                dimensions: dims,
                completedAt: bzmOp.completedAt || new Date().toISOString(),
                readyForShipping: true,
                volume,
                weight: volume * (line.foamType.density || 25),
              });
            }
          } else if (
            terminal &&
            terminal.op.status === "completed" &&
            (terminal.op.completedQuantity || 0) > 0 &&
            line.status !== "shipped"
          ) {
            // There are downstream operations: ship based on terminal operation outputs
            const matchingLabel = labels.find(
              (label) => label.orderId === order.id && label.lineId === line.id,
            );
            const qty = terminal.op.completedQuantity || 0;
            const dims = terminal.op.outputDimensions || line.finalDimensions;
            const volume =
              (dims.length * dims.width * dims.height * qty) / 1000000000;

            shippableItems.push({
              id: `${order.id}-${line.id}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              lineId: line.id,
              operationId: terminal.op.id,
              barcodeId: matchingLabel?.barcodeId,
              customerName: order.customer.name,
              foamType: line.foamType.name,
              quantity: qty,
              dimensions: dims,
              completedAt: terminal.op.completedAt || new Date().toISOString(),
              readyForShipping: true,
              volume,
              weight: volume * (line.foamType.density || 25),
            });
          }
        }
      }

      // Update stored shippable items
      this.saveShippableItems(shippableItems);
      return shippableItems;
    } catch (error) {
      console.error("Error generating shippable items:", error);
      return [];
    }
  }

  async getShippableItems(filters?: ShippingFilters): Promise<ShippableItem[]> {
    const { shippableItems } = this.getStoredData();
    let items = shippableItems;

    if (filters) {
      items = items.filter((item) => {
        if (
          filters.customer &&
          !item.customerName
            .toLowerCase()
            .includes(filters.customer.toLowerCase())
        ) {
          return false;
        }
        if (
          filters.orderNumber &&
          !item.orderNumber
            .toLowerCase()
            .includes(filters.orderNumber.toLowerCase())
        ) {
          return false;
        }
        if (
          filters.foamType &&
          !item.foamType.toLowerCase().includes(filters.foamType.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
    }

    return items;
  }

  // Create new load for operator
  async createNewLoad(
    operatorId: string,
    operatorName: string,
  ): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();

    const newLoad: ShipmentLoad = {
      id: Date.now().toString(),
      loadNumber: `CARGA-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${String(loads.length + 1).padStart(3, "0")}`,
      operatorId,
      operatorName,
      startTime: new Date().toISOString(),
      status: "loading",
      items: [],
      totalItems: 0,
      totalVolume: 0,
      totalWeight: 0,
    };

    loads.push(newLoad);
    this.saveLoads(loads);

    return newLoad;
  }

  // Get current load for operator
  async getCurrentLoad(operatorId: string): Promise<ShipmentLoad | null> {
    const { loads } = this.getStoredData();
    return (
      loads.find(
        (load) => load.operatorId === operatorId && load.status === "loading",
      ) || null
    );
  }

  // Get loads (with optional limit)
  async getLoads(limit?: number): Promise<ShipmentLoad[]> {
    const { loads } = this.getStoredData();
    const sortedLoads = loads.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
    return limit ? sortedLoads.slice(0, limit) : sortedLoads;
  }

  // Add item to load
  async addItemToLoad(
    loadId: string,
    item: ShippableItem,
    operatorNotes?: string,
    scannedAt?: string,
  ): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const load = loads.find((l) => l.id === loadId);

    if (!load) {
      throw new Error("Load not found");
    }

    // Check if item is already in load
    const existingItem = load.items.find((i) => i.id === item.id);
    if (existingItem) {
      throw new Error("Item already in load");
    }

    const shippedItem: ShippedItem = {
      ...item,
      addedToLoadAt: new Date().toISOString(),
      scannedAt: scannedAt,
      operatorNotes: operatorNotes,
    };

    load.items.push(shippedItem);
    load.totalItems = load.items.length;
    load.totalVolume = load.items.reduce((sum, i) => sum + i.volume, 0);
    load.totalWeight = load.items.reduce((sum, i) => sum + (i.weight || 0), 0);

    this.saveLoads(loads);
    return load;
  }

  // Remove item from load
  async removeItemFromLoad(
    loadId: string,
    shippedItemId: string,
  ): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const load = loads.find((l) => l.id === loadId);

    if (!load) {
      throw new Error("Load not found");
    }

    load.items = load.items.filter((item) => item.id !== shippedItemId);
    load.totalItems = load.items.length;
    load.totalVolume = load.items.reduce((sum, i) => sum + i.volume, 0);
    load.totalWeight = load.items.reduce((sum, i) => sum + (i.weight || 0), 0);

    this.saveLoads(loads);
    return load;
  }

  // Complete load
  async completeLoad(
    loadId: string,
    truckPlate?: string,
    driverName?: string,
    notes?: string,
  ): Promise<void> {
    const { loads } = this.getStoredData();
    const load = loads.find((l) => l.id === loadId);

    if (!load) {
      throw new Error("Load not found");
    }

    console.log(
      `🚚 [completeLoad] Concluindo carga ${load.loadNumber} com ${load.items.length} itens`,
    );

    load.status = "completed";
    load.endTime = new Date().toISOString();
    load.truckPlate = truckPlate;
    load.driverName = driverName;
    load.notes = notes;

    this.saveLoads(loads);

    // Mark items as shipped in production orders
    console.log(
      `📦 [completeLoad] Marcando ${load.items.length} itens como enviados...`,
    );
    for (const item of load.items) {
      try {
        console.log(
          `  ✅ Marcando ${item.orderNumber} - linha ${item.lineId} como shipped`,
        );
        await productionService.markOrderLineAsShipped(
          item.orderId,
          item.lineId,
        );
      } catch (error) {
        console.error("❌ Error marking item as shipped:", error);
      }
    }

    // Remove shipped items from shippable items list (localStorage apenas)
    const { shippableItems } = this.getStoredData();
    const shippedItemIds = load.items.map((item) => item.id);
    const remainingItems = shippableItems.filter(
      (item) => !shippedItemIds.includes(item.id),
    );
    console.log(
      `🗑️  [completeLoad] Removendo ${load.items.length} itens da lista local (${shippableItems.length} -> ${remainingItems.length})`,
    );
    this.saveShippableItems(remainingItems);

    console.log(`✅ [completeLoad] Carga concluída com sucesso`);
  }

  // Barcode scanning methods
  startBarcodeScanning(): BarcodeScanner {
    this.scannerState.isScanning = true;
    return { ...this.scannerState };
  }

  stopBarcodeScanning(): BarcodeScanner {
    this.scannerState.isScanning = false;
    return { ...this.scannerState };
  }

  async processBarcodeScanned(
    barcodeId: string,
  ): Promise<{ item: ShippableItem | null; error?: string }> {
    try {
      const items = await this.getShippableItems();
      const matchingItem = items.find((item) => item.barcodeId === barcodeId);

      if (!matchingItem) {
        return {
          item: null,
          error: `Material não encontrado para o código: ${barcodeId}`,
        };
      }

      return { item: matchingItem };
    } catch (error) {
      return {
        item: null,
        error: "Erro ao processar código de barras",
      };
    }
  }

  // SIMPLIFIED Export functionality with single organized table
  exportLoadToCSV(load: ShipmentLoad): void {
    const dateString = new Date().toLocaleDateString("pt-BR");
    const timeString = new Date().toLocaleTimeString("pt-BR");

    // INFORMAÇÕES DA CARGA (cada item numa célula separada)
    const headerInfo = [
      ["RELATÓRIO DE EXPEDIÇÃO - CARGA DE MATERIAL"],
      [""],
      ["Carga Nº", load.loadNumber],
      ["Operador", load.operatorName],
      ["Matrícula Camião", load.truckPlate || "N/A"],
      ["Motorista", load.driverName || "N/A"],
      ["Início", new Date(load.startTime).toLocaleString("pt-BR")],
      [
        "Conclusão",
        load.endTime
          ? new Date(load.endTime).toLocaleString("pt-BR")
          : "Em andamento",
      ],
      [
        "Estado",
        load.status === "completed"
          ? "Completa"
          : load.status === "loading"
            ? "A carregar"
            : "Cancelada",
      ],
      ["Total de Itens", load.totalItems.toString()],
      ["Volume Total (m³)", load.totalVolume.toFixed(3)],
      ["Peso Total (kg)", load.totalWeight.toFixed(2)],
      ["Observações", load.notes || "Nenhuma"],
      [""],
      ["IDENTIFICAÇÃO E DETALHES DO MATERIAL"],
      [""],
    ];

    // TABELA PRINCIPAL - cada cabeçalho numa célula individual
    const materialTable = [
      // Linha de cabeçalho - cada item numa célula separada
      [
        "nº",
        "Cliente",
        "OP",
        "Tipo",
        "Qtd",
        "Comp",
        "Larg",
        "Alt",
        "Vol",
        "Peso",
        "Código",
        "Data",
        "Obs",
      ],

      // Dados do material - cada campo numa célula separada
      ...load.items.map((item, index) => [
        (index + 1).toString(),
        item.customerName,
        item.orderNumber,
        item.foamType,
        item.quantity.toString(),
        item.dimensions.length.toString(),
        item.dimensions.width.toString(),
        item.dimensions.height.toString(),
        item.volume.toFixed(2),
        (item.weight || 0).toFixed(1),
        item.barcodeId || "",
        new Date(item.addedToLoadAt).toLocaleDateString("pt-BR"),
        item.operatorNotes || "",
      ]),
    ];

    // RODAPÉ (cada item numa célula separada)
    const footerInfo = [
      [""],
      ["Data de Exportação", `${dateString} às ${timeString}`],
      ["Sistema", "FactoryControl - Gestão de Produção"],
      ["Relatório gerado por", load.operatorName],
    ];

    // COMBINAR TODAS AS SECÇÕES
    const allData = [...headerInfo, ...materialTable, ...footerInfo];

    const csvContent = allData
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // Add BOM for proper encoding
    const csvContentWithBOM = "\uFEFF" + csvContent;

    const blob = new Blob([csvContentWithBOM], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Carga_${load.loadNumber}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }

  exportShippableItemsToCSV(items: ShippableItem[]): void {
    const dateString = new Date().toLocaleDateString("pt-BR");
    const timeString = new Date().toLocaleTimeString("pt-BR");

    // CABEÇALHO PRINCIPAL (cada item numa célula separada)
    const headerInfo = [
      ["RELATÓRIO DE MATERIAL DISPONÍVEL PARA EXPEDIÇÃO"],
      [""],
      ["Data de Exportação", `${dateString} às ${timeString}`],
      ["Total de Linhas de Produção", items.length.toString()],
      [
        "Quantidade Total de Peças",
        items.reduce((sum, item) => sum + item.quantity, 0).toString(),
      ],
      [
        "Volume Total (m³)",
        items.reduce((sum, item) => sum + item.volume, 0).toFixed(3),
      ],
      [
        "Peso Total (kg)",
        items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2),
      ],
      [""],
      ["IDENTIFICAÇÃO E DETALHES DO MATERIAL"],
      [""],
    ];

    // TABELA PRINCIPAL - cada cabeçalho numa célula individual
    const materialTable = [
      // Linha de cabeçalho - cada item numa célula separada
      [
        "nº",
        "Cliente",
        "OP",
        "Tipo",
        "Qtd",
        "Comp",
        "Larg",
        "Alt",
        "Vol",
        "Peso",
        "Código",
        "Conclusão",
        "Estado",
      ],

      // Dados do material - cada campo numa célula separada
      ...items.map((item, index) => [
        (index + 1).toString(),
        item.customerName,
        item.orderNumber,
        item.foamType,
        item.quantity.toString(),
        item.dimensions.length.toString(),
        item.dimensions.width.toString(),
        item.dimensions.height.toString(),
        item.volume.toFixed(2),
        (item.weight || 0).toFixed(1),
        item.barcodeId || "",
        new Date(item.completedAt).toLocaleDateString("pt-BR"),
        item.readyForShipping ? "Pronto" : "Não disp",
      ]),
    ];

    // RODAPÉ (cada item numa célula separada)
    const footerInfo = [
      [""],
      ["Sistema", "FactoryControl - Gestão de Produção"],
      ["Formato", "CSV - Lista de Material Disponível"],
    ];

    // COMBINAR TODAS AS SECÇÕES
    const allData = [...headerInfo, ...materialTable, ...footerInfo];

    const csvContent = allData
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // Add BOM for proper encoding
    const csvContentWithBOM = "\uFEFF" + csvContent;

    const blob = new Blob([csvContentWithBOM], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Material_Disponivel_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  }
}

// Create and export singleton instance
const shippingService = new ShippingService();
export { shippingService };
