import React, { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa');

    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Enhanced detection for mobile browsers
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;

    console.log('PWA Detection:', {
      isStandalone: isInStandaloneMode,
      iOS,
      isMobile,
      isChrome,
      isSafari,
      userAgent: navigator.userAgent
    });

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Always show install button on mobile if not standalone
    if (!isInStandaloneMode && isMobile) {
      setShowInstallButton(true);
    }

    // Check if already shown install prompt
    const hasShownPrompt = localStorage.getItem('pwa-prompt-shown');
    const isInstalled = localStorage.getItem('pwa-installed');

    if (!isInstalled && !hasShownPrompt && !isInStandaloneMode) {
      // Show install button after a shorter delay
      const timer = setTimeout(() => {
        setShowInstallButton(true);
        localStorage.setItem('pwa-prompt-shown', 'true');
      }, 1000);

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    console.log('🔘 Install button clicked');
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      hasPrompt: !!deferredPrompt,
      isIOS,
      screen: { width: screen.width, height: screen.height }
    });

    if (deferredPrompt) {
      // Show the native install prompt
      try {
        console.log('🚀 Showing native install prompt...');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`👤 User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
          console.log('✅ User accepted PWA installation');
          setShowInstallButton(false);
          localStorage.setItem('pwa-installed', 'true');
        } else {
          console.log('❌ User dismissed PWA installation');
        }

        setDeferredPrompt(null);
      } catch (error) {
        console.error('💥 Error showing install prompt:', error);
        console.log('🔄 Falling back to manual instructions');
        showManualInstructions();
      }
    } else {
      console.log('📖 No native prompt available, showing manual instructions');
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    setShowInstructions(true);
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  if (!showInstallButton) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleInstallClick}
          className="pwa-install-btn animate-pwa-pulse flex items-center gap-2 px-4 py-3 text-white rounded-lg transition-all transform hover:scale-105 font-semibold text-sm btn-mobile relative overflow-hidden"
          style={{
            minHeight: '48px',
            minWidth: '120px'
          }}
        >
          {/* Efeito de brilho */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer"></div>

          <Smartphone className="h-6 w-6 drop-shadow-sm relative z-10" />
          <span className="drop-shadow-sm relative z-10">
            {isIOS ? '+ Ecrã Principal' : '📱 Instalar App'}
          </span>

          {/* Badge de notificação */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-bounce-soft"></div>
        </button>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-black">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">📱 Instalar FactoryControl</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-100 rounded-lg">
                  <h3 className="font-bold text-lg text-blue-800 mb-2">📱 iOS (iPhone/iPad)</h3>
                  <p className="text-sm text-blue-700">Instalar como aplicação nativa</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 font-bold text-lg">1.</span>
                    <div>
                      <p className="font-semibold text-blue-800">Abra no Safari</p>
                      <p className="text-sm text-blue-600">⚠️ NÃO funciona no Chrome/Firefox iOS</p>
                      <p className="text-xs text-blue-500 mt-1">Copie o link para o Safari se necessário</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 font-bold text-lg">2.</span>
                    <div>
                      <p className="font-semibold text-blue-800">Toque no botão Partilhar</p>
                      <p className="text-sm text-blue-600">📤 Ícone na parte inferior do Safari</p>
                      <div className="mt-2 p-2 bg-blue-100 rounded text-center">
                        <span className="text-2xl">⬆️</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <span className="text-blue-600 font-bold text-lg">3.</span>
                    <div>
                      <p className="font-semibold text-blue-800">"Adicionar ao Ecrã Principal"</p>
                      <p className="text-sm text-blue-600">Deslize para baixo na lista de opções</p>
                      <div className="mt-2 p-2 bg-blue-100 rounded text-center">
                        <span className="text-xl">➕🏠</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <span className="text-green-600 font-bold text-lg">✅</span>
                    <div>
                      <p className="font-semibold text-green-800">Confirme "Adicionar"</p>
                      <p className="text-sm text-green-600">A app aparecerá no ecrã principal como app nativa!</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-100 rounded-lg">
                  <h3 className="font-bold text-lg text-green-800 mb-2">🤖 Android Chrome</h3>
                  <p className="text-sm text-green-700">Múltiplas formas de instalar</p>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                    <p className="font-bold text-orange-800 mb-3 text-lg">🔹 MÉTODO 1 - Menu Chrome</p>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <span className="bg-orange-200 px-2 py-1 rounded font-mono">⋮</span>
                        Toque nos <strong>3 pontos verticais</strong> (canto superior direito)
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="bg-orange-200 px-2 py-1 rounded">📱</span>
                        Procure <strong>"Instalar app"</strong> ou <strong>"Adicionar ao ecrã principal"</strong>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="bg-orange-200 px-2 py-1 rounded">✅</span>
                        Toque em <strong>"Instalar"</strong> ou <strong>"Adicionar"</strong>
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="font-bold text-blue-800 mb-3 text-lg">🔹 MÉTODO 2 - Banner Automático</p>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <span className="bg-blue-200 px-2 py-1 rounded">⬇️</span>
                        Procure <strong>banner/ícone de instalação</strong> na barra de endereços
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="bg-blue-200 px-2 py-1 rounded">📲</span>
                        Pode aparecer automaticamente em alguns segundos
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                    <p className="font-bold text-purple-800 mb-3 text-lg">🔹 MÉTODO 3 - Configurações Chrome</p>
                    <div className="space-y-2 text-sm">
                      <p>• Abra as <strong>Configurações do Chrome</strong></p>
                      <p>• Procure por <strong>"Sites"</strong> ou <strong>"Aplicações web"</strong></p>
                      <p>• Adicione manualmente este site</p>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="font-bold text-green-800 text-center text-lg">🎉 Sucesso!</p>
                    <p className="text-sm text-green-700 text-center mt-2">
                      A app funcionará como aplicação nativa no Android!
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Dica:</strong> Se nenhum método funcionar, tente atualizar o Chrome ou reiniciar o navegador.
                  </p>
                </div>
              </div>
            )}

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

// Hook to check PWA status
export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if app is installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsInstalled(isInStandaloneMode);

    // Check if app is installable
    const handleBeforeInstallPrompt = (e: Event) => {
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return { isInstalled, isInstallable };
}
