// Componente PWA simplificado - versão sem hooks
import { Smartphone } from 'lucide-react';

export function SimplePWAInstall() {
  // Detectar dispositivo de forma segura
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
  const isMobile = isIOS || isAndroid;

  if (typeof window === 'undefined') {
    return null; // Server-side rendering safety
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => {
          alert(`📱 Para instalar esta app:\n\n${
            isIOS ? 'iOS: Safari > Partilhar > Adicionar ao Ecrã Principal' :
            isAndroid ? 'Android: Menu (⋮) > Instalar app' :
            'Desktop: Procure ícone de instalação na barra de endereços'
          }`);
        }}
        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm"
        style={{ minHeight: '40px' }}
        type="button"
      >
        <Smartphone className="h-4 w-4" />
        <span>PWA</span>
      </button>
    </div>
  );
}
