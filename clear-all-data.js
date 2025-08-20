// Script para limpar TODOS os dados do sistema e resetar completamente
// Execute este script no console do navegador (F12) para limpar tudo

console.log('🧹 === LIMPEZA COMPLETA DO SISTEMA ===');

// 1. Limpar TODOS os dados do localStorage
const keys = Object.keys(localStorage);
console.log(`📋 Encontrados ${keys.length} itens no localStorage`);

keys.forEach(key => {
  if (key.startsWith('factoryControl_') || 
      key.includes('production') || 
      key.includes('maintenance') || 
      key.includes('operator') ||
      key.includes('machine') ||
      key.includes('shipping')) {
    console.log(`🗑️ Removendo: ${key}`);
    localStorage.removeItem(key);
  }
});

// 2. Limpar dados específicos conhecidos
const keysToRemove = [
  'factoryControl_production',
  'factoryControl_maintenance', 
  'factoryControl_operators',
  'factoryControl_machines',
  'factoryControl_shipping',
  'factoryControl_auth',
  'factoryControl_machineStatus',
  'factoryControl_sessions'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    console.log(`🗑️ Removendo dados: ${key}`);
    localStorage.removeItem(key);
  }
});

// 3. Limpar também sessionStorage
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
  if (key.startsWith('factoryControl_') || 
      key.includes('production') || 
      key.includes('operator')) {
    console.log(`🗑️ Removendo session: ${key}`);
    sessionStorage.removeItem(key);
  }
});

// 4. Verificar limpeza
const remainingKeys = Object.keys(localStorage).filter(key => 
  key.startsWith('factoryControl_') || 
  key.includes('production') || 
  key.includes('maintenance')
);

if (remainingKeys.length === 0) {
  console.log('✅ Limpeza completa realizada com sucesso!');
  console.log('✅ Sistema resetado - todos os dados removidos');
  console.log('🔄 Atualize a página (F5) para começar limpo');
} else {
  console.log('⚠️ Alguns dados ainda presentes:', remainingKeys);
}

console.log('🧹 === LIMPEZA CONCLUÍDA ===');
