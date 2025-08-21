// Versão de emergência sem React hooks
export function SimplePWAInstallEmergency() {
  // Função totalmente independente do React
  const createPWAButton = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    // Criar elemento sem JSX
    const container = document.createElement('div');
    container.className = 'fixed bottom-4 right-4 z-50';
    
    const button = document.createElement('button');
    button.className = 'flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm';
    button.style.minHeight = '40px';
    button.type = 'button';
    button.innerHTML = '📱 PWA';
    
    button.onclick = () => {
      alert('📱 Para instalar: procure o ícone de instalação no navegador');
    };
    
    container.appendChild(button);
    return container;
  };

  // Retornar JSX simples
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => alert('📱 Instalar: procure ícone no navegador')}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
        type="button"
      >
        📱 PWA
      </button>
    </div>
  );
}
