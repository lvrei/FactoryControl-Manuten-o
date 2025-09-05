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

/**
 * CONSOLIDATED PRODUCTION SERVICE
 * Versão unificada e otimizada dos múltiplos productionService files
 * Inclui as melhores práticas e robustez de todas as versões
 */
class ProductionService {
  private storageKey = 'factoryControl_production';
  private initialized = false;

  // Dados mockados para desenvolvimento - em produção conectar ao backend
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
      id: 'bzm-001',
      name: 'BZM-01',
      type: 'BZM',
      status: 'available',
      maxDimensions: { length: 4200, width: 2000, height: 2000 },
      cuttingPrecision: 1.0,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 1250,
      specifications: 'Corte Inicial'
    },
    {
      id: 'carousel-001',
      name: 'Carrossel-01',
      type: 'CAROUSEL',
      status: 'busy',
      maxDimensions: { length: 2500, width: 1800, height: 1500 },
      cuttingPrecision: 2.0,
      currentOperator: 'João Silva',
      lastMaintenance: new Date().toISOString(),
      operatingHours: 980,
      specifications: 'Coxins'
    },
    {
      id: 'pre-cnc-001',
      name: 'Pré-CNC-01',
      type: 'PRE_CNC',
      status: 'available',
      maxDimensions: { length: 2500, width: 1500, height: 1200 },
      cuttingPrecision: 1.0,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 1680,
      specifications: 'Pré-processamento'
    },
    {
      id: 'cnc-001',
      name: 'CNC-01',
      type: 'CNC',
      status: 'maintenance',
      maxDimensions: { length: 1200, width: 1200, height: 600 },
      cuttingPrecision: 0.5,
      currentOperator: null,
      lastMaintenance: new Date().toISOString(),
      operatingHours: 2150,
      specifications: 'Acabamento'
    }
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
      if (!stored || typeof stored !== 'object') {
        console.warn('🧹 Dados corrompidos detectados, inicializando sistema limpo');
        this.initializeCleanSystem();
        return;
      }

      // Garantir estrutura mínima
      const requiredKeys = ['productionOrders', 'foamTypes', 'machines', 'operatorSessions', 'chatMessages'];
      const missingKeys = requiredKeys.filter(key => !Array.isArray(stored[key]));
      
      if (missingKeys.length > 0) {
        console.warn('🔧 Estrutura de dados incompleta, corrigindo:', missingKeys);
        this.initializeCleanSystem();
      }

      console.log('✅ ProductionService inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.initializeCleanSystem();
    }
  }

  private getStoredData(): any {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Validação básica da estrutura
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('❌ Erro ao ler dados armazenados:', error);
      return null;
    }
  }

  private saveData(data: any): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('💾 Dados salvos com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      
      // Tentar limpeza automática se quota excedida
      if (error.name === 'QuotaExceededError') {
        console.warn('🧹 Quota excedida, limpando dados antigos...');
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
            msg => new Date(msg.timestamp) > cutoffDate
          );
        }
        
        // Limpar sessões antigas
        if (data.operatorSessions) {
          data.operatorSessions = data.operatorSessions.filter(
            session => new Date(session.startTime) > cutoffDate
          );
        }
        
        this.saveData(data);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar dados antigos:', error);
    }
  }

  // Métodos públicos - Ordens de Produção
  async getProductionOrders(filters?: ProductionFilters): Promise<ProductionOrder[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      let orders = data?.productionOrders || [];

      if (filters) {
        orders = orders.filter(order => {
          // Handle status filter (can be string or array)
          if (filters.status) {
            const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
            if (statusArray.length > 0 && !statusArray.includes(order.status)) return false;
          }

          // Handle priority filter (can be string or array)
          if (filters.priority) {
            const priorityArray = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
            if (priorityArray.length > 0 && !priorityArray.includes(order.priority)) return false;
          }

          if (filters.customer && !order.customer.name.toLowerCase().includes(filters.customer.toLowerCase())) return false;
          if (filters.orderNumber && !order.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())) return false;
          return true;
        });
      }

      return orders;
    } catch (error) {
      console.error('❌ Erro ao buscar ordens:', error);
      return [];
    }
  }

  async createProductionOrder(order: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || { productionOrders: [] };
      
      const newOrder: ProductionOrder = {
        ...order,
        id: `OP-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: order.status || 'created'
      };

      data.productionOrders = [...(data.productionOrders || []), newOrder];
      this.saveData(data);
      
      console.log('✅ Ordem criada:', newOrder.orderNumber);
      return newOrder;
    } catch (error) {
      console.error('❌ Erro ao criar ordem:', error);
      throw error;
    }
  }

  async updateProductionOrder(id: string, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) throw new Error('Dados não encontrados');

      const orderIndex = data.productionOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) throw new Error('Ordem não encontrada');

      data.productionOrders[orderIndex] = {
        ...data.productionOrders[orderIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.saveData(data);
      console.log('✅ Ordem atualizada:', id);
      return data.productionOrders[orderIndex];
    } catch (error) {
      console.error('❌ Erro ao atualizar ordem:', error);
      throw error;
    }
  }

  async deleteProductionOrder(id: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) return;

      data.productionOrders = data.productionOrders.filter(o => o.id !== id);
      this.saveData(data);
      console.log('✅ Ordem deletada:', id);
    } catch (error) {
      console.error('❌ Erro ao deletar ordem:', error);
      throw error;
    }
  }

  // Métodos públicos - Máquinas (com validação defensiva)
  async getMachines(): Promise<Machine[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();

      // Se não há máquinas salvas, usar mock e salvar
      if (!data?.machines || !Array.isArray(data.machines) || data.machines.length === 0) {
        const dataToSave = { ...data, machines: this.mockMachines };
        this.saveData(dataToSave);
        return this.mockMachines;
      }

      return data.machines;
    } catch (error) {
      console.error('❌ Erro ao buscar máquinas:', error);
      return this.mockMachines;
    }
  }

  // Atualizar status da máquina (usado pela manutenção)
  async updateMachineStatus(machineId: string, status: Machine['status']): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || {};

      if (!Array.isArray(data.machines) || data.machines.length === 0) {
        data.machines = [...this.mockMachines];
      }

      const machineIndex = data.machines.findIndex((m: Machine) => m.id === machineId);
      if (machineIndex !== -1) {
        data.machines[machineIndex].status = status;
        if (status === 'maintenance') {
          data.machines[machineIndex].currentOperator = null;
        }
      } else {
        const mock = this.mockMachines.find(m => m.id === machineId);
        if (mock) {
          data.machines.push({ ...mock, status, currentOperator: status === 'maintenance' ? null : mock.currentOperator });
        }
      }

      data.lastUpdated = new Date().toISOString();
      this.saveData(data);
      console.log('🔧 Status da máquina atualizado:', machineId, '→', status);
    } catch (error) {
      console.error('❌ Erro ao atualizar status da máquina:', error);
      throw error;
    }
  }

  // Métodos públicos - Tipos de Espuma (com mapeamento defensivo)
  async getFoamTypes(): Promise<FoamType[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      
      let foamTypes = data?.foamTypes || this.mockFoamTypes;
      
      // Mapeamento defensivo - garantir campos obrigatórios
      foamTypes = foamTypes.map(foam => ({
        id: foam.id || `foam-${Date.now()}`,
        name: foam.name || 'Espuma Sem Nome',
        density: foam.density || 20,
        hardness: foam.hardness || 'Média',
        color: foam.color || 'Branca',
        specifications: foam.specifications || 'Especificações não informadas',
        pricePerM3: foam.pricePerM3 || 0,
        stockColor: foam.stockColor || '#f8f9fa'
      }));

      return foamTypes;
    } catch (error) {
      console.error('❌ Erro ao buscar tipos de espuma:', error);
      return this.mockFoamTypes;
    }
  }

  // Métodos públicos - Itens de Trabalho do Operador
  async getOperatorWorkItems(machineId?: string, filters?: any): Promise<OperatorWorkItem[]> {
    try {
      this.ensureInitialized();
      const orders = await this.getProductionOrders();
      const workItems: OperatorWorkItem[] = [];

      for (const order of orders) {
        if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'shipped') continue;

        for (const line of order.lines || []) {
          if (line.status === 'completed') continue;

          for (const operation of line.cuttingOperations || []) {
            if (operation.status === 'completed') continue;
            if (machineId && operation.machineId !== machineId) continue;

            // Find machine details
            const machine = this.mockMachines.find(m => m.id === operation.machineId);
            const machineType = machine?.type || 'UNKNOWN';

            // Prerequisite gating: non-BZM ops require BZM completed; CNC also requires PRE_CNC if present
            const bzmOp = (line.cuttingOperations || []).find(op => {
              const m = this.mockMachines.find(mm => mm.id === op.machineId);
              return m?.type === 'BZM';
            });
            const preCncOp = (line.cuttingOperations || []).find(op => {
              const m = this.mockMachines.find(mm => mm.id === op.machineId);
              return m?.type === 'PRE_CNC';
            });

            let blocked = false;
            if (machineType !== 'BZM' && bzmOp && bzmOp.status !== 'completed') {
              blocked = true;
            }
            if (!blocked && machineType === 'CNC' && preCncOp && preCncOp.status !== 'completed') {
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
              remainingQuantity: operation.quantity - (operation.completedQuantity || 0),
              machineId: operation.machineId,
              machineName: machine?.name || 'Máquina Desconhecida',
              machineType: machineType,
              priority: priorityMap[order.priority] || 5,
              expectedDeliveryDate: order.expectedDeliveryDate,
              estimatedTime: operation.estimatedTime,
              observations: operation.observations || ''
            });
          }
        }
      }

      return workItems.sort((a, b) => {
        // Sort by priority (higher number = higher priority)
        return (b.priority || 0) - (a.priority || 0);
      });
    } catch (error) {
      console.error('❌ Erro ao buscar itens de trabalho:', error);
      return [];
    }
  }

  // Método ROBUSTO para completar item de trabalho (melhor de todas as versões)
  async completeWorkItem(workItemId: string, completedQuantity: number, operatorNotes?: string): Promise<void> {
    try {
      this.ensureInitialized();
      console.log('🔧 Completando item:', workItemId, 'Qtd:', completedQuantity);

      // Parse robusto do ID (suporta order IDs com OP- prefix)
      const parts = workItemId.split('-');
      if (parts.length < 4) {
        throw new Error(`ID inválido: ${workItemId}`);
      }

      // Reconstruct orderId with OP- prefix
      const orderId = `${parts[0]}-${parts[1]}`; // "OP-1755848529731"
      const lineId = parts[2]; // "1755848526881"
      const operationParts = parts.slice(3); // ["1755848526881", "bzm"]
      const operationId = operationParts.join('-'); // "1755848526881-bzm"
      
      console.log('📋 Parsed:', { orderId, lineId, operationId });

      const data = this.getStoredData();
      if (!data?.productionOrders) {
        throw new Error('Dados de produção não encontrados');
      }

      // Encontrar ordem
      const order = data.productionOrders.find(o => o.id === orderId);
      if (!order) {
        throw new Error(`Ordem não encontrada: ${orderId}`);
      }

      // Encontrar linha
      const line = order.lines?.find(l => l.id === lineId);
      if (!line) {
        throw new Error(`Linha n��o encontrada: ${lineId}`);
      }

      // Encontrar operação (estratégias múltiplas)
      let operation = line.cuttingOperations?.find(op => op.id === operationId);

      if (!operation) {
        // Estratégia 2: toString()
        operation = line.cuttingOperations?.find(op => op.id?.toString() === operationId);
      }

      if (!operation) {
        // Estratégia 3: índice numérico
        const numericIndex = parseInt(operationId);
        if (!isNaN(numericIndex) && line.cuttingOperations && line.cuttingOperations[numericIndex]) {
          operation = line.cuttingOperations[numericIndex];
        }
      }

      if (!operation) {
        throw new Error(`Operação não encontrada: ${operationId}`);
      }

      // Validações
      const currentCompleted = operation.completedQuantity || 0;
      const opTargetQty = (typeof operation.quantity === 'number' && operation.quantity > 0) ? operation.quantity : line.quantity;
      const remaining = opTargetQty - currentCompleted;

      if (completedQuantity > remaining) {
        throw new Error(`Quantidade excede o restante: ${completedQuantity} > ${remaining}`);
      }

      if (completedQuantity <= 0) {
        throw new Error('Quantidade deve ser positiva');
      }

      // Atualizar operação
      operation.completedQuantity = currentCompleted + completedQuantity;
      const opTargetQty = (typeof operation.quantity === 'number' && operation.quantity > 0) ? operation.quantity : line.quantity;
      operation.status = operation.completedQuantity >= opTargetQty ? 'completed' : 'in_progress';
      operation.completedAt = new Date().toISOString();
      
      if (operatorNotes) {
        operation.notes = (operation.notes || '') + `\n[${new Date().toLocaleString()}] ${operatorNotes}`;
      }

      // Atualizar linha
    const opCompletions = (line.cuttingOperations || []).map(op => op.completedQuantity || 0);
    const minCompleted = opCompletions.length > 0 ? Math.min(...opCompletions) : 0;
    line.completedQuantity = Math.min(minCompleted, line.quantity);
    const allOpsCompleted = (line.cuttingOperations || []).every(op => (op.status === 'completed') && (op.completedQuantity || 0) >= (op.quantity || 0));
    line.status = allOpsCompleted ? 'completed' : 'in_progress';

      // Atualizar ordem
      const allLinesCompleted = order.lines?.every(l => l.status === 'completed') || false;
      if (allLinesCompleted) {
        order.status = 'completed';
        order.completedAt = new Date().toISOString();
      } else {
        order.status = 'in_progress';
      }

      order.updatedAt = new Date().toISOString();

      // Salvar e verificar
      this.saveData(data);
      
      // Verificação pós-save (detecta problemas de quota/corrupção)
      const verification = this.getStoredData();
      const verifyOrder = verification?.productionOrders?.find(o => o.id === orderId);
      
      if (!verifyOrder) {
        throw new Error('Falha na verificação: dados não foram salvos corretamente');
      }

      console.log('✅ Item completado com sucesso');
      alert(`✅ ${completedQuantity} unidades completadas com sucesso!`);
      
    } catch (error) {
      console.error('❌ Erro ao completar item:', error);
      alert(`❌ Erro: ${error.message}`);
      throw error;
    }
  }

  // Métodos públicos - Chat
  async getChatMessages(machineId?: string, operatorId?: string): Promise<ChatMessage[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      let messages = data?.chatMessages || [];

      if (machineId) {
        messages = messages.filter(msg => msg.machineId === machineId);
      }

      if (operatorId) {
        messages = messages.filter(msg => msg.from === operatorId || msg.to === operatorId);
      }

      return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return [];
    }
  }

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>): Promise<ChatMessage> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || { chatMessages: [] };
      
      const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      data.chatMessages = [...(data.chatMessages || []), newMessage];
      this.saveData(data);
      
      return newMessage;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.chatMessages) return;

      const message = data.chatMessages.find(m => m.id === messageId);
      if (message) {
        message.isRead = true;
        this.saveData(data);
      }
    } catch (error) {
      console.error('❌ Erro ao marcar mensagem:', error);
    }
  }

  // Métodos públicos - Sessões de Operador
  async startOperatorSession(operatorId: string, operatorName: string, machineId: string): Promise<OperatorSession> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData() || { operatorSessions: [] };

      // Encerrar sessões anteriores do mesmo operador
      if (data.operatorSessions) {
        data.operatorSessions.forEach(session => {
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
        machineName: (await this.getMachines()).find(m => m.id === machineId)?.name || 'Máquina Desconhecida',
        startTime: new Date().toISOString(),
        status: 'active'
      };

      data.operatorSessions = [...(data.operatorSessions || []), newSession];
      this.saveData(data);
      
      console.log('✅ Sessão iniciada:', newSession);
      return newSession;
    } catch (error) {
      console.error('❌ Erro ao iniciar sessão:', error);
      throw error;
    }
  }

  async endOperatorSession(sessionId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.operatorSessions) return;

      const session = data.operatorSessions.find(s => s.id === sessionId);
      if (session) {
        session.endTime = new Date().toISOString();
        session.status = 'completed';
        this.saveData(data);
        console.log('✅ Sessão encerrada:', sessionId);
      }
    } catch (error) {
      console.error('❌ Erro ao encerrar sessão:', error);
    }
  }

  async getOperatorSessions(activeOnly = false): Promise<OperatorSession[]> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      let sessions = data?.operatorSessions || [];

      if (activeOnly) {
        sessions = sessions.filter(s => s.status === 'active' && !s.endTime);
      }

      return sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } catch (error) {
      console.error('❌ Erro ao buscar sessões:', error);
      return [];
    }
  }

  // Método para marcar linha como enviada
  async markOrderLineAsShipped(orderId: string, lineId: string): Promise<void> {
    try {
      this.ensureInitialized();
      const data = this.getStoredData();
      if (!data?.productionOrders) return;

      const order = data.productionOrders.find(o => o.id === orderId);
      if (!order) return;

      const line = order.lines?.find(l => l.id === lineId);
      if (!line) return;

      line.status = 'shipped';
      line.shippedAt = new Date().toISOString();

      // Verificar se toda a ordem foi enviada
      const allShipped = order.lines?.every(l => l.status === 'shipped') || false;
      if (allShipped) {
        order.status = 'shipped';
        order.shippedAt = new Date().toISOString();
      }

      order.updatedAt = new Date().toISOString();
      this.saveData(data);

      console.log('✅ Linha marcada como enviada:', lineId, 'Status da linha:', line.status);
      if (allShipped) {
        console.log('✅ Toda a ordem foi enviada:', orderId, 'Status da ordem:', order.status);
      }
    } catch (error) {
      console.error('❌ Erro ao marcar como enviada:', error);
    }
  }

  // Métodos de limpeza e inicialização
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      this.initialized = false;
      console.log('🧹 Todos os dados limpos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
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
        version: '4.0-consolidated',
        lastUpdated: new Date().toISOString()
      };

      this.saveData(cleanData);
      this.initialized = true;
      console.log('✅ Sistema inicializado com dados limpos');
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema:', error);
    }
  }

  // Método de teste para validação rápida
  async testCompleteWorkItem(workItemId: string, quantity: number): Promise<void> {
    try {
      console.log('🧪 Testando completeWorkItem:', workItemId, quantity);
      await this.completeWorkItem(workItemId, quantity, 'Teste automatizado');
      console.log('✅ Teste bem-sucedido');
    } catch (error) {
      console.error('❌ Teste falhou:', error);
    }
  }

  // Método para testar todos os métodos principais
  testAllMethods(): void {
    const methods = [
      'getProductionOrders', 'createProductionOrder', 'updateProductionOrder', 'deleteProductionOrder',
      'getMachines', 'getFoamTypes', 'getOperatorWorkItems', 'completeWorkItem',
      'getChatMessages', 'sendChatMessage', 'markMessageAsRead',
      'startOperatorSession', 'endOperatorSession', 'getOperatorSessions',
      'markOrderLineAsShipped', 'clearAllData', 'initializeCleanSystem'
    ];

    console.log('🧪 Testando existência de métodos:');
    methods.forEach(method => {
      const exists = typeof this[method] === 'function';
      console.log(`${exists ? '✅' : '❌'} ${method}: ${exists ? 'OK' : 'MISSING'}`);
    });
  }
}

// Criar instância única
const productionService = new ProductionService();

// Expor para debug (apenas em desenvolvimento)
if (typeof window !== 'undefined') {
  (window as any).productionService = productionService;
  (window as any).clearProductionData = () => productionService.clearAllData();
  (window as any).initializeCleanSystem = () => productionService.initializeCleanSystem();
}

export { productionService };
