// Método melhorado para completeWorkItem
// Para substituir no productionService.ts

const newCompleteWorkItem = `
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
        throw new Error(\`Formato de ID inválido: \${workItemId}. Esperado: orderId-lineId-operationId\`);
      }

      const [orderId, lineId, operationId] = parts;
      console.log(\`📋 Parsed IDs - Order: \${orderId}, Line: \${lineId}, Operation: \${operationId}\`);

      // Get and validate data
      const data = this.getStoredData();
      if (!data.productionOrders || !Array.isArray(data.productionOrders)) {
        throw new Error('Estrutura de dados inválida - sem ordens de produção');
      }

      if (data.productionOrders.length === 0) {
        throw new Error('Nenhuma ordem de produção encontrada. O sistema está vazio.');
      }

      console.log(\`📊 Searching in \${data.productionOrders.length} orders\`);

      // Find order
      const orderIndex = data.productionOrders.findIndex((order: ProductionOrder) => order.id === orderId);
      if (orderIndex === -1) {
        console.error(\`❌ Order not found: \${orderId}\`);
        console.log('Available orders:', data.productionOrders.map((o: ProductionOrder) => ({ id: o.id, number: o.orderNumber })));
        throw new Error(\`Ordem não encontrada: \${orderId}\`);
      }

      const order = data.productionOrders[orderIndex];
      
      // Find line
      const line = order.lines.find((l: ProductionOrderLine) => l.id === lineId);
      if (!line) {
        console.error(\`❌ Line not found: \${lineId}\`);
        console.log('Available lines:', order.lines.map((l: ProductionOrderLine) => ({ id: l.id, foamType: l.foamType.name })));
        throw new Error(\`Linha não encontrada: \${lineId}\`);
      }

      // Find operation with type conversion support
      let operation = line.cuttingOperations.find((op: CuttingOperation) => op.id === operationId);
      if (!operation) {
        // Try string conversion
        operation = line.cuttingOperations.find((op: CuttingOperation) => op.id.toString() === operationId.toString());
        
        if (!operation) {
          console.error(\`❌ Operation not found: \${operationId}\`);
          console.log('Available operations:', line.cuttingOperations.map((op: CuttingOperation) => ({ id: op.id, machineId: op.machineId, status: op.status })));
          throw new Error(\`Operação não encontrada: \${operationId}\`);
        } else {
          console.log('✅ Found operation after string conversion');
        }
      }

      // Validate operation state
      if (operation.status === 'completed' && operation.completedQuantity >= operation.quantity) {
        throw new Error('Esta operação já foi completada');
      }

      if (operation.completedQuantity + completedQuantity > operation.quantity) {
        throw new Error(\`Quantidade excede o total da operação. Máximo disponível: \${operation.quantity - operation.completedQuantity}\`);
      }

      console.log(\`BEFORE - Operation \${operationId}: completed=\${operation.completedQuantity}, quantity=\${operation.quantity}, status=\${operation.status}\`);

      // Update operation
      const oldCompleted = operation.completedQuantity;
      operation.completedQuantity = Math.min(operation.completedQuantity + completedQuantity, operation.quantity);
      
      if (operatorNotes) {
        operation.operatorNotes = operatorNotes;
      }

      // Update operation status
      if (operation.completedQuantity >= operation.quantity) {
        operation.status = 'completed';
        operation.completedAt = new Date().toISOString();
        console.log(\`✅ Operation \${operationId} marked as completed\`);
      } else {
        operation.status = 'in_progress';
        console.log(\`🔄 Operation \${operationId} marked as in progress\`);
      }

      console.log(\`AFTER - Operation \${operationId}: completed=\${operation.completedQuantity}, quantity=\${operation.quantity}, status=\${operation.status}\`);

      // Update line status
      const allOperationsComplete = line.cuttingOperations.every((op: CuttingOperation) => op.status === 'completed');
      const operationQuantities = line.cuttingOperations.map((op: CuttingOperation) => op.completedQuantity);
      const minCompleted = operationQuantities.length > 0 ? Math.min(...operationQuantities) : 0;

      const oldLineCompleted = line.completedQuantity;
      line.completedQuantity = minCompleted;

      if (allOperationsComplete && minCompleted >= line.quantity) {
        line.status = 'completed';
        line.completedQuantity = line.quantity;
        console.log(\`✅ Line \${lineId} marked as completed\`);
      } else if (minCompleted > 0) {
        line.status = 'in_progress';
        console.log(\`🔄 Line \${lineId} marked as in progress\`);
      }

      console.log(\`Line \${lineId}: completed=\${line.completedQuantity}, quantity=\${line.quantity}, status=\${line.status}\`);

      // Update order status
      const allLinesComplete = order.lines.every((l: ProductionOrderLine) => l.status === 'completed');
      if (allLinesComplete) {
        order.status = 'completed';
        console.log(\`✅ Order \${order.orderNumber} marked as completed\`);
      } else if (order.lines.some((l: ProductionOrderLine) => l.status === 'in_progress')) {
        order.status = 'in_progress';
        console.log(\`🔄 Order \${order.orderNumber} marked as in progress\`);
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

      const verifyLine = verifyOrder.lines.find((l: ProductionOrderLine) => l.id === lineId);
      const verifyOperation = verifyLine?.cuttingOperations.find((op: CuttingOperation) => op.id.toString() === operationId.toString());
      
      if (!verifyOperation || verifyOperation.completedQuantity !== operation.completedQuantity) {
        throw new Error('Falha na verificação: dados inconsistentes após salvamento');
      }

      console.log(\`✅ Work item completed successfully: \${workItemId}\`);
      console.log(\`📊 Quantity processed: \${completedQuantity} (total: \${operation.completedQuantity}/\${operation.quantity})\`);
      console.log(\`🎯 Final states - Operation: \${operation.status}, Line: \${line.status}, Order: \${order.status}\`);

    } catch (error) {
      console.error('❌ Error in completeWorkItem:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Erro desconhecido ao completar operação';
      alert(\`Erro ao completar operação:\\n\\n\${errorMessage}\\n\\nPor favor, atualize a página e tente novamente.\`);
      
      // Re-throw for caller handling
      throw error;
    }
  }
`;

console.log('✅ Método completeWorkItem melhorado criado');
console.log('📋 Para aplicar: substitua o método atual no productionService.ts');
console.log('🔧 Principais melhorias:');
console.log('  - Validação robusta de entrada');
console.log('  - Tratamento de erros melhorado');  
console.log('  - Verificação de dados após salvamento');
console.log('  - Logs detalhados para debug');
console.log('  - Prevenção de corrupção de dados');
