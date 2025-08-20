import { useState, useEffect } from 'react';
import { 
  Printer, 
  Usb, 
  CheckCircle, 
  XCircle, 
  Settings, 
  RefreshCw, 
  TestTube,
  Wifi,
  AlertTriangle,
  Info
} from 'lucide-react';
import { zebraUSBService } from '@/services/zebraUSBService';
import { cn } from '@/lib/utils';

interface PrinterSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterConfigured?: (printerInfo: any) => void;
}

export function PrinterSetup({ isOpen, onClose, onPrinterConfigured }: PrinterSetupProps) {
  const [isWebUSBSupported, setIsWebUSBSupported] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<{
    connected: boolean;
    name?: string;
    serialNumber?: string;
  }>({ connected: false });
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableDevices, setAvailableDevices] = useState<USBDevice[]>([]);
  const [networkPrinterIP, setNetworkPrinterIP] = useState('192.168.1.100');
  const [connectionType, setConnectionType] = useState<'usb' | 'network'>('usb');

  useEffect(() => {
    if (isOpen) {
      checkWebUSBSupport();
      checkPrinterStatus();
      loadAvailableDevices();
    }
  }, [isOpen]);

  const checkWebUSBSupport = async () => {
    const supported = await zebraUSBService.isWebUSBSupported();
    setIsWebUSBSupported(supported);
  };

  const checkPrinterStatus = async () => {
    const status = await zebraUSBService.getPrinterStatus();
    setPrinterStatus(status);
  };

  const loadAvailableDevices = async () => {
    try {
      const devices = await zebraUSBService.getConnectedDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
    }
  };

  const handleConnectUSB = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const printer = await zebraUSBService.requestPrinterAccess();
      if (printer) {
        await checkPrinterStatus();
        setTestResult({ success: true, message: `Conectado com sucesso à ${printer.name}!` });
        onPrinterConfigured?.(printer);
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro ao conectar com a impressora' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await zebraUSBService.disconnect();
      await checkPrinterStatus();
      setTestResult({ success: true, message: 'Impressora desconectada com sucesso' });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro ao desconectar' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const result = await zebraUSBService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro no teste de impressão' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([
      checkPrinterStatus(),
      loadAvailableDevices()
    ]);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-3">
            <Printer className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Configuração da Impressora Zebra</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* WebUSB Support Check */}
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-lg border",
            isWebUSBSupported 
              ? "bg-green-50 border-green-200 text-green-800" 
              : "bg-orange-50 border-orange-200 text-orange-800"
          )}>
            {isWebUSBSupported ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            <div className="flex-1">
              <div className="font-medium">
                {isWebUSBSupported ? 'WebUSB Suportado' : 'WebUSB Não Suportado'}
              </div>
              <div className="text-sm">
                {isWebUSBSupported 
                  ? 'Este navegador suporta conexão direta USB com impressoras'
                  : 'Use Chrome/Edge para conectar diretamente via USB, ou configure impressão por rede'
                }
              </div>
            </div>
          </div>

          {/* Connection Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Tipo de Conexão</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setConnectionType('usb')}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-lg transition-colors",
                  connectionType === 'usb' 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                disabled={!isWebUSBSupported}
              >
                <Usb className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">USB Direto</div>
                  <div className="text-xs text-gray-500">Conexão direta via cabo USB</div>
                </div>
              </button>
              
              <button
                onClick={() => setConnectionType('network')}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-lg transition-colors",
                  connectionType === 'network' 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <Wifi className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Rede IP</div>
                  <div className="text-xs text-gray-500">Impressora na rede local</div>
                </div>
              </button>
            </div>
          </div>

          {/* USB Connection Section */}
          {connectionType === 'usb' && isWebUSBSupported && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Conexão USB</h3>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Atualizar
                </button>
              </div>

              {/* Current Status */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-lg border",
                printerStatus.connected 
                  ? "bg-green-50 border-green-200" 
                  : "bg-gray-50 border-gray-200"
              )}>
                {printerStatus.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {printerStatus.connected ? 'Impressora Conectada' : 'Nenhuma Impressora Conectada'}
                  </div>
                  {printerStatus.connected && (
                    <div className="text-sm text-gray-600">
                      {printerStatus.name}
                      {printerStatus.serialNumber && ` (S/N: ${printerStatus.serialNumber})`}
                    </div>
                  )}
                </div>
                {printerStatus.connected && (
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                )}
              </div>

              {/* Available Devices */}
              {availableDevices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Dispositivos Zebra Detectados</label>
                  <div className="space-y-2">
                    {availableDevices.map((device, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{device.productName || 'Impressora Zebra'}</div>
                          <div className="text-sm text-gray-500">
                            USB: {device.vendorId.toString(16)}:{device.productId.toString(16)}
                            {device.serialNumber && ` | S/N: ${device.serialNumber}`}
                          </div>
                        </div>
                        <button
                          onClick={() => zebraUSBService.connectToPrinter(device).then(checkPrinterStatus)}
                          disabled={loading}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Conectar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!printerStatus.connected ? (
                  <button
                    onClick={handleConnectUSB}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Usb className="h-4 w-4" />
                    {loading ? 'Conectando...' : 'Conectar Impressora USB'}
                  </button>
                ) : (
                  <button
                    onClick={handleTestPrint}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <TestTube className="h-4 w-4" />
                    {loading ? 'Testando...' : 'Teste de Impressão'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Network Connection Section */}
          {connectionType === 'network' && (
            <div className="space-y-4">
              <h3 className="font-medium">Configuração de Rede</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Endereço IP da Impressora</label>
                <input
                  type="text"
                  value={networkPrinterIP}
                  onChange={(e) => setNetworkPrinterIP(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Insira o endereço IP da impressora na rede local (porta 9100)
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Configuração de Rede</div>
                    <ul className="space-y-1 text-xs">
                      <li>• Configure a impressora Zebra para conectar à sua rede WiFi/Ethernet</li>
                      <li>• Anote o endereço IP atribuído à impressora</li>
                      <li>• Certifique-se de que a porta 9100 está aberta</li>
                      <li>• Esta opção requer configuração no servidor backend</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResult && (
            <div className={cn(
              "flex items-center gap-3 p-4 rounded-lg border",
              testResult.success 
                ? "bg-green-50 border-green-200 text-green-800" 
                : "bg-red-50 border-red-200 text-red-800"
            )}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {testResult.success ? 'Sucesso!' : 'Erro'}
                </div>
                <div className="text-sm">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Help Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <div className="font-medium mb-1">Informações Importantes</div>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Dimensões:</strong> Etiquetas otimizadas para 105.5x150mm</li>
                  <li>• <strong>Navegador:</strong> Use Chrome ou Edge para conexão USB</li>
                  <li>• <strong>Permissões:</strong> Aceite o acesso USB quando solicitado</li>
                  <li>• <strong>Cabo:</strong> Certifique-se de usar cabo USB de dados (não só carregamento)</li>
                  <li>• <strong>Drivers:</strong> Instale os drivers Zebra no computador se necessário</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
