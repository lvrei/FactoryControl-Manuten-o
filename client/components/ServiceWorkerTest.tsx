import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export function ServiceWorkerTest() {
  const [testResults, setTestResults] = useState<{
    navigator: boolean;
    swProperty: boolean;
    registerMethod: boolean;
    actualTest: string;
    browserInfo: string;
    securityContext: boolean;
    protocol: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const runDetailedTest = async () => {
    setTesting(true);
    const results: any = {};

    // Test 1: Navigator exists
    results.navigator = typeof navigator !== 'undefined';
    console.log('✅ Navigator exists:', results.navigator);

    // Test 2: ServiceWorker property exists
    results.swProperty = 'serviceWorker' in navigator;
    console.log('🔍 ServiceWorker in navigator:', results.swProperty);

    // Test 3: Register method exists
    results.registerMethod = results.swProperty && typeof navigator.serviceWorker?.register === 'function';
    console.log('📝 Register method exists:', results.registerMethod);

    // Test 4: Security context
    results.securityContext = window.isSecureContext;
    results.protocol = location.protocol;
    console.log('🔒 Secure context:', results.securityContext, 'Protocol:', results.protocol);

    // Test 5: Browser info
    results.browserInfo = navigator.userAgent;
    console.log('🌐 User Agent:', results.browserInfo);

    // Test 6: Actual registration attempt
    if (results.registerMethod) {
      try {
        // Create a simple service worker inline
        const swCode = `
          console.log('🧪 Test Service Worker loaded');
          self.addEventListener('install', () => {
            console.log('📦 Test SW installed');
            self.skipWaiting();
          });
          self.addEventListener('activate', () => {
            console.log('🚀 Test SW activated');
          });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        const registration = await navigator.serviceWorker.register(swUrl);
        results.actualTest = `✅ SUCCESS: ${registration.scope}`;
        console.log('🎉 Service Worker registration successful:', registration);
        
        // Cleanup
        URL.revokeObjectURL(swUrl);
        await registration.unregister();
        
      } catch (error: any) {
        results.actualTest = `❌ ERROR: ${error.message}`;
        console.error('💥 Service Worker registration failed:', error);
      }
    } else {
      results.actualTest = '❌ Cannot test - method not available';
    }

    setTestResults(results);
    setTesting(false);
  };

  useEffect(() => {
    runDetailedTest();
  }, []);

  const StatusIcon = ({ status }: { status: boolean }) => (
    status ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  );

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Teste Específico Service Worker
        </h3>
        <button
          onClick={runDetailedTest}
          disabled={testing}
          className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {testing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {testing ? 'Testando...' : 'Testar Novamente'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-3">
          {/* Resultados dos testes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Navigator disponível</span>
              <StatusIcon status={testResults.navigator} />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>ServiceWorker property</span>
              <StatusIcon status={testResults.swProperty} />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Register method</span>
              <StatusIcon status={testResults.registerMethod} />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <span>Contexto seguro</span>
              <StatusIcon status={testResults.securityContext} />
            </div>
          </div>

          {/* Informações detalhadas */}
          <div className="space-y-2">
            <div className="p-3 bg-muted/50 rounded">
              <h4 className="font-medium mb-2">Protocolo</h4>
              <code className="text-xs bg-background p-1 rounded">{testResults.protocol}</code>
            </div>

            <div className="p-3 bg-muted/50 rounded">
              <h4 className="font-medium mb-2">Teste de Registro</h4>
              <div className={`text-xs p-2 rounded ${
                testResults.actualTest.includes('SUCCESS') 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {testResults.actualTest}
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded">
              <h4 className="font-medium mb-2">Navegador</h4>
              <div className="text-xs bg-background p-2 rounded break-all">
                {testResults.browserInfo}
              </div>
            </div>
          </div>

          {/* Análise do problema */}
          <div className="p-3 border-l-4 border-orange-400 bg-orange-50 rounded">
            <h4 className="font-medium text-orange-800 mb-2">🔍 Análise:</h4>
            <div className="text-sm text-orange-700 space-y-1">
              {!testResults.swProperty && (
                <p>• ServiceWorker não está disponível no navegador</p>
              )}
              {!testResults.registerMethod && (
                <p>• Método register() não está disponível</p>
              )}
              {!testResults.securityContext && (
                <p>• Contexto não é seguro (HTTPS necessário)</p>
              )}
              {testResults.protocol === 'http:' && (
                <p>• HTTP detectado - PWA requer HTTPS em produção</p>
              )}
              {testResults.actualTest.includes('ERROR') && (
                <p>• Falha no registro real do Service Worker</p>
              )}
            </div>
          </div>

          {/* Recomendações específicas */}
          <div className="p-3 border-l-4 border-blue-400 bg-blue-50 rounded">
            <h4 className="font-medium text-blue-800 mb-2">💡 Soluções:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              {!testResults.swProperty && (
                <>
                  <p>• Atualize o navegador para versão mais recente</p>
                  <p>• Teste em Chrome, Edge ou Samsung Internet</p>
                  <p>• Verifique se Service Workers não foram desativados</p>
                </>
              )}
              {!testResults.securityContext && (
                <p>• Acesse via HTTPS ou localhost para desenvolvimento</p>
              )}
              <p>• Use a instalação PWA Fallback (botão verde) como alternativa</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
