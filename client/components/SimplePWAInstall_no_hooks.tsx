// Versão definitiva sem React hooks - NUNCA usará useState
export function SimplePWAInstall() {
  // Detectar dispositivo de forma segura sem hooks
  const getUserAgent = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        return navigator.userAgent;
      }
    } catch (error) {
      console.warn('Erro ao acessar navigator.userAgent:', error);
    }
    return '';
  };

  const userAgent = getUserAgent();
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);

  // Server-side rendering safety
  if (typeof window === 'undefined') {
    return null;
  }

  // Função de clique sem estado
  const handleClick = () => {
    const message = isIOS 
      ? 'iOS: Safari > Partilhar > Adicionar ao Ecrã Principal'
      : isAndroid 
      ? 'Android: Menu (⋮) > Instalar app'
      : 'Desktop: Procure ícone de instalação na barra de endereços';
    
    alert(`📱 Para instalar esta app:\n\n${message}`);
  };

  // JSX simples sem estado
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleClick}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        type="button"
        title="Instalar PWA"
      >
        📱 PWA
      </button>
    </div>
  );
}

// Export adicional para compatibilidade
export default SimplePWAInstall;
