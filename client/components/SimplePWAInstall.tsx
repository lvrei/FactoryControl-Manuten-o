import React, { useState } from 'react';
import { Smartphone, Download, AlertTriangle } from 'lucide-react';

export function SimplePWAInstall() {
  const [showInstructions, setShowInstructions] = useState(false);

  // Detectar dispositivo
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  
  console.log('🔍 SimplePWAInstall - Device detection:', {
    isIOS,
    isAndroid,
    isMobile,
    userAgent: navigator.userAgent
  });

  const handleInstallClick = () => {
    console.log('📱 SimplePWA install clicked');
    setShowInstructions(true);
  };

  return (
    <>
      {/* Botão sempre visível para debug */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-all font-bold text-sm"
          style={{
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
            minHeight: '48px',
            minWidth: '140px'
          }}
        >
          <Smartphone className="h-5 w-5" />
          <span>🚀 PWA DEBUG</span>
        </button>
      </div>

      {/* Botão adicional para mobile */}
      {isMobile && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-all font-bold text-sm"
            style={{
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
              minHeight: '48px',
              minWidth: '140px'
            }}
          >
            <Download className="h-5 w-5" />
            <span>📱 MÓVEL</span>
          </button>
        </div>
      )}

      {/* Modal com instruções simples */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-black">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Instalar PWA
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-gray-100 rounded text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-bold text-blue-800 mb-2">📱 Informações do Dispositivo:</h3>
                <div className="text-sm text-blue-700">
                  <p><strong>iOS:</strong> {isIOS ? 'Sim' : 'Não'}</p>
                  <p><strong>Android:</strong> {isAndroid ? 'Sim' : 'Não'}</p>
                  <p><strong>Móvel:</strong> {isMobile ? 'Sim' : 'Não'}</p>
                  <p><strong>Service Workers:</strong> {'serviceWorker' in navigator ? 'Sim' : 'Não'}</p>
                  <p><strong>HTTPS:</strong> {window.isSecureContext ? 'Sim' : 'Não'}</p>
                </div>
              </div>

              {isIOS ? (
                <div className="p-3 bg-blue-50 rounded">
                  <h3 className="font-bold text-blue-800 mb-2">📱 iOS Safari:</h3>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Abra no Safari (não Chrome)</li>
                    <li>2. Toque no botão Partilhar ⬆️</li>
                    <li>3. Selecione "Adicionar ao Ecrã Principal"</li>
                    <li>4. Toque em "Adicionar"</li>
                  </ol>
                </div>
              ) : isAndroid ? (
                <div className="p-3 bg-green-50 rounded">
                  <h3 className="font-bold text-green-800 mb-2">🤖 Android Chrome:</h3>
                  <ol className="text-sm text-green-700 space-y-1">
                    <li>1. Toque nos 3 pontos (⋮) no Chrome</li>
                    <li>2. Procure "Instalar app" ou "Adicionar ao ecrã principal"</li>
                    <li>3. Toque em "Instalar"</li>
                  </ol>
                  <div className="mt-2 p-2 bg-yellow-100 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Alternativa:</strong> Procure ícone ⬇️ na barra de endereços
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-bold text-gray-800 mb-2">💻 Desktop:</h3>
                  <p className="text-sm text-gray-700">
                    No Chrome desktop, procure o ícone de instalação na barra de endereços ou 
                    vá ao menu → "Instalar FactoryControl..."
                  </p>
                </div>
              )}

              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <h3 className="font-bold text-red-800 mb-2">⚠️ Se não funcionar:</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Atualize o navegador</li>
                  <li>• Teste em Chrome ou Edge</li>
                  <li>• Limpe cache e cookies</li>
                  <li>• Use wifi estável</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
