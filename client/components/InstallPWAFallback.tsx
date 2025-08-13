import React, { useState, useEffect } from 'react';
import { Download, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWAFallback() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installMethod, setInstallMethod] = useState<'native' | 'manual' | 'none'>('none');

  useEffect(() => {
    detectPWACapabilities();
  }, []);

  const detectPWACapabilities = () => {
    // Detectar plataforma
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsIOS(iOS);
    setIsStandalone(isStandaloneMode);

    console.log('🔍 PWA Fallback Detection:', {
      iOS,
      isStandalone: isStandaloneMode,
      userAgent: navigator.userAgent,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });

    // Se já estiver instalado, não mostrar
    if (isStandaloneMode) {
      console.log('✅ PWA já instalada');
      return;
    }

    // Escutar evento de instalação nativo (sem Service Worker)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 beforeinstallprompt evento detectado (fallback)');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallMethod('native');
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Para iOS ou Android sem prompt nativo
    if (iOS || !deferredPrompt) {
      setInstallMethod('manual');
      setShowInstallButton(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  };

  const handleInstallClick = async () => {
    console.log('📱 Install PWA Fallback clicked:', installMethod);

    if (deferredPrompt && installMethod === 'native') {
      try {
        console.log('🚀 Usando prompt nativo...');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);

        if (outcome === 'accepted') {
          setShowInstallButton(false);
          localStorage.setItem('pwa-installed-fallback', 'true');
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('❌ Erro no prompt nativo:', error);
        setInstallMethod('manual');
        setShowInstructions(true);
      }
    } else {
      // Método manual
      setShowInstructions(true);
    }
  };

  // Não mostrar se já instalado
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Botão de instalação */}
      {showInstallButton && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-all font-semibold text-sm relative"
            style={{
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
              minHeight: '48px',
              minWidth: '140px'
            }}
          >
            {installMethod === 'native' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>
              {installMethod === 'native' 
                ? '✅ Instalar PWA' 
                : isIOS 
                ? '📱 Adicionar iOS' 
                : '📱 Instalar Manual'
              }
            </span>
          </button>
        </div>
      )}

      {/* Modal de instruções */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-black max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                PWA Sem Service Worker
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-800 mb-2">
                  ⚠️ Service Workers não funcionaram
                </p>
                <p className="text-xs text-orange-700">
                  Tentando instalação alternativa sem cache offline
                </p>
              </div>

              {isIOS ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-blue-800">📱 iOS Safari (Recomendado):</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="font-bold text-blue-600">1.</span>
                      <div>
                        <p className="font-medium">Abra no Safari</p>
                        <p className="text-xs text-blue-600">Chrome iOS não suporta instalação PWA</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="font-bold text-blue-600">2.</span>
                      <p className="font-medium">Toque no botão Partilhar ⬆️</p>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="font-bold text-blue-600">3.</span>
                      <p className="font-medium">Selecione "Adicionar ao Ecrã Principal"</p>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-green-50 rounded">
                      <span className="font-bold text-green-600">✅</span>
                      <p className="font-medium">Confirme "Adicionar"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-green-800">🤖 Android (Múltiplos Métodos):</h3>
                  
                  <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="font-bold text-green-800 mb-2">MÉTODO 1 - Chrome Menu:</p>
                    <div className="text-sm space-y-1">
                      <p>• Toque nos <strong>3 pontos (⋮)</strong> no Chrome</p>
                      <p>• Procure <strong>"Instalar app"</strong> ou <strong>"Adicionar ao ecrã principal"</strong></p>
                      <p>• Toque em <strong>"Instalar"</strong></p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="font-bold text-blue-800 mb-2">MÉTODO 2 - Banner/Ícone:</p>
                    <div className="text-sm space-y-1">
                      <p>• Procure ícone ⬇️ na barra de endereços</p>
                      <p>• Ou aguarde banner automático aparecer</p>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                    <p className="font-bold text-purple-800 mb-2">MÉTODO 3 - Home Screen:</p>
                    <div className="text-sm space-y-1">
                      <p>• Configurações do Android → Apps → Chrome</p>
                      <p>• Ou pressione e segure no ecrã principal</p>
                      <p>• Adicione widget/shortcut para esta página</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Nota:</strong> Mesmo sem Service Workers, a app funcionará como PWA com ícone no ecrã principal.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
