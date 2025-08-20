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
  private initialized = false;

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

  // Garantir inicialização única
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeSystem();
      this.initialized = true;
    }
  }

  private getStoredData(): any {
    this.ensureInitialized();
    
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
    try {
      // Validate data before saving
      if (!data || typeof data !== 'object') {
        console.error('❌ Invalid data structure, cannot save');
        return;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error saving data to localStorage:', error);
    }
  }

  // Initialize system on first load
  private initializeSystem(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      let data;
      
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (error) {
          console.warn('⚠️ Corrupt data found, initializing clean system');
          data = null;
        }
      }
      
      if (!data) {
        data = {
          productionOrders: [],
          productSheets: [],
          chatMessages: [],
          operatorSessions: [],
          foamBlocks: [],
          stockMovements: []
        };
      }
      
      // Ensure all required arrays exist
      if (!data.productionOrders) data.productionOrders = [];
      if (!data.productSheets) data.productSheets = [];
      if (!data.chatMessages) data.chatMessages = [];
      if (!data.operatorSessions) data.operatorSessions = [];
      if (!data.foamBlocks) data.foamBlocks = [];
      if (!data.stockMovements) data.stockMovements = [];
      
      this.saveData(data);
      console.log('✅ Production system initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing production system:', error);
    }
  }

  // ORDENS DE PRODUÇÃO
  async getProductionOrders(filters?: ProductionFilters): Promise<ProductionOrder[]> {
    try {
      const data = this.getStoredData();
      let orders = data.productionOrders || [];

      console.log(`📋 Loading production orders from storage: ${orders.length} orders found`);

      if (filters) {
        if (filters.status?.length) {
          orders = orders.filter((order: ProductionOrder) => filters.status!.includes(order.status));
        }
        if (filters.priority?.length) {
          orders = orders.filter((order: ProductionOrder) => filters.priority!.includes(order.priority));
        }
        if (filters.customer) {
          orders = orders.filter((order: ProductionOrder) => 
            order.customer.name.toLowerCase().includes(filters.customer!.toLowerCase())
          );
        }
      }

      return orders.sort((a: ProductionOrder, b: ProductionOrder) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('❌ Error loading production orders:', error);
      return [];
    }
  }

  async createProductionOrder(order: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    try {
      const data = this.getStoredData();
      const newOrder: ProductionOrder = {
        ...order,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      data.productionOrders = [...(data.productionOrders || []), newOrder];
      this.saveData(data);
      console.log(`✅ Production order created: ${newOrder.orderNumber}`);
      return newOrder;
    } catch (error) {
      console.error('❌ Error creating production order:', error);
      throw error;
    }
  }

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
    try {
      const data = this.getStoredData();
      const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === id);
      
      if (orderIndex === -1) {
        throw new Error('Ordem de produção não encontrada');
      }

      data.productionOrders[orderIndex] = {
        ...data.productionOrders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.saveData(data);
      return data.productionOrders[orderIndex];
    } catch (error) {
      console.error('❌ Error updating production order:', error);
      throw error;
    }
  }

  async deleteProductionOrder(id: string): Promise<void> {
    try {
      const data = this.getStoredData();
      data.productionOrders = data.productionOrders.filter((order: ProductionOrder) => order.id !== id);
      this.saveData(data);
    } catch (error) {
      console.error('❌ Error deleting production order:', error);
      throw error;
    }
  }

  // MÁQUINAS
  async getMachines(): Promise<Machine[]> {
    try {
      const data = this.getStoredData();
      let machines: Machine[];

      if (data.machines && data.machines.length > 0) {
        machines = [...data.machines];
      } else {
        // Se não existir, usar as máquinas padrão e salvar
        machines = [...this.mockMachines];
        data.machines = machines;
        this.saveData(data);
      }

      return machines;
    } catch (error) {
      console.error('❌ Error loading machines:', error);
      return [...this.mockMachines];
    }
  }

  // TIPOS DE ESPUMA
  async getFoamTypes(): Promise<FoamType[]> {
    try {
      const data = this.getStoredData();
      if (data.foamTypes && data.foamTypes.length > 0) {
        return data.foamTypes;
      }

      // Se não existir, usar os tipos padrão e salvar
      data.foamTypes = [...this.mockFoamTypes];
      this.saveData(data);
      return data.foamTypes;
    } catch (error) {
      console.error('❌ Error loading foam types:', error);
      return [...this.mockFoamTypes];
    }
  }

  // WORK ITEMS PARA OPERADORES
  async getOperatorWorkItems(machineId?: string, filters?: ProductionFilters): Promise<OperatorWorkItem[]> {
    try {
      const orders = await this.getProductionOrders();
      const workItems: OperatorWorkItem[] = [];

      console.log(`🔍 Getting work items for machine: ${machineId}, found ${orders.length} orders`);

      if (orders.length === 0) {
        console.log('📋 No orders found - system is clean');
        return [];
      }

      orders.forEach(order => {
        // Validate order structure
        if (!order.id || !order.lines || !Array.isArray(order.lines)) {
          console.warn(`⚠️ Invalid order structure: ${order.orderNumber || 'NO_NUMBER'}`);
          return;
        }

        // Só mostrar OPs que estão em andamento ou programadas
        if (order.status === 'completed') {
          return;
        }

        order.lines.forEach(line => {
          // Validate line structure
          if (!line.id || !line.cuttingOperations || !Array.isArray(line.cuttingOperations)) {
            console.warn(`⚠️ Invalid line structure in order: ${order.orderNumber}`);
            return;
          }

          line.cuttingOperations.forEach(operation => {
            // Validate operation structure
            if (!operation.id || !operation.machineId) {
              return;
            }

            // Skip completed operations
            if (operation.status === 'completed' && operation.completedQuantity >= operation.quantity) {
              return;
            }
            
            // Skip operations for different machines
            if (machineId && operation.machineId !== machineId) {
              return;
            }
            
            // Skip if no remaining quantity
            if (operation.quantity - operation.completedQuantity <= 0) {
              return;
            }

            const machine = this.mockMachines.find(m => m.id === operation.machineId);
            if (!machine) {
              return;
            }

            const workItem = {
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
              remainingQuantity: operation.quantity - operation.completedQuantity,
              machineId: operation.machineId,
              machineName: machine.name,
              machineType: machine.type,
              priority: line.priority,
              expectedDeliveryDate: order.expectedDeliveryDate,
              estimatedTime: operation.estimatedTime,
              observations: operation.observations
            };

            workItems.push(workItem);
          });
        });
      });

      console.log(`📝 Total work items found: ${workItems.length}`);
      return workItems.sort((a, b) => b.priority - a.priority);
      
    } catch (error) {
      console.error('❌ Error getting work items:', error);
      return [];
    }
  }

  // COMPLETAR WORK ITEM (MÉTODO ROBUSTO)
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

  // CHAT E MENSAGENS
  async getChatMessages(machineId?: string, operatorId?: string): Promise<ChatMessage[]> {
    try {
      const data = this.getStoredData();
      let messages = data.chatMessages || [];

      if (machineId) {
        messages = messages.filter((msg: ChatMessage) => msg.machineId === machineId);
      }

      if (operatorId) {
        messages = messages.filter((msg: ChatMessage) => msg.operatorId === operatorId || msg.to === operatorId);
      }

      return messages.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      return [];
    }
  }

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>): Promise<ChatMessage> {
    try {
      const data = this.getStoredData();
      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        isRead: false
      };

      data.chatMessages = [...(data.chatMessages || []), newMessage];
      this.saveData(data);
      return newMessage;
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const data = this.getStoredData();
      if (!data.chatMessages) return;

      const messageIndex = data.chatMessages.findIndex((msg: ChatMessage) => msg.id === messageId);
      if (messageIndex !== -1) {
        data.chatMessages[messageIndex].isRead = true;
        this.saveData(data);
      }
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
    }
  }

  // SESSÕES DE OPERADORES
  async startOperatorSession(operatorId: string, operatorName: string, machineId: string): Promise<OperatorSession> {
    try {
      const data = this.getStoredData();
      const machines = await this.getMachines();
      const machine = machines.find(m => m.id === machineId);
      
      if (!machine) {
        throw new Error('Máquina não encontrada');
      }

      // Encerrar sessão anterior se existir
      data.operatorSessions = (data.operatorSessions || []).map((session: OperatorSession) => {
        if (session.operatorId === operatorId && session.isActive) {
          return { ...session, isActive: false, endTime: new Date().toISOString() };
        }
        return session;
      });

      const newSession: OperatorSession = {
        id: Date.now().toString(),
        operatorId,
        operatorName,
        machineId,
        machineName: machine.name,
        startTime: new Date().toISOString(),
        isActive: true
      };

      data.operatorSessions = [...(data.operatorSessions || []), newSession];
      this.saveData(data);
      
      console.log(`✅ Operator session started: ${operatorName} on ${machine.name}`);
      return newSession;
    } catch (error) {
      console.error('❌ Error starting operator session:', error);
      throw error;
    }
  }

  async endOperatorSession(sessionId: string): Promise<void> {
    try {
      const data = this.getStoredData();
      const sessionIndex = data.operatorSessions.findIndex((session: OperatorSession) => session.id === sessionId);

      if (sessionIndex !== -1) {
        data.operatorSessions[sessionIndex].isActive = false;
        data.operatorSessions[sessionIndex].endTime = new Date().toISOString();
        this.saveData(data);
        console.log(`✅ Operator session ended: ${sessionId}`);
      }
    } catch (error) {
      console.error('❌ Error ending operator session:', error);
      throw error;
    }
  }

  async getOperatorSessions(activeOnly = false): Promise<OperatorSession[]> {
    try {
      const data = this.getStoredData();
      const sessions = data.operatorSessions || [];

      if (activeOnly) {
        return sessions.filter((session: OperatorSession) => session.isActive);
      }

      return sessions.sort((a: OperatorSession, b: OperatorSession) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('❌ Error loading operator sessions:', error);
      return [];
    }
  }

  // FICHAS TÉCNICAS
  async getProductSheets(): Promise<ProductSheet[]> {
    try {
      const data = this.getStoredData();
      return data.productSheets || [];
    } catch (error) {
      console.error('❌ Error loading product sheets:', error);
      return [];
    }
  }

  async createProductSheet(sheet: Omit<ProductSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductSheet> {
    try {
      const data = this.getStoredData();
      const newSheet: ProductSheet = {
        ...sheet,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      data.productSheets = [...(data.productSheets || []), newSheet];
      this.saveData(data);
      return newSheet;
    } catch (error) {
      console.error('❌ Error creating product sheet:', error);
      throw error;
    }
  }

  async updateProductSheet(id: string, updates: Partial<ProductSheet>): Promise<ProductSheet> {
    try {
      const data = this.getStoredData();
      const sheetIndex = data.productSheets.findIndex((sheet: ProductSheet) => sheet.id === id);

      if (sheetIndex === -1) {
        throw new Error('Ficha técnica não encontrada');
      }

      data.productSheets[sheetIndex] = {
        ...data.productSheets[sheetIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.saveData(data);
      return data.productSheets[sheetIndex];
    } catch (error) {
      console.error('❌ Error updating product sheet:', error);
      throw error;
    }
  }

  async deleteProductSheet(id: string): Promise<void> {
    try {
      const data = this.getStoredData();
      data.productSheets = data.productSheets.filter((sheet: ProductSheet) => sheet.id !== id);
      this.saveData(data);
    } catch (error) {
      console.error('❌ Error deleting product sheet:', error);
      throw error;
    }
  }

  // MÉTODOS DE LIMPEZA E INICIALIZAÇÃO
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      this.initialized = false;
      console.log('✅ All production data cleared');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
    }
  }

  async initializeCleanSystem(): Promise<void> {
    try {
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
      this.initialized = true;
      console.log('✅ System initialized completely clean - no test data');
    } catch (error) {
      console.error('❌ Error initializing clean system:', error);
    }
  }
}

export const productionService = new ProductionService();

// Expose for debugging in console
if (typeof window !== 'undefined') {
  (window as any).productionService = productionService;

  // Create simple global functions for common debugging tasks
  (window as any).clearProductionData = async () => {
    await productionService.clearAllData();
    console.log('✅ Production data cleared. Refresh the page.');
  };

  (window as any).initializeCleanSystem = async () => {
    await productionService.initializeCleanSystem();
    console.log('✅ Clean system initialized. Refresh the page.');
  };

  (window as any).testAllMethods = () => {
    const methods = [
      'getProductionOrders',
      'createProductionOrder', 
      'getOperatorWorkItems',
      'startOperatorSession',
      'endOperatorSession',
      'getOperatorSessions',
      'getChatMessages',
      'completeWorkItem'
    ];
    
    console.log('🔍 Testing all methods:');
    methods.forEach(method => {
      const exists = typeof productionService[method] === 'function';
      console.log(`${exists ? '✅' : '❌'} ${method}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
  };

  console.log('🔧 Global functions available:');
  console.log('  - clearProductionData()');
  console.log('  - initializeCleanSystem()');
  console.log('  - testAllMethods() - Test all required methods');
}
