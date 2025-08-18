import { 
  ProductionOrder, 
  ProductionOrderLine, 
  ProductSheet, 
  FoamType, 
  Machine, 
  OperatorWorkItem,
  ChatMessage,
  OperatorSession,
  ProductionFilters 
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
      pricePerM3: 45.00
    },
    {
      id: '2',
      name: 'Espuma D28',
      density: 28,
      hardness: 'Média',
      color: 'Amarela',
      specifications: 'Espuma de poliuretano flexível D28 - móveis',
      pricePerM3: 65.00
    },
    {
      id: '3',
      name: 'Espuma D35',
      density: 35,
      hardness: 'Dura',
      color: 'Azul',
      specifications: 'Espuma de poliuretano flexível D35 - colchões',
      pricePerM3: 85.00
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
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {
      productionOrders: [],
      productSheets: [],
      chatMessages: [],
      operatorSessions: []
    };
  }

  private saveData(data: any): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Ordens de Produção
  async getProductionOrders(filters?: ProductionFilters): Promise<ProductionOrder[]> {
    const data = this.getStoredData();
    let orders = data.productionOrders || [];

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

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
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
  }

  async deleteProductionOrder(id: string): Promise<void> {
    const data = this.getStoredData();
    data.productionOrders = data.productionOrders.filter((order: ProductionOrder) => order.id !== id);
    this.saveData(data);
  }

  // Fichas Técnicas
  async getProductSheets(): Promise<ProductSheet[]> {
    const data = this.getStoredData();
    return data.productSheets || [];
  }

  async createProductSheet(sheet: Omit<ProductSheet, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductSheet> {
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
  }

  async updateProductSheet(id: string, updates: Partial<ProductSheet>): Promise<ProductSheet> {
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
  }

  async deleteProductSheet(id: string): Promise<void> {
    const data = this.getStoredData();
    data.productSheets = data.productSheets.filter((sheet: ProductSheet) => sheet.id !== id);
    this.saveData(data);
  }

  // Tipos de Espuma
  async getFoamTypes(): Promise<FoamType[]> {
    // Buscar tipos salvos no localStorage se existirem
    const data = this.getStoredData();
    if (data.foamTypes && data.foamTypes.length > 0) {
      return data.foamTypes;
    }

    // Se não existir, usar os tipos padrão e salvar
    data.foamTypes = [...this.mockFoamTypes];
    this.saveData(data);
    return data.foamTypes;
  }

  async createFoamType(foamType: Omit<FoamType, 'id'>): Promise<FoamType> {
    const data = this.getStoredData();
    const newFoamType: FoamType = {
      ...foamType,
      id: Date.now().toString()
    };

    if (!data.foamTypes) {
      data.foamTypes = [...this.mockFoamTypes];
    }

    data.foamTypes.push(newFoamType);
    this.saveData(data);
    return newFoamType;
  }

  async updateFoamType(id: string, updates: Partial<FoamType>): Promise<FoamType> {
    const data = this.getStoredData();
    if (!data.foamTypes) {
      data.foamTypes = [...this.mockFoamTypes];
    }

    const foamIndex = data.foamTypes.findIndex((foam: FoamType) => foam.id === id);
    if (foamIndex === -1) {
      throw new Error('Tipo de espuma não encontrado');
    }

    data.foamTypes[foamIndex] = { ...data.foamTypes[foamIndex], ...updates };
    this.saveData(data);
    return data.foamTypes[foamIndex];
  }

  async deleteFoamType(id: string): Promise<void> {
    const data = this.getStoredData();
    if (!data.foamTypes) return;

    data.foamTypes = data.foamTypes.filter((foam: FoamType) => foam.id !== id);
    this.saveData(data);
  }

  // Máquinas
  async getMachines(): Promise<Machine[]> {
    return this.mockMachines;
  }

  async updateMachineStatus(machineId: string, status: Machine['status'], operatorId?: string): Promise<Machine> {
    const machine = this.mockMachines.find(m => m.id === machineId);
    if (!machine) {
      throw new Error('Máquina não encontrada');
    }

    machine.status = status;
    if (operatorId) {
      machine.currentOperator = operatorId;
    } else if (status === 'available') {
      machine.currentOperator = undefined;
    }

    return machine;
  }

  // Lista de trabalho para operadores
  async getOperatorWorkItems(machineId?: string, filters?: ProductionFilters): Promise<OperatorWorkItem[]> {
    const orders = await this.getProductionOrders();
    const workItems: OperatorWorkItem[] = [];

    orders.forEach(order => {
      // Só mostrar OPs que estão em andamento (foram iniciadas)
      if (order.status !== 'in_progress') return;

      order.lines.forEach(line => {
        line.cuttingOperations.forEach(operation => {
          if (operation.status === 'completed') return;
          if (machineId && operation.machineId !== machineId) return;

          const machine = this.mockMachines.find(m => m.id === operation.machineId);
          if (!machine) return;

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
            remainingQuantity: operation.quantity - operation.completedQuantity,
            machineId: operation.machineId,
            machineName: machine.name,
            priority: line.priority,
            expectedDeliveryDate: order.expectedDeliveryDate,
            estimatedTime: operation.estimatedTime
          });
        });
      });
    });

    return workItems.sort((a, b) => b.priority - a.priority);
  }

  async completeWorkItem(workItemId: string, completedQuantity: number, operatorNotes?: string): Promise<void> {
    const [orderId, lineId, operationId] = workItemId.split('-');
    const data = this.getStoredData();
    
    const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === orderId);
    if (orderIndex === -1) return;

    const line = data.productionOrders[orderIndex].lines.find((l: ProductionOrderLine) => l.id === lineId);
    if (!line) return;

    const operation = line.cuttingOperations.find((op: any) => op.id === operationId);
    if (!operation) return;

    operation.completedQuantity = Math.min(operation.completedQuantity + completedQuantity, operation.quantity);
    if (operatorNotes) {
      operation.operatorNotes = operatorNotes;
    }

    if (operation.completedQuantity >= operation.quantity) {
      operation.status = 'completed';
    }

    // Atualizar status da linha se todas as operações estão completas
    const allOperationsComplete = line.cuttingOperations.every((op: any) => op.status === 'completed');
    if (allOperationsComplete) {
      line.status = 'completed';
      line.completedQuantity = line.quantity;
    }

    // Atualizar status da ordem se todas as linhas estão completas
    const allLinesComplete = data.productionOrders[orderIndex].lines.every((l: ProductionOrderLine) => l.status === 'completed');
    if (allLinesComplete) {
      data.productionOrders[orderIndex].status = 'completed';
    }

    data.productionOrders[orderIndex].updatedAt = new Date().toISOString();
    this.saveData(data);
  }

  // Chat
  async getChatMessages(machineId?: string, operatorId?: string): Promise<ChatMessage[]> {
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
  }

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>): Promise<ChatMessage> {
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
  }

  // Sessões de operadores
  async startOperatorSession(operatorId: string, operatorName: string, machineId: string): Promise<OperatorSession> {
    const data = this.getStoredData();
    const machine = this.mockMachines.find(m => m.id === machineId);
    
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

    data.operatorSessions = [...data.operatorSessions, newSession];
    
    // Atualizar status da máquina
    await this.updateMachineStatus(machineId, 'busy', operatorName);
    
    this.saveData(data);
    return newSession;
  }

  async endOperatorSession(sessionId: string): Promise<void> {
    const data = this.getStoredData();
    const sessionIndex = data.operatorSessions.findIndex((session: OperatorSession) => session.id === sessionId);

    if (sessionIndex !== -1) {
      data.operatorSessions[sessionIndex].isActive = false;
      data.operatorSessions[sessionIndex].endTime = new Date().toISOString();

      // Atualizar status da máquina para disponível
      const session = data.operatorSessions[sessionIndex];
      await this.updateMachineStatus(session.machineId, 'available');

      this.saveData(data);
    }
  }

  async getOperatorSessions(activeOnly = false): Promise<OperatorSession[]> {
    const data = this.getStoredData();
    const sessions = data.operatorSessions || [];

    if (activeOnly) {
      return sessions.filter((session: OperatorSession) => session.isActive);
    }

    return sessions.sort((a: OperatorSession, b: OperatorSession) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }
}

export const productionService = new ProductionService();
