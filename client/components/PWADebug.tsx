import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';

interface PWACapabilities {
  serviceWorker: boolean;
  installPrompt: boolean;
  notifications: boolean;
  camera: boolean;
  geolocation: boolean;
  storage: boolean;
  standalone: boolean;
  webAppManifest: boolean;
  isSecureContext: boolean;
  isOnline: boolean;
  platform: string;
  userAgent: string;
}

interface ManifestData {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  icons?: Array<{ src: string; sizes: string; type: string }>;
}

export function PWADebug() {
  const [capabilities, setCapabilities] = useState<PWACapabilities | null>(null);
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [swStatus, setSwStatus] = useState<string>('Verificando...');
  const [installable, setInstallable] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  useEffect(() => {
    checkPWACapabilities();
    checkManifest();
    checkServiceWorker();
    checkInstallability();
  }, []);

  const checkPWACapabilities = () => {
    const caps: PWACapabilities = {
      serviceWorker: 'serviceWorker' in navigator,
      installPrompt: 'BeforeInstallPromptEvent' in window,
      notifications: 'Notification' in window,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in (navigator.mediaDevices || {}),
      geolocation: 'geolocation' in navigator,
      storage: 'localStorage' in window,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      webAppManifest: document.querySelector('link[rel="manifest"]') !== null,
      isSecureContext: window.isSecureContext,
      isOnline: navigator.onLine,
      platform: navigator.platform,
      userAgent: navigator.userAgent
    };
    
    setCapabilities(caps);
    console.log('🔍 PWA Capabilities:', caps);
  };

  const checkManifest = async () => {
    try {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const manifestData = await response.json();
      setManifest(manifestData);
      console.log('✅ Manifest carregado:', manifestData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setManifestError(errorMsg);
      console.error('❌ Erro ao carregar manifest:', error);
    }
  };

  const checkServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('Service Workers não suportados');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        setSwStatus(`Registrado (scope: ${registration.scope})`);
        console.log('✅ Service Worker registrado:', registration);
      } else {
        setSwStatus('Não registrado');
        console.log('❌ Service Worker não registrado');
      }
    } catch (error) {
      setSwStatus(`Erro: ${error}`);
      console.error('❌ Erro Service Worker:', error);
    }
  };

  const checkInstallability = () => {
    // Verifica se já está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setInstallable(false);
      return;
    }

    // Escuta eventos de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 beforeinstallprompt detectado');
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verifica se já foi mostrado
    const hasPrompt = localStorage.getItem('pwa-prompt-shown');
    if (!hasPrompt) {
      setTimeout(() => setInstallable(true), 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  };

  const StatusIcon = ({ status }: { status: boolean }) => (
    status ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />
  );

  const getDeviceType = () => {
    if (!capabilities) return 'Desconhecido';
    
    const ua = capabilities.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows Phone/.test(ua)) return 'Windows Phone';
    return 'Desktop';
  };

  const getBrowserType = () => {
    if (!capabilities) return 'Desconhecido';
    
    const ua = capabilities.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    return 'Outro';
  };

  if (!capabilities) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span>Verificando capacidades PWA...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão de toggle debug */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm hover:bg-secondary/80"
      >
        <AlertCircle className="h-4 w-4" />
        {showDebug ? 'Ocultar' : 'Mostrar'} Diagnóstico PWA
      </button>

      {showDebug && (
        <div className="space-y-6 p-4 bg-card border rounded-lg">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Diagnóstico PWA
          </h3>

          {/* Informações do dispositivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Dispositivo</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-mono">{getDeviceType()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Navegador:</span>
                  <span className="font-mono">{getBrowserType()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plataforma:</span>
                  <span className="font-mono text-xs">{capabilities.platform}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Conectividade</h4>
              <div className="flex items-center gap-2">
                {capabilities.isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Capacidades PWA */}
          <div className="space-y-3">
            <h4 className="font-medium">Capacidades PWA</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Service Worker</span>
                <StatusIcon status={capabilities.serviceWorker} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Manifest</span>
                <StatusIcon status={capabilities.webAppManifest} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Install Prompt</span>
                <StatusIcon status={capabilities.installPrompt} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>HTTPS</span>
                <StatusIcon status={capabilities.isSecureContext} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Notificações</span>
                <StatusIcon status={capabilities.notifications} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Câmara</span>
                <StatusIcon status={capabilities.camera} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Localização</span>
                <StatusIcon status={capabilities.geolocation} />
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span>Storage</span>
                <StatusIcon status={capabilities.storage} />
              </div>
            </div>
          </div>

          {/* Service Worker */}
          <div className="space-y-2">
            <h4 className="font-medium">Service Worker</h4>
            <div className="p-3 bg-muted/50 rounded text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-mono">{swStatus}</span>
              </div>
            </div>
          </div>

          {/* Manifest */}
          <div className="space-y-2">
            <h4 className="font-medium">Web App Manifest</h4>
            {manifestError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Erro:</strong> {manifestError}
              </div>
            ) : manifest ? (
              <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Nome:</span>
                  <span className="font-mono">{manifest.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nome Curto:</span>
                  <span className="font-mono">{manifest.short_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Display:</span>
                  <span className="font-mono">{manifest.display}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start URL:</span>
                  <span className="font-mono">{manifest.start_url}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ícones:</span>
                  <span className="font-mono">{manifest.icons?.length || 0}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded text-sm">
                Carregando...
              </div>
            )}
          </div>

          {/* Instalabilidade */}
          <div className="space-y-2">
            <h4 className="font-medium">Instalabilidade</h4>
            <div className="p-3 bg-muted/50 rounded text-sm">
              <div className="flex justify-between items-center">
                <span>PWA Instalável:</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={installable} />
                  <span>{installable ? 'Sim' : 'Não'}</span>
                </div>
              </div>
              {capabilities.standalone && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
                  ✅ App já instalado (modo standalone)
                </div>
              )}
            </div>
          </div>

          {/* Recomendações */}
          <div className="space-y-2">
            <h4 className="font-medium">Recomendações</h4>
            <div className="space-y-2 text-sm">
              {!capabilities.isSecureContext && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                  ⚠️ PWA requer HTTPS em produção
                </div>
              )}
              {!capabilities.serviceWorker && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                  ⚠️ Service Workers não suportados neste navegador
                </div>
              )}
              {getDeviceType() === 'iOS' && getBrowserType() !== 'Safari' && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                  💡 No iOS, use o Safari para instalar PWAs
                </div>
              )}
              {!capabilities.installPrompt && getDeviceType() === 'Android' && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                  💡 No Android Chrome, use o menu (⋮) → "Instalar app"
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
