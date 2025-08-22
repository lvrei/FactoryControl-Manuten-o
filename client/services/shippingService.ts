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
        await productionService.markOrderLineAsShipped(item.orderId, item.lineId);
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

  // SIMPLIFIED Export functionality with single organized table
  exportLoadToCSV(load: ShipmentLoad): void {
    const dateString = new Date().toLocaleDateString('pt-BR');
    const timeString = new Date().toLocaleTimeString('pt-BR');

    // INFORMAÇÕES DA CARGA (cada item numa célula separada)
    const headerInfo = [
      ['RELATÓRIO DE EXPEDIÇÃO - CARGA DE MATERIAL'],
      [''],
      ['Carga Nº', load.loadNumber],
      ['Operador', load.operatorName],
      ['Matrícula Camião', load.truckPlate || 'N/A'],
      ['Motorista', load.driverName || 'N/A'],
      ['Início', new Date(load.startTime).toLocaleString('pt-BR')],
      ['Conclusão', load.endTime ? new Date(load.endTime).toLocaleString('pt-BR') : 'Em andamento'],
      ['Estado', load.status === 'completed' ? 'Completa' : load.status === 'loading' ? 'A carregar' : 'Cancelada'],
      ['Total de Itens', load.totalItems.toString()],
      ['Volume Total (m³)', load.totalVolume.toFixed(3)],
      ['Peso Total (kg)', load.totalWeight.toFixed(2)],
      ['Observações', load.notes || 'Nenhuma'],
      [''],
      ['IDENTIFICAÇÃO E DETALHES DO MATERIAL'],
      ['']
    ];

    // TABELA PRINCIPAL - cada cabeçalho numa célula individual
    const materialTable = [
      // Linha de cabeçalho - cada item numa célula separada
      [
        'nº',
        'Cliente',
        'OP',
        'Tipo',
        'Qtd',
        'Comp',
        'Larg',
        'Alt',
        'Vol',
        'Peso',
        'Código',
        'Data',
        'Obs'
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
        item.barcodeId || '',
        new Date(item.addedToLoadAt).toLocaleDateString('pt-BR'),
        item.operatorNotes || ''
      ])
    ];

    // RODAPÉ (cada item numa célula separada)
    const footerInfo = [
      [''],
      ['Data de Exportação', `${dateString} às ${timeString}`],
      ['Sistema', 'FactoryControl - Gestão de Produção'],
      ['Relatório gerado por', load.operatorName]
    ];

    // COMBINAR TODAS AS SECÇÕES
    const allData = [...headerInfo, ...materialTable, ...footerInfo];

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

    // CABEÇALHO PRINCIPAL (cada item numa célula separada)
    const headerInfo = [
      ['RELATÓRIO DE MATERIAL DISPONÍVEL PARA EXPEDIÇÃO'],
      [''],
      ['Data de Exportação', `${dateString} às ${timeString}`],
      ['Total de Linhas de Produção', items.length.toString()],
      ['Quantidade Total de Peças', items.reduce((sum, item) => sum + item.quantity, 0).toString()],
      ['Volume Total (m³)', items.reduce((sum, item) => sum + item.volume, 0).toFixed(3)],
      ['Peso Total (kg)', items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)],
      [''],
      ['IDENTIFICAÇÃO E DETALHES DO MATERIAL'],
      ['']
    ];

    // TABELA PRINCIPAL - cada cabeçalho numa célula individual
    const materialTable = [
      // Linha de cabe��alho - cada item numa célula separada
      [
        'nº',
        'Cliente',
        'OP',
        'Tipo',
        'Qtd',
        'Comp',
        'Larg',
        'Alt',
        'Vol',
        'Peso',
        'Código',
        'Conclusão',
        'Estado'
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
        item.barcodeId || '',
        new Date(item.completedAt).toLocaleDateString('pt-BR'),
        item.readyForShipping ? 'Pronto' : 'Não disp'
      ])
    ];

    // RODAPÉ (cada item numa célula separada)
    const footerInfo = [
      [''],
      ['Sistema', 'FactoryControl - Gestão de Produção'],
      ['Formato', 'CSV - Lista de Material Disponível']
    ];

    // COMBINAR TODAS AS SECÇÕES
    const allData = [...headerInfo, ...materialTable, ...footerInfo];

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
