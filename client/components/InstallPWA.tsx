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
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
          setShowInstallButton(false);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    } else if (isIOS) {
      // Show iOS instructions
      alert(`Para instalar a FactoryControl:
      
1. Toque no botão Partilhar (⬆️) no Safari
2. Selecione "Adicionar ao Ecrã Principal"
3. Toque em "Adicionar"

A app aparecerá no seu ecrã principal!`);
    } else {
      // Manual installation instructions for other browsers
      alert(`Para instalar a FactoryControl:

Chrome/Edge:
• Menu (⋮) → "Instalar FactoryControl"
• Ou URL bar → ícone de instalação

Firefox:
• Menu → "Instalar esta página como app"

A app aparecerá como aplicação nativa!`);
    }
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  if (!showInstallButton) {
    return null;
  }

  return (
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
