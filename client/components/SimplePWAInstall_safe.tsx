import React from 'react';
import { Smartphone } from 'lucide-react';

export function SimplePWAInstallSafe() {
  const [showInstructions, setShowInstructions] = React.useState(false);

  // Verificação completa de ambiente
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }

  if (typeof React === 'undefined' || !React.useState) {
    console.error('React não está disponível');
    return null;
  }

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

  const handleInstallClick = () => {
    try {
      setShowInstructions(true);
    } catch (error) {
      console.error('Erro ao abrir instruções:', error);
    }
  };

  const handleClose = () => {
    try {
      setShowInstructions(false);
    } catch (error) {
      console.error('Erro ao fechar instruções:', error);
    }
  };

  try {
    return (
      <div className="pwa-install-container">
        {/* Botão PWA */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all text-sm"
            style={{ minHeight: '40px' }}
            type="button"
          >
            <Smartphone className="h-4 w-4" />
            <span>PWA</span>
          </button>
        </div>

        {/* Modal de instruções */}
        {showInstructions && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 text-black">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">📱 Instalar App</h2>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-gray-100 rounded text-xl"
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {isIOS && (
                  <div className="p-3 bg-blue-50 rounded">
                    <h3 className="font-bold text-blue-800 mb-2">📱 iOS:</h3>
                    <ol className="text-sm text-blue-700 space-y-1">
                      <li>1. Abra no Safari</li>
                      <li>2. Toque em Partilhar ⬆️</li>
                      <li>3. "Adicionar ao Ecrã Principal"</li>
                    </ol>
                  </div>
                )}

                {isAndroid && (
                  <div className="p-3 bg-green-50 rounded">
                    <h3 className="font-bold text-green-800 mb-2">🤖 Android:</h3>
                    <ol className="text-sm text-green-700 space-y-1">
                      <li>1. Toque nos 3 pontos (⋮)</li>
                      <li>2. "Instalar app"</li>
                    </ol>
                  </div>
                )}

                {!isMobile && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h3 className="font-bold text-gray-800 mb-2">💻 Desktop:</h3>
                    <p className="text-sm text-gray-700">
                      Procure ícone de instalação na barra de endereços
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                type="button"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Erro no render do SimplePWAInstall:', error);
    return <div className="fixed bottom-4 right-4 z-50 p-2 bg-red-500 text-white text-xs rounded">PWA Error</div>;
  }
}
