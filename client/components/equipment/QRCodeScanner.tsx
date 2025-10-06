import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QRCodeScannerProps {
  onClose?: () => void;
  onScan?: (machineId: string) => void;
}

export function QRCodeScanner({ onClose, onScan }: QRCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedMachineId, setScannedMachineId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    startScanner();
    
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors while searching
          console.log('Scan error:', errorMessage);
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Erro ao aceder à câmara. Verifique as permissões.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    console.log('Scanned:', decodedText);

    // Extract machine ID from URL
    // Expected format: http://localhost:5000/machine/CNC-01
    const match = decodedText.match(/\/machine\/([^/?]+)/);
    
    if (match && match[1]) {
      const machineId = match[1];
      setScannedMachineId(machineId);
      
      // Stop scanner
      await stopScanner();
      setScanning(false);

      // Notify parent or navigate
      if (onScan) {
        onScan(machineId);
      } else {
        // Navigate to machine page
        setTimeout(() => {
          navigate(`/machine/${machineId}`);
        }, 1500);
      }
    } else {
      setError('QR Code inválido. Use um QR code de equipamento FactoryControl.');
    }
  };

  const handleClose = async () => {
    await stopScanner();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl border border-border/40 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-blue-600/10 p-3">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Escanear QR Code</h2>
              <p className="text-sm text-muted-foreground">
                Aponte para o QR code do equipamento
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {!scannedMachineId && !error && (
            <div className="relative">
              <div 
                id="qr-reader" 
                className="rounded-xl overflow-hidden border-4 border-primary/20"
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Posicione o QR code dentro da moldura
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-600">A escanear...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-xl border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
                Erro ao Escanear
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  startScanner();
                }}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Success State */}
          {scannedMachineId && (
            <div className="rounded-xl border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20 p-6 text-center animate-scale-in">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">
                QR Code Detectado!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                Equipamento identificado:
              </p>
              <p className="text-2xl font-bold text-green-600 font-mono">
                {scannedMachineId}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-green-600">A redirecionar...</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!scannedMachineId && !error && (
          <div className="p-6 border-t border-border/40 bg-muted/30">
            <h4 className="text-sm font-semibold mb-2">💡 Dicas:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Mantenha o telemóvel estável</li>
              <li>• Garanta boa iluminação</li>
              <li>• O QR code deve estar centrado</li>
              <li>• Ajuste a distância se necessário</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
