// Script para corrigir problemas com operações BZM
// Execute no console do navegador (F12)

console.log('🔧 === CORREÇÃO AUTOMÁTICA DO PROBLEMA BZM ===');

// 1. Limpar dados antigos
localStorage.removeItem('factoryControl_production');
console.log('✅ 1. Dados antigos removidos');

// 2. Criar dados de teste limpos
const testData = {
  productionOrders: [
    {
      id: `order-${Date.now()}`,
      orderNumber: `OP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      customer: {
        id: 'cust-test-1',
        name: 'Cliente Teste BZM',
        contact: 'teste@bzm.com'
      },
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      lines: [
        {
          id: `line-${Date.now()}`,
          foamType: {
            id: '1',
            name: 'Espuma D20',
            density: 20,
            hardness: 'Macia',
            color: 'Branca',
            specifications: 'Espuma de poliuretano flexível D20 - uso geral',
            pricePerM3: 45.00,
            stockColor: '#f8f9fa'
          },
          initialDimensions: { length: 4000, width: 2000, height: 2000 },
          finalDimensions: { length: 1000, width: 500, height: 200 },
          quantity: 5,
          completedQuantity: 0,
          status: 'pending',
          priority: 5,
          cuttingOperations: [
            {
              id: `op-bzm-${Date.now()}`,
              machineId: '1', // BZM-01
              inputDimensions: { length: 4000, width: 2000, height: 2000 },
              outputDimensions: { length: 1000, width: 500, height: 200 },
              quantity: 5,
              completedQuantity: 0,
              estimatedTime: 30,
              status: 'pending',
              observations: 'Corte inicial do bloco de espuma - Teste Clean'
            }
          ]
        }
      ],
      status: 'created',
      priority: 'medium',
      totalVolume: 0,
      estimatedCost: 0,
      notes: 'Ordem de teste para debug - BZM Clean',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'System'
    }
  ],
  productSheets: [],
  chatMessages: [],
  operatorSessions: [],
  foamBlocks: [],
  stockMovements: []
};

localStorage.setItem('factoryControl_production', JSON.stringify(testData));
console.log('✅ 2. Dados de teste limpos criados');

// 3. Verificar dados criados
const storedData = JSON.parse(localStorage.getItem('factoryControl_production') || '{}');
console.log('📋 3. Dados verificados:', {
  orders: storedData.productionOrders?.length || 0,
  order: storedData.productionOrders?.[0]?.orderNumber,
  lineId: storedData.productionOrders?.[0]?.lines?.[0]?.id,
  operationId: storedData.productionOrders?.[0]?.lines?.[0]?.cuttingOperations?.[0]?.id,
  workItemId: `${storedData.productionOrders?.[0]?.id}-${storedData.productionOrders?.[0]?.lines?.[0]?.id}-${storedData.productionOrders?.[0]?.lines?.[0]?.cuttingOperations?.[0]?.id}`
});

console.log('🔧 === CORREÇÃO CONCLUÍDA ===');
console.log('✅ Por favor, atualize a página (F5) para aplicar as correções');
console.log('📝 Use productionService.getOperatorWorkItems("1") para verificar os work items da BZM');

// Função auxiliar para testar completion
window.testBzmComplete = (quantity = 1) => {
  const data = JSON.parse(localStorage.getItem('factoryControl_production') || '{}');
  if (data.productionOrders && data.productionOrders[0]) {
    const order = data.productionOrders[0];
    const line = order.lines[0];
    const operation = line.cuttingOperations[0];
    const workItemId = `${order.id}-${line.id}-${operation.id}`;
    
    console.log(`🧪 Testando completion do work item: ${workItemId}`);
    console.log(`Quantidade a completar: ${quantity}`);
    
    // Esta função será disponível após o refresh da página
    if (window.productionService) {
      return window.productionService.completeWorkItem(workItemId, quantity, 'Teste de completion automático');
    } else {
      console.log('⚠️ productionService não disponível - atualize a página primeiro');
      return Promise.resolve();
    }
  }
};

console.log('🧪 Função de teste disponível: testBzmComplete(quantity)');
