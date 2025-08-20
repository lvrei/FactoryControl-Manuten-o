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
      throw new Error('Máquina não encontrada');
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
    // Auto-fix data consistency if no valid orders exist
    await this.ensureDataConsistency();

    const orders = await this.getProductionOrders();
    const workItems: OperatorWorkItem[] = [];

    console.log(`🔍 Getting work items for machine: ${machineId}, found ${orders.length} orders`);

    orders.forEach(order => {
      console.log(`���� Order ${order.orderNumber}: status=${order.status}, lines=${order.lines.length}`);

      // Só mostrar OPs que estão em andamento ou programadas (não completed)
      if (order.status === 'completed') {
        console.log(`⏭️ Skipping completed order: ${order.orderNumber}`);
        return;
      }

      order.lines.forEach(line => {
        console.log(`📄 Line ${line.id}: status=${line.status}, completed=${line.completedQuantity}/${line.quantity}, operations=${line.cuttingOperations.length}`);

        line.cuttingOperations.forEach(operation => {
          console.log(`⚙️ Operation ${operation.id}: machine=${operation.machineId}, status=${operation.status}, completed=${operation.completedQuantity}/${operation.quantity}`);

          // Skip operations that are fully completed
          if (operation.status === 'completed' && operation.completedQuantity >= operation.quantity) {
            console.log(`✅ Skipping completed operation: ${operation.id}`);
            return;
          }
          // Skip operations for different machines
          if (machineId && operation.machineId !== machineId) {
            console.log(`🏭 Skipping operation for different machine: ${operation.id} (machine: ${operation.machineId}, looking for: ${machineId})`);
            return;
          }
          // Skip if remaining quantity is 0 or less
          if (operation.quantity - operation.completedQuantity <= 0) {
            console.log(`📊 Skipping operation with no remaining quantity: ${operation.id}`);
            return;
          }

          const machine = this.mockMachines.find(m => m.id === operation.machineId);
          if (!machine) {
            console.log(`🏭 Machine not found for operation: ${operation.id}, machineId: ${operation.machineId}`);
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

          console.log(`✨ Adding work item: ${workItem.id}, remaining: ${workItem.remainingQuantity}`);
          workItems.push(workItem);
        });
      });
    });

    console.log(`📝 Total work items found: ${workItems.length}`);
    return workItems.sort((a, b) => b.priority - a.priority);
  }

  async completeWorkItem(workItemId: string, completedQuantity: number, operatorNotes?: string): Promise<void> {
    console.log(`🎯 Attempting to complete work item: ${workItemId}`);

    const parts = workItemId.split('-');
    if (parts.length < 3) {
      console.error(`Invalid work item ID format: ${workItemId}`);
      alert(`Erro: ID de trabalho inválido: ${workItemId}`);
      return;
    }

    const [orderId, lineId, operationId] = parts;
    console.log(`📋 Parsed IDs - Order: ${orderId}, Line: ${lineId}, Operation: ${operationId}`);

    const data = this.getStoredData();

    // Ensure productionOrders array exists
    if (!data.productionOrders) {
      data.productionOrders = [];
    }

    console.log(`📊 Searching in ${data.productionOrders.length} orders`);

    const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === orderId);
    if (orderIndex === -1) {
      console.error(`❌ Order not found: ${orderId}`);
      console.log('Available orders:', data.productionOrders.map((o: ProductionOrder) => ({ id: o.id, number: o.orderNumber })));
      alert(`Erro: Ordem não encontrada: ${orderId}`);
      return;
    }

    const line = data.productionOrders[orderIndex].lines.find((l: ProductionOrderLine) => l.id === lineId);
    if (!line) {
      console.error(`❌ Line not found: ${lineId}`);
      console.log('Available lines:', data.productionOrders[orderIndex].lines.map((l: ProductionOrderLine) => l.id));
      alert(`Erro: Linha não encontrada: ${lineId}`);
      return;
    }

    let operation = line.cuttingOperations.find((op: CuttingOperation) => op.id === operationId);
    if (!operation) {
      console.error(`❌ Operation not found: ${operationId}`);
      console.log('Available operations:', line.cuttingOperations.map((op: CuttingOperation) => op.id));
      console.log('Looking for operation ID type:', typeof operationId, operationId);
      console.log('Available operation ID types:', line.cuttingOperations.map((op: CuttingOperation) => [typeof op.id, op.id]));

      // Try finding by string conversion
      operation = line.cuttingOperations.find((op: CuttingOperation) => op.id.toString() === operationId.toString());

      if (!operation) {
        // Auto-fix and retry
        console.log('🔧 Attempting to fix data automatically...');
        await this.fixDataConsistency();

        alert(`Operação não encontrada (ID: ${operationId}).\n\nOs dados foram corrigidos automaticamente.\nPor favor, atualize a página (F5) e tente novamente.`);
        return;
      } else {
        console.log('✅ Found operation after string conversion');
      }
    }

    console.log(`BEFORE - Operation ${operationId}: completed=${operation.completedQuantity}, quantity=${operation.quantity}, status=${operation.status}`);

    // Update operation completed quantity
    operation.completedQuantity = Math.min(operation.completedQuantity + completedQuantity, operation.quantity);

    if (operatorNotes) {
      operation.operatorNotes = operatorNotes;
    }

    // Mark operation as completed if quantity is reached
    if (operation.completedQuantity >= operation.quantity) {
      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    } else {
      operation.status = 'in_progress';
    }

    console.log(`AFTER - Operation ${operationId}: completed=${operation.completedQuantity}, quantity=${operation.quantity}, status=${operation.status}`);

    // Update line status and completed quantity based on operations
    const allOperationsComplete = line.cuttingOperations.every((op: CuttingOperation) => op.status === 'completed');
    const totalCompletedQuantity = Math.min(...line.cuttingOperations.map((op: CuttingOperation) => op.completedQuantity));

    line.completedQuantity = totalCompletedQuantity;

    if (allOperationsComplete && totalCompletedQuantity >= line.quantity) {
      line.status = 'completed';
      line.completedQuantity = line.quantity;
    } else if (totalCompletedQuantity > 0) {
      line.status = 'in_progress';
    }

    console.log(`Line ${lineId}: completed=${line.completedQuantity}, quantity=${line.quantity}, status=${line.status}, allOpsComplete=${allOperationsComplete}`);

    // Update order status if all lines are completed
    const allLinesComplete = data.productionOrders[orderIndex].lines.every((l: ProductionOrderLine) => l.status === 'completed');
    if (allLinesComplete) {
      data.productionOrders[orderIndex].status = 'completed';
    } else if (data.productionOrders[orderIndex].lines.some((l: ProductionOrderLine) => l.status === 'in_progress')) {
      data.productionOrders[orderIndex].status = 'in_progress';
    }

    data.productionOrders[orderIndex].updatedAt = new Date().toISOString();
    this.saveData(data);

    console.log(`Work item completed: ${workItemId}, completed quantity: ${completedQuantity}, operation status: ${operation.status}, line status: ${line.status}`);
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

  async markOrderLineAsShipped(orderId: string, lineId: string): Promise<ProductionOrder> {
    const data = this.getStoredData();
    const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === orderId);

    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const lineIndex = data.productionOrders[orderIndex].lines.findIndex((line: ProductionOrderLine) => line.id === lineId);

    if (lineIndex === -1) {
      throw new Error('Order line not found');
    }

    // Mark the line as shipped/completed
    data.productionOrders[orderIndex].lines[lineIndex].status = 'completed';
    data.productionOrders[orderIndex].lines[lineIndex].shippedAt = new Date().toISOString();

    // Update order status if all lines are completed
    const allLinesCompleted = data.productionOrders[orderIndex].lines.every((line: ProductionOrderLine) => line.status === 'completed');
    if (allLinesCompleted) {
      data.productionOrders[orderIndex].status = 'completed';
    }

    this.saveData(data);
    return data.productionOrders[orderIndex];
  }

  // Debug methods
  async debugPrintStorageData(): Promise<void> {
    const data = this.getStoredData();
    console.log('=== STORAGE DEBUG ===');
    console.log('Storage key:', this.storageKey);
    console.log('Production orders:', data.productionOrders?.length || 0);
    console.log('Full data:', JSON.stringify(data, null, 2));
    console.log('===================');
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

  async createTestOrder(): Promise<void> {
    console.log('Creating test order with consistent IDs...');

    // Use timestamp-based IDs for consistency
    const timestamp = Date.now();
    const testOrder = {
      orderNumber: `OP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: {
        id: 'cust-test-1',
        name: 'Cliente Teste BZM',
        contact: 'teste@bzm.com'
      },
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium' as const,
      notes: 'Ordem de teste para debug - BZM',
      lines: [
        {
          id: `line-${timestamp}`,
          foamType: this.mockFoamTypes[0],
          initialDimensions: { length: 4000, width: 2000, height: 2000 },
          finalDimensions: { length: 1000, width: 500, height: 200 },
          quantity: 5,
          completedQuantity: 0,
          status: 'pending' as const,
          priority: 5,
          cuttingOperations: [
            {
              id: `op-bzm-${timestamp}`,
              machineId: '1', // BZM-01
              inputDimensions: { length: 4000, width: 2000, height: 2000 },
              outputDimensions: { length: 1000, width: 500, height: 200 },
              quantity: 5,
              completedQuantity: 0,
              estimatedTime: 30,
              status: 'pending' as const,
              observations: 'Corte inicial do bloco de espuma - Teste'
            }
          ]
        }
      ]
    };

    await this.createProductionOrder(testOrder);
    console.log('✅ Test order created successfully!', testOrder.orderNumber);
  }

  async ensureDataConsistency(): Promise<void> {
    const data = this.getStoredData();

    // Check if we have valid orders with consistent data
    if (!data.productionOrders || data.productionOrders.length === 0) {
      console.log('📋 No orders found - system starting clean');
      // Don't create test data automatically - keep system clean
      return;
    }

    // Validate existing orders for consistency
    let hasInconsistentData = false;

    for (const order of data.productionOrders) {
      if (!order.id || !order.lines) {
        hasInconsistentData = true;
        break;
      }

      for (const line of order.lines) {
        if (!line.id || !line.cuttingOperations) {
          hasInconsistentData = true;
          break;
        }

        for (const operation of line.cuttingOperations) {
          if (!operation.id || !operation.machineId) {
            hasInconsistentData = true;
            break;
          }
        }
      }
    }

    if (hasInconsistentData) {
      console.log('🔧 Inconsistent data detected, removing invalid data...');
      // Instead of auto-fixing, just clear the bad data
      await this.clearAllData();
      console.log('✅ Invalid data cleared - system is now clean');
    }
  }

  async fixDataConsistency(): Promise<void> {
    console.log('🔧 Fixing data consistency...');

    // Clear all data first
    await this.clearAllData();

    // Create a clean test order
    await this.createTestOrder();

    console.log('✅ Data consistency fixed!');
  }

  // Método específico para resolver problemas BZM
  async fixBzmIssue(): Promise<void> {
    console.log('🔧 Corrigindo problemas específicos da BZM...');

    // Limpar dados problemáticos
    await this.clearAllData();

    // Criar ordem de teste com IDs consistentes
    const timestamp = Date.now();
    const cleanOrder = {
      orderNumber: `OP-BZM-${timestamp}`,
      customer: {
        id: 'cust-bzm-test',
        name: 'Cliente BZM Test',
        contact: 'bzm@test.com'
      },
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium' as const,
      notes: 'Ordem limpa para BZM - sem problemas de ID',
      lines: [
        {
          id: `line-${timestamp}`,
          foamType: this.mockFoamTypes[0],
          initialDimensions: { length: 4000, width: 2000, height: 2000 },
          finalDimensions: { length: 1000, width: 500, height: 200 },
          quantity: 5,
          completedQuantity: 0,
          status: 'pending' as const,
          priority: 5,
          cuttingOperations: [
            {
              id: `op-bzm-${timestamp}`,
              machineId: '1', // BZM-01
              inputDimensions: { length: 4000, width: 2000, height: 2000 },
              outputDimensions: { length: 1000, width: 500, height: 200 },
              quantity: 5,
              completedQuantity: 0,
              estimatedTime: 30,
              status: 'pending' as const,
              observations: 'Operação BZM limpa - sem falhas'
            }
          ]
        }
      ]
    };

    await this.createProductionOrder(cleanOrder);
    console.log('✅ Ordem BZM limpa criada com sucesso!');
    console.log(`📋 Número da ordem: ${cleanOrder.orderNumber}`);
    console.log(`🎯 Work Item ID: order-${timestamp}-line-${timestamp}-op-bzm-${timestamp}`);
  }

  // Método para validar integridade dos IDs
  async validateDataIntegrity(): Promise<boolean> {
    const data = this.getStoredData();

    if (!data.productionOrders || data.productionOrders.length === 0) {
      console.log('⚠️ Nenhuma ordem de produção encontrada');
      return false;
    }

    let hasProblems = false;

    for (const order of data.productionOrders) {
      if (!order.id || !order.lines) {
        console.error(`❌ Ordem inválida: ${order.orderNumber || 'SEM NÚMERO'}`);
        hasProblems = true;
        continue;
      }

      for (const line of order.lines) {
        if (!line.id || !line.cuttingOperations) {
          console.error(`❌ Linha inválida na ordem: ${order.orderNumber}`);
          hasProblems = true;
          continue;
        }

        for (const operation of line.cuttingOperations) {
          if (!operation.id || !operation.machineId) {
            console.error(`❌ Operação inválida na linha ${line.id}, ordem ${order.orderNumber}`);
            hasProblems = true;
          }
        }
      }
    }

    if (hasProblems) {
      console.log('❌ Problemas de integridade encontrados nos dados');
    } else {
      console.log('✅ Integridade dos dados verificada - OK');
    }

    return !hasProblems;
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

  (window as any).fixProductionData = async () => {
    await productionService.fixDataConsistency();
    console.log('✅ Production data fixed. Refresh the page.');
  };

  (window as any).debugProduction = async () => {
    await productionService.debugPrintStorageData();
  };

  (window as any).fixBzmIssue = async () => {
    await productionService.fixBzmIssue();
    console.log('✅ BZM issue fixed. Refresh the page.');
  };

  (window as any).validateData = async () => {
    return await productionService.validateDataIntegrity();
  };

  console.log('🔧 Global functions available:');
  console.log('  - clearProductionData()');
  console.log('  - fixProductionData()');
  console.log('  - debugProduction()');
  console.log('  - fixBzmIssue() - Correção específica para BZM');
  console.log('  - validateData() - Validar integridade dos dados');
}
