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
  CuttingOperation
} from '@/types/production';

// Simulação de dados - em produção seria conectado a um backend real
class ProductionService {
  private storageKey = 'factoryControl_production';

  // Dados mockados para desenvolvimento
  private mockFoamTypes: FoamType[] = [
    {
      id: '1',
      name: 'Espuma D20',
      density: 20,
      hardness: 'Macia',
      color: 'Branca',
      specifications: 'Espuma de poliuretano flexível D20 - uso geral',
      pricePerM3: 45.00,
      stockColor: '#f8f9fa'
    },
    {
      id: '2',
      name: 'Espuma D28',
      density: 28,
      hardness: 'Média',
      color: 'Amarela',
      specifications: 'Espuma de poliuretano flexível D28 - móveis',
      pricePerM3: 65.00,
      stockColor: '#fff3cd'
    },
    {
      id: '3',
      name: 'Espuma D35',
      density: 35,
      hardness: 'Dura',
      color: 'Azul',
      specifications: 'Espuma de poliuretano flexível D35 - colchões',
      pricePerM3: 85.00,
      stockColor: '#d1ecf1'
    }
  ];

  private mockMachines: Machine[] = [
    {
      id: '1',
      name: 'BZM-01',
      type: 'BZM',
      status: 'available',
      maxDimensions: { length: 4000, width: 2000, height: 2000 },
      cuttingPrecision: 1
    },
    {
      id: '2',
      name: 'Carrossel-01',
      type: 'CAROUSEL',
      status: 'busy',
      currentOperator: 'João Silva',
      maxDimensions: { length: 2000, width: 2000, height: 1000 },
      cuttingPrecision: 2
    },
    {
      id: '3',
      name: 'Pré-CNC-01',
      type: 'PRE_CNC',
      status: 'available',
      maxDimensions: { length: 1500, width: 1500, height: 800 },
      cuttingPrecision: 1
    },
    {
      id: '4',
      name: 'CNC-01',
      type: 'CNC',
      status: 'maintenance',
      maxDimensions: { length: 1200, width: 1200, height: 600 },
      cuttingPrecision: 0.5
    }
  ];

  private getStoredData(): any {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate data structure
        if (parsed && typeof parsed === 'object') {
          return {
            productionOrders: Array.isArray(parsed.productionOrders) ? parsed.productionOrders : [],
            productSheets: Array.isArray(parsed.productSheets) ? parsed.productSheets : [],
            chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
            operatorSessions: Array.isArray(parsed.operatorSessions) ? parsed.operatorSessions : [],
            foamBlocks: Array.isArray(parsed.foamBlocks) ? parsed.foamBlocks : [],
            stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : []
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar dados do localStorage, inicializando estrutura limpa:', error);
      this.clearAllData();
    }

    // Return clean structure
    return {
      productionOrders: [],
      productSheets: [],
      chatMessages: [],
      operatorSessions: [],
      foamBlocks: [],
      stockMovements: []
    };
  }

  private saveData(data: any): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // MÉTODO CORRIGIDO - ROBUSTO PARA COMPLETAR WORK ITEMS
  async completeWorkItem(workItemId: string, completedQuantity: number, operatorNotes?: string): Promise<void> {
    console.log('🎯 Starting robust work item completion:', workItemId);
    
    try {
      // Validate input parameters
      if (!workItemId || typeof workItemId !== 'string') {
        throw new Error('ID do item de trabalho inválido');
      }
      
      if (!completedQuantity || completedQuantity <= 0) {
        throw new Error('Quantidade completada deve ser maior que zero');
      }

      const parts = workItemId.split('-');
      if (parts.length < 3) {
        throw new Error(`Formato de ID inválido: ${workItemId}. Esperado: orderId-lineId-operationId`);
      }

      const [orderId, lineId, operationId] = parts;
      console.log(`📋 Parsed IDs - Order: ${orderId}, Line: ${lineId}, Operation: ${operationId}`);

      // Get and validate data
      const data = this.getStoredData();
      if (!data.productionOrders || !Array.isArray(data.productionOrders)) {
        throw new Error('Estrutura de dados inválida - sem ordens de produção');
      }

      if (data.productionOrders.length === 0) {
        throw new Error('Nenhuma ordem de produção encontrada. O sistema está vazio.');
      }

      console.log(`📊 Searching in ${data.productionOrders.length} orders`);

      // Find order
      const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === orderId);
      if (orderIndex === -1) {
        console.error(`❌ Order not found: ${orderId}`);
        console.log('Available orders:', data.productionOrders.map((o: ProductionOrder) => ({ id: o.id, number: o.orderNumber })));
        throw new Error(`Ordem não encontrada: ${orderId}`);
      }

      const order = data.productionOrders[orderIndex];
      
      // Find line
      const line = order.lines.find((l: ProductionOrderLine) => l.id === lineId);
      if (!line) {
        console.error(`❌ Line not found: ${lineId}`);
        console.log('Available lines:', order.lines.map((l: ProductionOrderLine) => ({ id: l.id, foamType: l.foamType.name })));
        throw new Error(`Linha não encontrada: ${lineId}`);
      }

      // Find operation with type conversion support
      let operation = line.cuttingOperations.find((op: CuttingOperation) => op.id === operationId);
      if (!operation) {
        // Try string conversion
        operation = line.cuttingOperations.find((op: CuttingOperation) => op.id.toString() === operationId.toString());
        
        if (!operation) {
          console.error(`❌ Operation not found: ${operationId}`);
          console.log('Available operations:', line.cuttingOperations.map((op: CuttingOperation) => ({ id: op.id, machineId: op.machineId, status: op.status })));
          throw new Error(`Operação não encontrada: ${operationId}`);
        } else {
          console.log('✅ Found operation after string conversion');
        }
      }

      // Validate operation state
      if (operation.status === 'completed' && operation.completedQuantity >= operation.quantity) {
        throw new Error('Esta operação já foi completada');
      }

      if (operation.completedQuantity + completedQuantity > operation.quantity) {
        throw new Error(`Quantidade excede o total da operação. Máximo disponível: ${operation.quantity - operation.completedQuantity}`);
      }

      console.log(`BEFORE - Operation ${operationId}: completed=${operation.completedQuantity}, quantity=${operation.quantity}, status=${operation.status}`);

      // Update operation
      operation.completedQuantity = Math.min(operation.completedQuantity + completedQuantity, operation.quantity);
      
      if (operatorNotes) {
        operation.operatorNotes = operatorNotes;
      }

      // Update operation status
      if (operation.completedQuantity >= operation.quantity) {
        operation.status = 'completed';
        operation.completedAt = new Date().toISOString();
        console.log(`✅ Operation ${operationId} marked as completed`);
      } else {
        operation.status = 'in_progress';
        console.log(`🔄 Operation ${operationId} marked as in progress`);
      }

      console.log(`AFTER - Operation ${operationId}: completed=${operation.completedQuantity}, quantity=${operation.quantity}, status=${operation.status}`);

      // Update line status
      const allOperationsComplete = line.cuttingOperations.every((op: CuttingOperation) => op.status === 'completed');
      const operationQuantities = line.cuttingOperations.map((op: CuttingOperation) => op.completedQuantity);
      const minCompleted = operationQuantities.length > 0 ? Math.min(...operationQuantities) : 0;

      line.completedQuantity = minCompleted;

      if (allOperationsComplete && minCompleted >= line.quantity) {
        line.status = 'completed';
        line.completedQuantity = line.quantity;
        console.log(`✅ Line ${lineId} marked as completed`);
      } else if (minCompleted > 0) {
        line.status = 'in_progress';
        console.log(`🔄 Line ${lineId} marked as in progress`);
      }

      console.log(`Line ${lineId}: completed=${line.completedQuantity}, quantity=${line.quantity}, status=${line.status}`);

      // Update order status
      const allLinesComplete = order.lines.every((l: ProductionOrderLine) => l.status === 'completed');
      if (allLinesComplete) {
        order.status = 'completed';
        console.log(`✅ Order ${order.orderNumber} marked as completed`);
      } else if (order.lines.some((l: ProductionOrderLine) => l.status === 'in_progress')) {
        order.status = 'in_progress';
        console.log(`🔄 Order ${order.orderNumber} marked as in progress`);
      }

      order.updatedAt = new Date().toISOString();

      // Save with verification
      this.saveData(data);
      
      // Verify data was saved correctly
      const verifyData = this.getStoredData();
      const verifyOrder = verifyData.productionOrders.find((o: ProductionOrder) => o.id === orderId);
      if (!verifyOrder) {
        throw new Error('Falha crítica: dados não foram salvos corretamente');
      }

      console.log(`✅ Work item completed successfully: ${workItemId}`);
      console.log(`📊 Quantity processed: ${completedQuantity} (total: ${operation.completedQuantity}/${operation.quantity})`);
      console.log(`🎯 Final states - Operation: ${operation.status}, Line: ${line.status}, Order: ${order.status}`);

    } catch (error) {
      console.error('❌ Error in completeWorkItem:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Erro desconhecido ao completar operação';
      alert(`Erro ao completar operação:\n\n${errorMessage}\n\nPor favor, atualize a página e tente novamente.`);
      
      // Re-throw for caller handling
      throw error;
    }
  }

  // Continuar com os outros métodos (truncado para este exemplo)
  async getProductionOrders(filters?: ProductionFilters): Promise<ProductionOrder[]> {
    const data = this.getStoredData();
    return data.productionOrders || [];
  }

  async createProductionOrder(order: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    const data = this.getStoredData();
    const newOrder: ProductionOrder = {
      ...order,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.productionOrders = [...(data.productionOrders || []), newOrder];
    this.saveData(data);
    return newOrder;
  }

  async clearAllData(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    console.log('All production data cleared');
  }

  async initializeCleanSystem(): Promise<void> {
    console.log('🧹 Initializing completely clean system...');
    
    // Clear all factory control related data
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('factoryControl_') || 
          key.includes('production') || 
          key.includes('maintenance') || 
          key.includes('operator') ||
          key.includes('machine') ||
          key.includes('shipping')) {
        localStorage.removeItem(key);
      }
    });

    // Initialize with empty data structure
    const cleanData = {
      productionOrders: [],
      productSheets: [],
      chatMessages: [],
      operatorSessions: [],
      foamBlocks: [],
      stockMovements: []
    };

    this.saveData(cleanData);
    console.log('✅ System initialized completely clean - no test data');
  }
}

export const productionService = new ProductionService();

// Função global para usar o método corrigido
if (typeof window !== 'undefined') {
  (window as any).testCompleteWorkItem = async (workItemId: string, quantity: number = 1) => {
    try {
      await productionService.completeWorkItem(workItemId, quantity, 'Teste automático');
      console.log('✅ Teste de completion bem-sucedido');
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };
  
  console.log('🔧 Função de teste disponível: testCompleteWorkItem(workItemId, quantity)');
}
