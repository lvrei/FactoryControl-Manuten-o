// Execute este script no console do navegador (F12) para debug
// Copie e cole todo o código abaixo:

(async function debugProduction() {
  console.log('🔍 === DEBUG PRODUCTION SYSTEM ===');
  
  // Importar o serviço de produção
  const { productionService } = await import('./client/services/productionService.js');
  
  console.log('📋 1. Verificando dados de produção...');
  await productionService.debugPrintStorageData();
  
  console.log('📋 2. Carregando ordens de produção...');
  const orders = await productionService.getProductionOrders();
  console.log(`Ordens encontradas: ${orders.length}`);
  
  orders.forEach((order, index) => {
    console.log(`\n📄 Ordem ${index + 1}: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Linhas: ${order.lines.length}`);
    
    order.lines.forEach((line, lineIndex) => {
      console.log(`   📄 Linha ${lineIndex + 1}:`);
      console.log(`      Status: ${line.status}`);
      console.log(`      Quantidade: ${line.completedQuantity}/${line.quantity}`);
      console.log(`      Operações: ${line.cuttingOperations.length}`);
      
      line.cuttingOperations.forEach((op, opIndex) => {
        console.log(`      ⚙️ Op ${opIndex + 1} (${op.id}):`);
        console.log(`         Máquina: ${op.machineId}`);
        console.log(`         Status: ${op.status}`);
        console.log(`         Quantidade: ${op.completedQuantity}/${op.quantity}`);
      });
    });
  });
  
  console.log('\n📋 3. Verificando work items para BZM-01...');
  const workItems = await productionService.getOperatorWorkItems('1'); // BZM-01
  console.log(`Work items para BZM-01: ${workItems.length}`);
  
  workItems.forEach((item, index) => {
    console.log(`\n✨ Work Item ${index + 1}:`);
    console.log(`   ID: ${item.id}`);
    console.log(`   OP: ${item.orderNumber}`);
    console.log(`   Cliente: ${item.customer}`);
    console.log(`   Restante: ${item.remainingQuantity}/${item.quantity}`);
  });
  
  console.log('\n🔍 === DEBUG CONCLUÍDO ===');
  console.log('Para limpar todos os dados: productionService.clearAllData()');
})();
