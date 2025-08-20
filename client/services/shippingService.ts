import { ShippableItem, ShipmentLoad, ShippedItem, ShippingFilters, BarcodeScanner } from '@/types/production';
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

          if (allOperationsCompleted && line.completedQuantity > 0) {
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
        if (filters.dateRange) {
          const itemDate = new Date(item.completedAt);
          const startDate = new Date(filters.dateRange.start);
          const endDate = new Date(filters.dateRange.end);
          if (itemDate < startDate || itemDate > endDate) {
            return false;
          }
        }
        return true;
      });
    }

    return items;
  }

  async getShippableItemByBarcode(barcodeId: string): Promise<ShippableItem | null> {
    const { shippableItems } = this.getStoredData();
    return shippableItems.find(item => item.barcodeId === barcodeId) || null;
  }

  // Load management
  async createNewLoad(operatorId: string, operatorName: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    
    const loadNumber = this.generateLoadNumber();
    const newLoad: ShipmentLoad = {
      id: Date.now().toString(),
      loadNumber,
      operatorId,
      operatorName,
      startTime: new Date().toISOString(),
      status: 'loading',
      items: [],
      totalWeight: 0,
      totalVolume: 0,
      totalItems: 0
    };

    loads.push(newLoad);
    this.saveLoads(loads);
    
    return newLoad;
  }

  async getCurrentLoad(operatorId: string): Promise<ShipmentLoad | null> {
    const { loads } = this.getStoredData();
    return loads.find(load => 
      load.operatorId === operatorId && load.status === 'loading'
    ) || null;
  }

  async addItemToLoad(loadId: string, shippableItem: ShippableItem, operatorNotes?: string, scannedAt?: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const loadIndex = loads.findIndex(load => load.id === loadId);
    
    if (loadIndex === -1) {
      throw new Error('Load not found');
    }

    const shippedItem: ShippedItem = {
      id: Date.now().toString(),
      shippableItemId: shippableItem.id,
      orderId: shippableItem.orderId,
      orderNumber: shippableItem.orderNumber,
      lineId: shippableItem.lineId,
      operationId: shippableItem.operationId,
      barcodeId: shippableItem.barcodeId,
      customerName: shippableItem.customerName,
      foamType: shippableItem.foamType,
      quantity: shippableItem.quantity,
      dimensions: shippableItem.dimensions,
      weight: shippableItem.weight,
      volume: shippableItem.volume,
      addedToLoadAt: new Date().toISOString(),
      scannedAt,
      operatorNotes
    };

    loads[loadIndex].items.push(shippedItem);
    
    // Update totals
    loads[loadIndex].totalItems = loads[loadIndex].items.length;
    loads[loadIndex].totalWeight = loads[loadIndex].items.reduce((sum, item) => sum + (item.weight || 0), 0);
    loads[loadIndex].totalVolume = loads[loadIndex].items.reduce((sum, item) => sum + item.volume, 0);
    
    this.saveLoads(loads);

    // Remove item from shippable items (it's now shipped)
    await this.markItemAsShipped(shippableItem.id);
    
    return loads[loadIndex];
  }

  async removeItemFromLoad(loadId: string, shippedItemId: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const loadIndex = loads.findIndex(load => load.id === loadId);
    
    if (loadIndex === -1) {
      throw new Error('Load not found');
    }

    const itemIndex = loads[loadIndex].items.findIndex(item => item.id === shippedItemId);
    if (itemIndex === -1) {
      throw new Error('Item not found in load');
    }

    const removedItem = loads[loadIndex].items[itemIndex];
    loads[loadIndex].items.splice(itemIndex, 1);
    
    // Update totals
    loads[loadIndex].totalItems = loads[loadIndex].items.length;
    loads[loadIndex].totalWeight = loads[loadIndex].items.reduce((sum, item) => sum + (item.weight || 0), 0);
    loads[loadIndex].totalVolume = loads[loadIndex].items.reduce((sum, item) => sum + item.volume, 0);
    
    this.saveLoads(loads);

    // Add item back to shippable items
    await this.markItemAsAvailable(removedItem);
    
    return loads[loadIndex];
  }

  async completeLoad(loadId: string, truckPlate?: string, driverName?: string, notes?: string): Promise<ShipmentLoad> {
    const { loads } = this.getStoredData();
    const loadIndex = loads.findIndex(load => load.id === loadId);
    
    if (loadIndex === -1) {
      throw new Error('Load not found');
    }

    loads[loadIndex].status = 'completed';
    loads[loadIndex].endTime = new Date().toISOString();
    loads[loadIndex].truckPlate = truckPlate;
    loads[loadIndex].driverName = driverName;
    loads[loadIndex].notes = notes;
    
    this.saveLoads(loads);

    // Mark all production order lines as completed in production service
    await this.markProductionOrderLinesAsCompleted(loads[loadIndex]);
    
    return loads[loadIndex];
  }

  async getLoads(limit?: number): Promise<ShipmentLoad[]> {
    const { loads } = this.getStoredData();
    const sortedLoads = loads.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    return limit ? sortedLoads.slice(0, limit) : sortedLoads;
  }

  async getLoadById(loadId: string): Promise<ShipmentLoad | null> {
    const { loads } = this.getStoredData();
    return loads.find(load => load.id === loadId) || null;
  }

  // Barcode scanner functionality
  startBarcodeScanning(): BarcodeScanner {
    this.scannerState.isScanning = true;
    this.scannerState.lastScannedCode = undefined;
    this.scannerState.lastScannedAt = undefined;
    return { ...this.scannerState };
  }

  stopBarcodeScanning(): BarcodeScanner {
    this.scannerState.isScanning = false;
    return { ...this.scannerState };
  }

  async processBarcodeScanned(barcodeId: string): Promise<{ item: ShippableItem | null; error?: string }> {
    this.scannerState.lastScannedCode = barcodeId;
    this.scannerState.lastScannedAt = new Date().toISOString();

    try {
      const item = await this.getShippableItemByBarcode(barcodeId);
      
      if (!item) {
        return { 
          item: null, 
          error: `Material com código ${barcodeId} não encontrado ou já expedido` 
        };
      }

      return { item };
    } catch (error) {
      return { 
        item: null, 
        error: error instanceof Error ? error.message : 'Erro ao processar código de barras' 
      };
    }
  }

  getScannerState(): BarcodeScanner {
    return { ...this.scannerState };
  }

  // Export functionality
  exportLoadToCSV(load: ShipmentLoad): void {
    const csvData = [
      ['Carga Nº', 'Cliente', 'OP', 'Tipo Espuma', 'Quantidade', 'Dimensões (L×W×H)', 'Volume (m³)', 'Peso (kg)', 'Código Barras', 'Data Adição', 'Observações'],
      ...load.items.map(item => [
        load.loadNumber,
        item.customerName,
        item.orderNumber,
        item.foamType,
        item.quantity,
        `${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height}mm`,
        item.volume.toFixed(3),
        (item.weight || 0).toFixed(2),
        item.barcodeId || 'N/A',
        new Date(item.addedToLoadAt).toLocaleString('pt-BR'),
        item.operatorNotes || ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `carga_${load.loadNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportShippableItemsToCSV(items: ShippableItem[]): void {
    const csvData = [
      ['Cliente', 'OP', 'Tipo Espuma', 'Quantidade', 'Dimensões (L×W×H)', 'Volume (m³)', 'Peso (kg)', 'Código Barras', 'Data Conclusão'],
      ...items.map(item => [
        item.customerName,
        item.orderNumber,
        item.foamType,
        item.quantity,
        `${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height}mm`,
        item.volume.toFixed(3),
        (item.weight || 0).toFixed(2),
        item.barcodeId || 'N/A',
        new Date(item.completedAt).toLocaleString('pt-BR')
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `material_disponivel_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Private helper methods
  private generateLoadNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CG-${year}${month}${day}-${sequence}`;
  }

  private async markItemAsShipped(shippableItemId: string): Promise<void> {
    const { shippableItems } = this.getStoredData();
    const filteredItems = shippableItems.filter(item => item.id !== shippableItemId);
    this.saveShippableItems(filteredItems);
  }

  private async markItemAsAvailable(shippedItem: ShippedItem): Promise<void> {
    const { shippableItems } = this.getStoredData();
    
    const shippableItem: ShippableItem = {
      id: shippedItem.shippableItemId,
      orderId: shippedItem.orderId,
      orderNumber: shippedItem.orderNumber,
      lineId: shippedItem.lineId,
      operationId: shippedItem.operationId,
      barcodeId: shippedItem.barcodeId,
      customerName: shippedItem.customerName,
      foamType: shippedItem.foamType,
      quantity: shippedItem.quantity,
      dimensions: shippedItem.dimensions,
      completedAt: shippedItem.addedToLoadAt,
      readyForShipping: true,
      volume: shippedItem.volume,
      weight: shippedItem.weight
    };

    shippableItems.push(shippableItem);
    this.saveShippableItems(shippableItems);
  }

  private async markProductionOrderLinesAsCompleted(load: ShipmentLoad): Promise<void> {
    try {
      // For each item in the load, mark the corresponding production order line as shipped
      for (const item of load.items) {
        await productionService.markOrderLineAsShipped(item.orderId, item.lineId);
      }
    } catch (error) {
      console.error('Error marking production order lines as completed:', error);
    }
  }
}

export const shippingService = new ShippingService();
