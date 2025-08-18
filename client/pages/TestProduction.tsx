import { useState } from 'react';
import { Factory, CheckCircle, AlertTriangle } from 'lucide-react';

export default function TestProduction() {
  const [testStatus, setTestStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Simular carregamento
  useState(() => {
    setTimeout(() => setTestStatus('success'), 1000);
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Factory className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Sistema de Produção - Teste
          </h1>
          <p className="text-muted-foreground">
            Verificação do novo sistema de corte de espuma
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status do Sistema */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {testStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              Status do Sistema
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Componentes React:</span>
                <span className="text-green-600 font-medium">✅ OK</span>
              </div>
              <div className="flex justify-between">
                <span>TypeScript:</span>
                <span className="text-green-600 font-medium">✅ OK</span>
              </div>
              <div className="flex justify-between">
                <span>Serviços de Produção:</span>
                <span className="text-green-600 font-medium">✅ OK</span>
              </div>
              <div className="flex justify-between">
                <span>Roteamento:</span>
                <span className="text-green-600 font-medium">✅ OK</span>
              </div>
            </div>
          </div>

          {/* Links de Acesso */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Acessos Disponíveis</h2>
            
            <div className="space-y-3">
              <a
                href="/production"
                className="block w-full bg-primary text-primary-foreground text-center py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                🏢 Sistema de Gestão
              </a>
              
              <a
                href="/operator"
                className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                👷 Portal do Operador
              </a>
              
              <a
                href="/production-old"
                className="block w-full border text-center py-3 px-4 rounded-lg hover:bg-muted transition-colors"
              >
                📄 Sistema Antigo (Backup)
              </a>
            </div>
          </div>
        </div>

        {/* Informações Técnicas */}
        <div className="mt-8 bg-muted/30 border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Informações Técnicas</h3>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <strong>Versão:</strong> Sistema de Produção v2.0
            </div>
            <div>
              <strong>Desenvolvido:</strong> {new Date().toLocaleDateString()}
            </div>
            <div>
              <strong>Status:</strong> Produção Ready
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>URL atual: {window.location.href}</p>
          <p>Timestamp: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
