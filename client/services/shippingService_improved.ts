import { ShippableItem, ShipmentLoad, ShippedItem, BarcodeScanner, ShippingFilters } from '@/types/production';
import { productionService } from './productionService';
import { labelService } from './labelService';

class ShippingService {
  private storageKey = 'factorycontrol_shipping';
  private loadStorageKey = 'factorycontrol_loads';
  private scannerState: BarcodeScanner = {
    isScanning: false
  };

  private getStoredData(): { shippableItems: ShippableItem[], loads: ShipmentLoad[] } {
    const shippingData = localStorage.getItem(this.storageKey);
    const loadData = localStorage.getItem(this.loadStorageKey);
    
    return {
      shippableItems: shippingData ? JSON.parse(shippingData) : [],
      loads: loadData ? JSON.parse(loadData) : []
    };
  }

  private saveShippableItems(items: ShippableItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private saveLoads(loads: ShipmentLoad[]): void {
    localStorage.setItem(this.loadStorageKey, JSON.stringify(loads));
  }

  // Generate available items for shipping based on completed production
  async generateShippableItems(): Promise<ShippableItem[]> {
    try {
      const orders = await productionService.getProductionOrders();
      const labels = await labelService.getLabels();
      const shippableItems: ShippableItem[] = [];

      for (const order of orders) {
        for (const line of order.lines) {
          // Check if all cutting operations for this line are completed
          const allOperationsCompleted = line.cuttingOperations.every(
            op => op.status === 'completed' && op.completedQuantity >= op.quantity
          );

          // Additional checks: line must be completed and have reached full quantity
          const lineFullyCompleted = line.status === 'completed' &&
                                   line.completedQuantity >= line.quantity;

          if (allOperationsCompleted && lineFullyCompleted && line.completedQuantity > 0) {
            // Find matching label for this item
            const matchingLabel = labels.find(label => 
              label.orderId === order.id && label.lineId === line.id
            );

            const volume = (line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.completedQuantity) / 1000000000;

            const shippableItem: ShippableItem = {
              id: `${order.id}-${line.id}`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              lineId: line.id,
              operationId: line.cuttingOperations[line.cuttingOperations.length - 1]?.id || '',
              barcodeId: matchingLabel?.barcodeId,
              customerName: order.customer.name,
              foamType: line.foamType.name,
              quantity: line.completedQuantity,
              dimensions: line.finalDimensions,
              completedAt: line.cuttingOperations[line.cuttingOperations.length - 1]?.completedAt || new Date().toISOString(),
              readyForShipping: true,
              volume: volume,
              weight: volume * (line.foamType.density || 25) // Estimate weight based on density
            };

            shippableItems.push(shippableItem);
          }
        }
      }

      // Update stored shippable items
      this.saveShippableItems(shippableItems);
      return shippableItems;
    } catch (error) {
      console.error('Error generating shippable items:', error);
      return [];
    }
  }

  async getShippableItems(filters?: ShippingFilters): Promise<ShippableItem[]> {
    const { shippableItems } = this.getStoredData();
    let items = shippableItems;

    if (filters) {
      items = items.filter(item => {
        if (filters.customer && !item.customerName.toLowerCase().includes(filters.customer.toLowerCase())) {
          return false;
        }
        if (filters.orderNumber && !item.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())) {
          return false;
        }
        if (filters.foamType && !item.foamType.toLowerCase().includes(filters.foamType.toLowerCase())) {
          return false;
        }
        return true;
      });
    }

    return items;
  }

  // Create new load for operator
  async createNewLoad(operatorId: string, operatorName: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    
    const newLoad: ShipmentLoad = {
      id: Date.now().toString(),
      loadNumber: `CARGA-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(loads.length + 1).padStart(3, '0')}`,
      operatorId,
      operatorName,
      startTime: new Date().toISOString(),
      status: 'loading',
      items: [],
      totalItems: 0,
      totalVolume: 0,
      totalWeight: 0
    };

    loads.push(newLoad);
    this.saveLoads(loads);
    
    return newLoad;
  }

  // Get current load for operator
  async getCurrentLoad(operatorId: string): Promise<ShipmentLoad | null> {
    const { loads } = this.getStoredData();
    return loads.find(load => load.operatorId === operatorId && load.status === 'loading') || null;
  }

  // Get loads (with optional limit)
  async getLoads(limit?: number): Promise<ShipmentLoad[]> {
    const { loads } = this.getStoredData();
    const sortedLoads = loads.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return limit ? sortedLoads.slice(0, limit) : sortedLoads;
  }

  // Add item to load
  async addItemToLoad(loadId: string, item: ShippableItem, operatorNotes?: string, scannedAt?: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const load = loads.find(l => l.id === loadId);
    
    if (!load) {
      throw new Error('Load not found');
    }

    // Check if item is already in load
    const existingItem = load.items.find(i => i.id === item.id);
    if (existingItem) {
      throw new Error('Item already in load');
    }

    const shippedItem: ShippedItem = {
      ...item,
      addedToLoadAt: new Date().toISOString(),
      scannedAt: scannedAt,
      operatorNotes: operatorNotes
    };

    load.items.push(shippedItem);
    load.totalItems = load.items.length;
    load.totalVolume = load.items.reduce((sum, i) => sum + i.volume, 0);
    load.totalWeight = load.items.reduce((sum, i) => sum + (i.weight || 0), 0);

    this.saveLoads(loads);
    return load;
  }

  // Remove item from load
  async removeItemFromLoad(loadId: string, shippedItemId: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const load = loads.find(l => l.id === loadId);
    
    if (!load) {
      throw new Error('Load not found');
    }

    load.items = load.items.filter(item => item.id !== shippedItemId);
    load.totalItems = load.items.length;
    load.totalVolume = load.items.reduce((sum, i) => sum + i.volume, 0);
    load.totalWeight = load.items.reduce((sum, i) => sum + (i.weight || 0), 0);

    this.saveLoads(loads);
    return load;
  }

  // Complete load
  async completeLoad(loadId: string, truckPlate?: string, driverName?: string, notes?: string): Promise<void> {
    const { loads } = this.getStoredData();
    const load = loads.find(l => l.id === loadId);
    
    if (!load) {
      throw new Error('Load not found');
    }

    load.status = 'completed';
    load.endTime = new Date().toISOString();
    load.truckPlate = truckPlate;
    load.driverName = driverName;
    load.notes = notes;

    this.saveLoads(loads);

    // Mark items as shipped in production orders
    for (const item of load.items) {
      try {
        await productionService.markItemAsShipped(item.orderId, item.lineId, item.quantity);
      } catch (error) {
        console.error('Error marking item as shipped:', error);
      }
    }
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

  async processBarcodeScanned(barcodeId: string): Promise<{ item: ShippableItem | null; error?: string }> {
    try {
      const items = await this.getShippableItems();
      const matchingItem = items.find(item => item.barcodeId === barcodeId);
      
      if (!matchingItem) {
        return { 
          item: null, 
          error: `Material não encontrado para o código: ${barcodeId}` 
        };
      }

      return { item: matchingItem };
    } catch (error) {
      return { 
        item: null, 
        error: 'Erro ao processar código de barras' 
      };
    }
  }

  // IMPROVED Export functionality with better organized tables
  exportLoadToCSV(load: ShipmentLoad): void {
    const dateString = new Date().toLocaleDateString('pt-BR');
    const timeString = new Date().toLocaleTimeString('pt-BR');

    // Calcular totais por cliente
    const customerTotals = load.items.reduce((acc, item) => {
      if (!acc[item.customerName]) {
        acc[item.customerName] = { items: 0, volume: 0, weight: 0, quantity: 0 };
      }
      acc[item.customerName].items++;
      acc[item.customerName].volume += item.volume;
      acc[item.customerName].weight += (item.weight || 0);
      acc[item.customerName].quantity += item.quantity;
      return acc;
    }, {} as Record<string, any>);

    // 1. CABEÇALHO PRINCIPAL
    const headerInfo = [
      ['=== RELATÓRIO DE EXPEDIÇÃO - CARGA DE MATERIAL ==='],
      [''],
      ['INFORMAÇÕES DA CARGA'],
      ['──────────────────────'],
      [`Número da Carga: ${load.loadNumber}`],
      [`Operador Responsável: ${load.operatorName}`],
      [`Data/Hora Início: ${new Date(load.startTime).toLocaleString('pt-BR')}`],
      [`Data/Hora Conclusão: ${load.endTime ? new Date(load.endTime).toLocaleString('pt-BR') : 'Em andamento'}`],
      [`Estado da Carga: ${load.status === 'completed' ? 'COMPLETA' : load.status === 'loading' ? 'EM CARREGAMENTO' : 'CANCELADA'}`],
      [''],
      ['INFORMAÇÕES DO TRANSPORTE'],
      ['──────────────────────────'],
      [`Matrícula do Camião: ${load.truckPlate || 'Não informado'}`],
      [`Nome do Motorista: ${load.driverName || 'Não informado'}`],
      [`Observações: ${load.notes || 'Nenhuma observação registada'}`],
      [''],
      ['TOTAIS GERAIS DA CARGA'],
      ['─────────────────────────'],
      [`Total de Linhas: ${load.totalItems} linhas`],
      [`Volume Total: ${load.totalVolume.toFixed(3)} m³`],
      [`Peso Total Estimado: ${load.totalWeight.toFixed(2)} kg`],
      [''],
      ['']
    ];

    // 2. RESUMO POR CLIENTE
    const clientSummary = [
      ['=== RESUMO POR CLIENTE ==='],
      [''],
      ['Cliente', 'Linhas', 'Peças', 'Volume (m³)', 'Peso (kg)'],
      ['═════════════════════════════════════════════════════��══════════'],
      ...Object.entries(customerTotals).map(([customer, stats]: [string, any]) => [
        customer,
        stats.items.toString(),
        stats.quantity.toString(),
        stats.volume.toFixed(3),
        stats.weight.toFixed(2)
      ]),
      ['════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 3. IDENTIFICAÇÃO DO CLIENTE E ORDEM
    const clientOrderInfo = [
      ['=== IDENTIFICAÇÃO DO CLIENTE E ORDENS ==='],
      [''],
      ['Nº', 'Cliente', 'Ordem de Produção', 'Tipo de Espuma', 'Quantidade'],
      ['══════════════════════════════════════════════════════════════════════════'],
      ...load.items.map((item, index) => [
        (index + 1).toString(),
        item.customerName,
        item.orderNumber,
        item.foamType,
        `${item.quantity} unidades`
      ]),
      ['══════════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 4. ESPECIFICAÇÕES TÉCNICAS
    const technicalSpecs = [
      ['=== ESPECIFICAÇÕES TÉCNICAS DO MATERIAL ==='],
      [''],
      ['Nº', 'OP', 'Comprimento (mm)', 'Largura (mm)', 'Altura (mm)', 'Volume (m³)', 'Peso Estimado (kg)'],
      ['════════════════════════════════════════════════════════════════════════════════════════════'],
      ...load.items.map((item, index) => [
        (index + 1).toString(),
        item.orderNumber,
        item.dimensions.length.toString(),
        item.dimensions.width.toString(),
        item.dimensions.height.toString(),
        item.volume.toFixed(3),
        (item.weight || 0).toFixed(2)
      ]),
      ['════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 5. CONTROLO E RASTREABILIDADE
    const trackingInfo = [
      ['=== CONTROLO E RASTREABILIDADE ==='],
      [''],
      ['Nº', 'OP', 'Código de Barras', 'Data Adição à Carga', 'Modo Adição', 'Observações'],
      ['════════════════════════════════════════════════════════════════════════════════════════════════════'],
      ...load.items.map((item, index) => [
        (index + 1).toString(),
        item.orderNumber,
        item.barcodeId || 'N/A',
        new Date(item.addedToLoadAt).toLocaleString('pt-BR'),
        item.scannedAt ? 'Scanner' : 'Manual',
        item.operatorNotes || 'Sem observações'
      ]),
      ['════════════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 6. RODAPÉ
    const footerInfo = [
      ['=== INFORMAÇÕES DO SISTEMA ==='],
      [''],
      [`Data de Exportação: ${dateString} às ${timeString}`],
      [`Sistema: FactoryControl - Gestão de Produção`],
      [`Relatório gerado por: ${load.operatorName}`],
      [`Formato: CSV - Saída de Material`],
      [''],
      ['Este documento serve como comprovativo de expedição do material listado.'],
      ['Guarde este ficheiro para controlo interno e auditoria.']
    ];

    // Combinar todas as secções
    const allData = [...headerInfo, ...clientSummary, ...clientOrderInfo, ...technicalSpecs, ...trackingInfo, ...footerInfo];

    const csvContent = allData.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Add BOM for proper encoding
    const csvContentWithBOM = '\uFEFF' + csvContent;

    const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Carga_${load.loadNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportShippableItemsToCSV(items: ShippableItem[]): void {
    const dateString = new Date().toLocaleDateString('pt-BR');
    const timeString = new Date().toLocaleTimeString('pt-BR');

    // Calcular totais
    const totalItems = items.length;
    const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // Estatísticas por cliente
    const customerStats = items.reduce((acc, item) => {
      if (!acc[item.customerName]) {
        acc[item.customerName] = { items: 0, volume: 0, weight: 0, quantity: 0 };
      }
      acc[item.customerName].items++;
      acc[item.customerName].volume += item.volume;
      acc[item.customerName].weight += (item.weight || 0);
      acc[item.customerName].quantity += item.quantity;
      return acc;
    }, {} as Record<string, any>);

    // Estatísticas por tipo de espuma
    const foamTypeStats = items.reduce((acc, item) => {
      if (!acc[item.foamType]) {
        acc[item.foamType] = { items: 0, volume: 0, weight: 0, quantity: 0 };
      }
      acc[item.foamType].items++;
      acc[item.foamType].volume += item.volume;
      acc[item.foamType].weight += (item.weight || 0);
      acc[item.foamType].quantity += item.quantity;
      return acc;
    }, {} as Record<string, any>);

    // 1. CABEÇALHO
    const headerInfo = [
      ['=== RELATÓRIO DE MATERIAL DISPONÍVEL PARA EXPEDIÇÃO ==='],
      [''],
      ['INFORMAÇÕES GERAIS'],
      ['───────────────────'],
      [`Data de Exportação: ${dateString} às ${timeString}`],
      [`Total de Linhas de Produção: ${totalItems}`],
      [`Quantidade Total de Peças: ${totalQuantity}`],
      [`Volume Total: ${totalVolume.toFixed(3)} m³`],
      [`Peso Total Estimado: ${totalWeight.toFixed(2)} kg`],
      [''],
      ['']
    ];

    // 2. RESUMO POR CLIENTE
    const customerSummary = [
      ['=== RESUMO POR CLIENTE ==='],
      [''],
      ['Cliente', 'Linhas', 'Peças', 'Volume (m³)', 'Peso (kg)'],
      ['════════════════════════════════════════════════════════════════'],
      ...Object.entries(customerStats).map(([customer, stats]: [string, any]) => [
        customer,
        stats.items.toString(),
        stats.quantity.toString(),
        stats.volume.toFixed(3),
        stats.weight.toFixed(2)
      ]),
      ['════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 3. RESUMO POR TIPO DE ESPUMA
    const foamTypeSummary = [
      ['=== RESUMO POR TIPO DE ESPUMA ==='],
      [''],
      ['Tipo de Espuma', 'Linhas', 'Peças', 'Volume (m³)', 'Peso (kg)'],
      ['══════════════════════════════════════��════════════════════════════════'],
      ...Object.entries(foamTypeStats).map(([foamType, stats]: [string, any]) => [
        foamType,
        stats.items.toString(),
        stats.quantity.toString(),
        stats.volume.toFixed(3),
        stats.weight.toFixed(2)
      ]),
      ['═══════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 4. IDENTIFICAÇÃO DETALHADA DO MATERIAL
    const detailsHeader = [
      ['=== LISTAGEM DETALHADA DO MATERIAL ==='],
      [''],
      ['Nº', 'Cliente', 'Ordem Produção', 'Tipo Espuma', 'Quantidade'],
      ['══════════════════════════════════════════════════════════════════════════'],
      ...items.map((item, index) => [
        (index + 1).toString(),
        item.customerName,
        item.orderNumber,
        item.foamType,
        `${item.quantity} unidades`
      ]),
      ['════════════════════════���═════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 5. ESPECIFICAÇÕES TÉCNICAS
    const technicalDetails = [
      ['=== ESPECIFICAÇÕES TÉCNICAS ==='],
      [''],
      ['Nº', 'OP', 'Comprimento (mm)', 'Largura (mm)', 'Altura (mm)', 'Volume (m³)', 'Peso (kg)'],
      ['════════════════════════════════════════════════════════════════════════════════════════════'],
      ...items.map((item, index) => [
        (index + 1).toString(),
        item.orderNumber,
        item.dimensions.length.toString(),
        item.dimensions.width.toString(),
        item.dimensions.height.toString(),
        item.volume.toFixed(3),
        (item.weight || 0).toFixed(2)
      ]),
      ['════════════════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 6. CONTROLO E RASTREABILIDADE
    const trackingDetails = [
      ['=== CONTROLO E RASTREABILIDADE ==='],
      [''],
      ['Nº', 'OP', 'Código de Barras', 'Data Conclusão', 'Estado Expedição'],
      ['══════════════════════════════════════════════════════════════════════════════════'],
      ...items.map((item, index) => [
        (index + 1).toString(),
        item.orderNumber,
        item.barcodeId || 'N/A',
        new Date(item.completedAt).toLocaleString('pt-BR'),
        item.readyForShipping ? 'Pronto para expedição' : 'Não disponível'
      ]),
      ['══════════════════════════════════════════════════════════════════════════════════'],
      [''],
      ['']
    ];

    // 7. RODAPÉ
    const footerInfo = [
      ['=== INFORMAÇÕES DO SISTEMA ==='],
      [''],
      [`Sistema: FactoryControl - Gestão de Produção`],
      [`Formato: CSV - Lista de Material Disponível`],
      [''],
      ['Este documento contém a listagem completa do material pronto para expedição.'],
      ['Use esta informação para planeamento de cargas e gestão de stock.']
    ];

    // Combinar todas as secções
    const allData = [...headerInfo, ...customerSummary, ...foamTypeSummary, ...detailsHeader, ...technicalDetails, ...trackingDetails, ...footerInfo];

    const csvContent = allData.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Add BOM for proper encoding
    const csvContentWithBOM = '\uFEFF' + csvContent;

    const blob = new Blob([csvContentWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Material_Disponivel_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
}

// Create and export singleton instance
const shippingService = new ShippingService();
export { shippingService };
