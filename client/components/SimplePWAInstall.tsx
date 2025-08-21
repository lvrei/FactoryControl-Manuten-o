// VERSÃO NOVA - NUNCA TEVE HOOKS - CACHE SAFE
// Este arquivo foi completamente reescrito para evitar problemas de cache

function SimplePWAInstall() {
  // Retorna null sempre - componente desativado por problemas de cache
  return null;
}

// Export por segurança
export { SimplePWAInstall };
export default SimplePWAInstall;

// Log para debug
console.log('🚫 SimplePWAInstall: Componente desativado por segurança');
