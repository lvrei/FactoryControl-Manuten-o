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
      document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show install button for iOS or if no install prompt is available
    if (iOS && !isInStandaloneMode) {
      setShowInstallButton(true);
    }

    // Show install button after a delay if no prompt is detected
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isInStandaloneMode && !iOS) {
        setShowInstallButton(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    console.log('Install button clicked');

    if (deferredPrompt) {
      // Show the install prompt
      try {
        console.log('Showing native install prompt...');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        if (outcome === 'accepted') {
          setShowInstallButton(false);
        }

        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error showing install prompt:', error);
        showManualInstructions();
      }
    } else {
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
          className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-all transform hover:scale-105 font-medium text-sm btn-mobile"
          style={{
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          <Smartphone className="h-5 w-5" />
          <span>
            {isIOS ? 'Adicionar ao Ecrã' : 'Instalar App'}
          </span>
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
                <p className="text-sm text-gray-600">Para instalar no iPhone/iPad:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-600 font-bold">1.</span>
                    <div>
                      <p className="font-medium">Abra no Safari</p>
                      <p className="text-sm text-gray-600">Não funciona no Chrome iOS</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-600 font-bold">2.</span>
                    <div>
                      <p className="font-medium">Toque no botão Partilhar ⬆️</p>
                      <p className="text-sm text-gray-600">Na parte inferior do ecrã</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-600 font-bold">3.</span>
                    <div>
                      <p className="font-medium">Selecione "Adicionar ao Ecrã Principal"</p>
                      <p className="text-sm text-gray-600">Deslize para encontrar a opção</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-green-600 font-bold">✅</span>
                    <div>
                      <p className="font-medium">Toque em "Adicionar"</p>
                      <p className="text-sm text-gray-600">A app aparecerá no ecrã principal</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Para instalar no Android Chrome:</p>
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="font-medium text-orange-800 mb-2">MÉTODO 1 - Menu Chrome:</p>
                    <div className="space-y-2 text-sm">
                      <p>• Toque nos <strong>3 pontos (⋮)</strong> no canto superior direito</p>
                      <p>• Selecione <strong>"Adicionar ao ecrã principal"</strong></p>
                      <p>• Toque em <strong>"Adicionar"</strong></p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-800 mb-2">MÉTODO 2 - Barra de endereços:</p>
                    <div className="space-y-2 text-sm">
                      <p>• Procure o ícone <strong>⬇️</strong> na barra de endereços</p>
                      <p>• Toque nele e siga as instruções</p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-800">✅ A app funcionará como aplicação nativa!</p>
                  </div>
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
