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
  StockFilters
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
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {
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
    // Buscar máquinas salvas no localStorage se existirem
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

    // Check for maintenance status updates from maintenance service
    const machineStatusKey = 'factoryControl_machineStatus';
    try {
      const statusUpdates = JSON.parse(localStorage.getItem(machineStatusKey) || '{}');

      machines = machines.map(machine => {
        if (statusUpdates[machine.id]) {
          return {
            ...machine,
            status: statusUpdates[machine.id].status
          };
        }
        return machine;
      });
    } catch (error) {
      console.error('Error loading machine status updates:', error);
    }

    return machines;
  }

  async createMachine(machine: Omit<Machine, 'id' | 'currentOperator'>): Promise<Machine> {
    const data = this.getStoredData();
    const newMachine: Machine = {
      ...machine,
      id: Date.now().toString(),
      currentOperator: undefined
    };

    if (!data.machines) {
      data.machines = [...this.mockMachines];
    }

    data.machines.push(newMachine);
    this.saveData(data);
    return newMachine;
  }

  async updateMachine(id: string, updates: Partial<Machine>): Promise<Machine> {
    const data = this.getStoredData();
    if (!data.machines) {
      data.machines = [...this.mockMachines];
    }

    const machineIndex = data.machines.findIndex((machine: Machine) => machine.id === id);
    if (machineIndex === -1) {
      throw new Error('Máquina não encontrada');
    }

    data.machines[machineIndex] = { ...data.machines[machineIndex], ...updates };
    this.saveData(data);
    return data.machines[machineIndex];
  }

  async updateMachineStatus(id: string, status: 'available' | 'busy' | 'maintenance' | 'offline'): Promise<void> {
    const data = this.getStoredData();
    if (!data.machines) {
      data.machines = [...this.mockMachines];
    }

    const machineIndex = data.machines.findIndex((machine: Machine) => machine.id === id);
    if (machineIndex !== -1) {
      data.machines[machineIndex].status = status;
      this.saveData(data);
    }

    // Also update the maintenance service status tracking
    const machineStatusKey = 'factoryControl_machineStatus';
    const statusUpdates = JSON.parse(localStorage.getItem(machineStatusKey) || '{}');
    statusUpdates[id] = {
      status,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(machineStatusKey, JSON.stringify(statusUpdates));
  }

  async deleteMachine(id: string): Promise<void> {
    const data = this.getStoredData();
    if (!data.machines) return;

    data.machines = data.machines.filter((machine: Machine) => machine.id !== id);
    this.saveData(data);
  }

  async updateMachineStatus(machineId: string, status: Machine['status'], operatorId?: string): Promise<Machine> {
    const data = this.getStoredData();
    if (!data.machines) {
      data.machines = [...this.mockMachines];
    }

    const machine = data.machines.find((m: Machine) => m.id === machineId);
    if (!machine) {
      throw new Error('M��quina não encontrada');
    }

    machine.status = status;
    if (operatorId) {
      machine.currentOperator = operatorId;
    } else if (status === 'available') {
      machine.currentOperator = undefined;
    }

    this.saveData(data);

    // Also update the maintenance service status tracking
    const machineStatusKey = 'factoryControl_machineStatus';
    const statusUpdates = JSON.parse(localStorage.getItem(machineStatusKey) || '{}');
    statusUpdates[machineId] = {
      status,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(machineStatusKey, JSON.stringify(statusUpdates));

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
            machineType: machine.type,
            priority: line.priority,
            expectedDeliveryDate: order.expectedDeliveryDate,
            estimatedTime: operation.estimatedTime,
            observations: operation.observations
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

  async markMessageAsRead(messageId: string): Promise<void> {
    const data = this.getStoredData();
    if (!data.chatMessages) return;

    const messageIndex = data.chatMessages.findIndex((msg: ChatMessage) => msg.id === messageId);
    if (messageIndex !== -1) {
      data.chatMessages[messageIndex].isRead = true;
      this.saveData(data);
    }
  }

  async markAllMessagesAsRead(machineId?: string, operatorId?: string): Promise<void> {
    const data = this.getStoredData();
    if (!data.chatMessages) return;

    let updated = false;
    data.chatMessages = data.chatMessages.map((msg: ChatMessage) => {
      const shouldMark = (!machineId || msg.machineId === machineId) &&
                        (!operatorId || msg.operatorId === operatorId) &&
                        !msg.isRead;

      if (shouldMark) {
        updated = true;
        return { ...msg, isRead: true };
      }
      return msg;
    });

    if (updated) {
      this.saveData(data);
    }
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

  // =================== GESTÃO DE STOCK DE BLOCOS ===================

  async getFoamBlocks(filters?: StockFilters): Promise<FoamBlock[]> {
    const data = this.getStoredData();
    let blocks = data.foamBlocks || [];

    if (filters) {
      if (filters.warehouse && filters.warehouse !== 'all') {
        blocks = blocks.filter((block: FoamBlock) => block.warehouse === filters.warehouse);
      }
      if (filters.foamType) {
        blocks = blocks.filter((block: FoamBlock) => block.foamType.id === filters.foamType);
      }
      if (filters.status) {
        blocks = blocks.filter((block: FoamBlock) => block.status === filters.status);
      }
      if (filters.qualityStatus) {
        blocks = blocks.filter((block: FoamBlock) => block.qualityStatus === filters.qualityStatus);
      }
      if (filters.productionNumber) {
        blocks = blocks.filter((block: FoamBlock) =>
          block.productionNumber.toLowerCase().includes(filters.productionNumber!.toLowerCase())
        );
      }
      if (filters.blockNumber) {
        blocks = blocks.filter((block: FoamBlock) =>
          block.blockNumber.toLowerCase().includes(filters.blockNumber!.toLowerCase())
        );
      }
      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        blocks = blocks.filter((block: FoamBlock) => {
          const blockDate = new Date(block.receivedDate);
          return blockDate >= start && blockDate <= end;
        });
      }
    }

    return blocks.sort((a: FoamBlock, b: FoamBlock) =>
      new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
    );
  }

  async createFoamBlock(block: Omit<FoamBlock, 'id' | 'receivedDate' | 'volume'>): Promise<FoamBlock> {
    const data = this.getStoredData();
    const volume = (block.dimensions.length * block.dimensions.width * block.dimensions.height) / 1000000; // convert mm³ to m³

    const newBlock: FoamBlock = {
      ...block,
      id: Date.now().toString(),
      receivedDate: new Date().toISOString(),
      volume: Number(volume.toFixed(3))
    };

    data.foamBlocks = [...(data.foamBlocks || []), newBlock];

    // Create stock movement
    const movement: StockMovement = {
      id: Date.now().toString(),
      blockId: newBlock.id,
      type: 'entry',
      toWarehouse: block.warehouse,
      quantity: 1,
      timestamp: new Date().toISOString(),
      operator: block.receivedBy,
      reason: 'Entrada de novo bloco no stock',
      notes: `Bloco ${block.blockNumber} - ${block.foamType.name}`
    };

    data.stockMovements = [...(data.stockMovements || []), movement];
    this.saveData(data);
    return newBlock;
  }

  async updateFoamBlock(id: string, updates: Partial<FoamBlock>): Promise<FoamBlock> {
    const data = this.getStoredData();
    const blockIndex = data.foamBlocks.findIndex((block: FoamBlock) => block.id === id);

    if (blockIndex === -1) {
      throw new Error('Bloco não encontrado');
    }

    const oldBlock = data.foamBlocks[blockIndex];
    data.foamBlocks[blockIndex] = {
      ...oldBlock,
      ...updates
    };

    // Create movement if warehouse changed
    if (updates.warehouse && updates.warehouse !== oldBlock.warehouse) {
      const movement: StockMovement = {
        id: Date.now().toString(),
        blockId: id,
        type: 'transfer',
        fromWarehouse: oldBlock.warehouse,
        toWarehouse: updates.warehouse,
        quantity: 1,
        timestamp: new Date().toISOString(),
        operator: 'Sistema',
        reason: 'Transferência entre armazéns'
      };

      data.stockMovements = [...(data.stockMovements || []), movement];
    }

    this.saveData(data);
    return data.foamBlocks[blockIndex];
  }

  async deleteFoamBlock(id: string): Promise<void> {
    const data = this.getStoredData();
    const block = data.foamBlocks.find((b: FoamBlock) => b.id === id);

    if (block) {
      // Create exit movement
      const movement: StockMovement = {
        id: Date.now().toString(),
        blockId: id,
        type: 'exit',
        fromWarehouse: block.warehouse,
        quantity: 1,
        timestamp: new Date().toISOString(),
        operator: 'Sistema',
        reason: 'Remoção do bloco do stock'
      };

      data.stockMovements = [...(data.stockMovements || []), movement];
    }

    data.foamBlocks = data.foamBlocks.filter((block: FoamBlock) => block.id !== id);
    this.saveData(data);
  }

  async getStockMovements(blockId?: string): Promise<StockMovement[]> {
    const data = this.getStoredData();
    let movements = data.stockMovements || [];

    if (blockId) {
      movements = movements.filter((movement: StockMovement) => movement.blockId === blockId);
    }

    return movements.sort((a: StockMovement, b: StockMovement) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getStockSummary(): Promise<{
    totalBlocks: number;
    totalVolume: number;
    byWarehouse: { warehouse: string; blocks: number; volume: number }[];
    byFoamType: { foamType: string; blocks: number; volume: number }[];
    byStatus: { status: string; blocks: number }[];
  }> {
    const blocks = await this.getFoamBlocks();

    const summary = {
      totalBlocks: blocks.length,
      totalVolume: blocks.reduce((sum, block) => sum + block.volume, 0),
      byWarehouse: [] as { warehouse: string; blocks: number; volume: number }[],
      byFoamType: [] as { foamType: string; blocks: number; volume: number }[],
      byStatus: [] as { status: string; blocks: number }[]
    };

    // By warehouse
    const warehouseStats = blocks.reduce((acc, block) => {
      if (!acc[block.warehouse]) {
        acc[block.warehouse] = { blocks: 0, volume: 0 };
      }
      acc[block.warehouse].blocks++;
      acc[block.warehouse].volume += block.volume;
      return acc;
    }, {} as Record<string, { blocks: number; volume: number }>);

    summary.byWarehouse = Object.entries(warehouseStats).map(([warehouse, stats]) => ({
      warehouse,
      ...stats
    }));

    // By foam type
    const foamTypeStats = blocks.reduce((acc, block) => {
      const typeName = block.foamType.name;
      if (!acc[typeName]) {
        acc[typeName] = { blocks: 0, volume: 0 };
      }
      acc[typeName].blocks++;
      acc[typeName].volume += block.volume;
      return acc;
    }, {} as Record<string, { blocks: number; volume: number }>);

    summary.byFoamType = Object.entries(foamTypeStats).map(([foamType, stats]) => ({
      foamType,
      ...stats
    }));

    // By status
    const statusStats = blocks.reduce((acc, block) => {
      if (!acc[block.status]) {
        acc[block.status] = 0;
      }
      acc[block.status]++;
      return acc;
    }, {} as Record<string, number>);

    summary.byStatus = Object.entries(statusStats).map(([status, blocks]) => ({
      status,
      blocks
    }));

    return summary;
  }

  async reserveBlock(blockId: string, productionOrderId: string, operator: string): Promise<void> {
    const data = this.getStoredData();
    const blockIndex = data.foamBlocks.findIndex((block: FoamBlock) => block.id === blockId);

    if (blockIndex === -1) {
      throw new Error('Bloco não encontrado');
    }

    if (data.foamBlocks[blockIndex].status !== 'available') {
      throw new Error('Bloco não está disponível para reserva');
    }

    data.foamBlocks[blockIndex].status = 'reserved';
    data.foamBlocks[blockIndex].reservedFor = productionOrderId;

    const movement: StockMovement = {
      id: Date.now().toString(),
      blockId,
      type: 'reservation',
      quantity: 1,
      timestamp: new Date().toISOString(),
      operator,
      reason: 'Reserva para ordem de produção',
      productionOrderId
    };

    data.stockMovements = [...(data.stockMovements || []), movement];
    this.saveData(data);
  }

  async consumeBlock(blockId: string, operator: string, productionOrderId?: string): Promise<void> {
    const data = this.getStoredData();
    const blockIndex = data.foamBlocks.findIndex((block: FoamBlock) => block.id === blockId);

    if (blockIndex === -1) {
      throw new Error('Bloco não encontrado');
    }

    data.foamBlocks[blockIndex].status = 'consumed';
    data.foamBlocks[blockIndex].consumedDate = new Date().toISOString();
    data.foamBlocks[blockIndex].consumedBy = operator;

    const movement: StockMovement = {
      id: Date.now().toString(),
      blockId,
      type: 'consumption',
      fromWarehouse: data.foamBlocks[blockIndex].warehouse,
      quantity: 1,
      timestamp: new Date().toISOString(),
      operator,
      reason: 'Consumo para produção',
      productionOrderId
    };

    data.stockMovements = [...(data.stockMovements || []), movement];
    this.saveData(data);
  }
}

export const productionService = new ProductionService();
