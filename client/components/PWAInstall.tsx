import React, { useState, useEffect } from 'react';
import { Download, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PWAInstallProps {
  className?: string;
}

export function PWAInstall({ className }: PWAInstallProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar se PWA é suportado
    setIsSupported('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window);

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listener para evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    // Listener para quando o app é instalado
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log('✅ PWA instalado com sucesso');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Mostrar prompt de instalação
      deferredPrompt.prompt();
      
      // Aguardar escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Usuário aceitou instalar o PWA');
      } else {
        console.log('❌ Usuário rejeitou instalar o PWA');
      }
      
      // Limpar prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('❌ Erro ao instalar PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Salvar preferência do usuário
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Não mostrar se não é suportado, já está instalado, ou foi dispensado
  if (!isSupported || isInstalled || !showInstallPrompt) {
    return null;
  }

  // Verificar se foi dispensado anteriormente
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 max-w-sm",
      "bg-card border rounded-lg shadow-lg",
      "animate-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
            <Download className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Instalar FactoryControl
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Instale o app para acesso rápido e funcionamento offline
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3 w-3" />
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook para verificar status PWA
export function usePWAStatus() {
  const [status, setStatus] = useState({
    isInstalled: false,
    isSupported: false,
    isOnline: navigator.onLine,
    swRegistration: null as ServiceWorkerRegistration | null
  });

  useEffect(() => {
    // Verificar suporte PWA
    const isSupported = 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
    
    // Verificar se está instalado
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    setStatus(prev => ({
      ...prev,
      isSupported,
      isInstalled
    }));

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration);
          setStatus(prev => ({ ...prev, swRegistration: registration }));
          
          // Verificar por atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 Nova versão do app disponível');
                  // Aqui poderia mostrar notificação de atualização
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Erro ao registrar Service Worker:', error);
        });
    }

    // Listeners para status de rede
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

// Componente de status PWA para debug
export function PWAStatus() {
  const { isInstalled, isSupported, isOnline, swRegistration } = usePWAStatus();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 bg-card border rounded-lg p-3 text-xs max-w-xs">
      <h4 className="font-semibold mb-2">PWA Status (Dev)</h4>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isSupported ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <X className="h-3 w-3 text-red-600" />
          )}
          <span>PWA Suportado: {isSupported ? 'Sim' : 'Não'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-yellow-600" />
          )}
          <span>Instalado: {isInstalled ? 'Sim' : 'Não'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <X className="h-3 w-3 text-red-600" />
          )}
          <span>Online: {isOnline ? 'Sim' : 'Não'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {swRegistration ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <X className="h-3 w-3 text-red-600" />
          )}
          <span>SW: {swRegistration ? 'Ativo' : 'Inativo'}</span>
        </div>
      </div>
    </div>
  );
}
