import { AlertTriangle, WifiOff, Server } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_URL } from "@/config/api";

export function ServerConnectionError() {
  const isCapacitor = !!(window as any).Capacitor;
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-lg font-bold">
            Sem Ligação ao Servidor
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">
              Não foi possível conectar ao servidor backend.
            </p>
            
            {isCapacitor && !API_URL && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  ⚠️ Configuração Necessária
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  A app precisa do URL do servidor configurado. 
                  Ver ficheiro: <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">CONFIGURAR-API-ANDROID.md</code>
                </p>
              </div>
            )}
            
            {API_URL && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Server className="h-3 w-3" />
                  <span className="font-mono">{API_URL}</span>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="bg-card rounded-lg p-4 border space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Possíveis Causas:
          </h3>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Servidor não está a correr</li>
            <li>• URL da API não configurado (ficheiro .env)</li>
            <li>• Dispositivo não está na mesma rede WiFi</li>
            <li>• Firewall a bloquear a conexão</li>
            <li>• IP ou porta incorretos</li>
          </ul>
        </div>

        {isCapacitor && (
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm text-blue-800 dark:text-blue-200 mb-2">
              📱 App Android
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Para configurar a conexão, consulte o guia:
            </p>
            <code className="block mt-2 text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded font-mono">
              CONFIGURAR-API-ANDROID.md
            </code>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
