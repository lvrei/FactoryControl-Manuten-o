import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, QrCode } from 'lucide-react';

interface QRCodeGeneratorProps {
  equipmentId: string;
  equipmentName: string;
  size?: number;
  showControls?: boolean;
}

export function QRCodeGenerator({ 
  equipmentId, 
  equipmentName, 
  size = 200,
  showControls = true 
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate URL that will be encoded in QR code
  const qrValue = `${window.location.origin}/machine/${equipmentId}`;

  const downloadQRCode = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `qrcode-${equipmentId}.png`;
    link.click();
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${equipmentName}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 3px solid #2563eb;
              border-radius: 16px;
              padding: 40px;
              background: white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .qr-image {
              border: 8px solid #f3f4f6;
              border-radius: 12px;
              margin: 20px 0;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 10px;
            }
            .equipment-id {
              font-size: 24px;
              color: #2563eb;
              font-weight: bold;
              margin-bottom: 20px;
              font-family: 'Courier New', monospace;
            }
            .instructions {
              font-size: 14px;
              color: #64748b;
              margin-top: 20px;
              line-height: 1.6;
            }
            .logo {
              font-size: 20px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 20px;
            }
            @media print {
              body {
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="logo">🏭 FactoryControl</div>
            <div class="title">Equipamento</div>
            <div class="equipment-id">${equipmentId}</div>
            <img src="${dataUrl}" alt="QR Code" class="qr-image" />
            <div class="title">${equipmentName}</div>
            <div class="instructions">
              <strong>📱 Escanear para aceder:</strong><br>
              • Informações da máquina<br>
              • Histórico de manutenção<br>
              • Sensores e alertas<br>
              • Registar nova manutenção
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={qrRef}
        className="rounded-xl border-4 border-primary/20 p-4 bg-white"
      >
        <QRCode
          value={qrValue}
          size={size}
          level="H"
          includeMargin
          renderAs="canvas"
        />
      </div>

      {showControls && (
        <div className="flex gap-2">
          <button
            onClick={downloadQRCode}
            className="px-4 py-2 border-2 border-input rounded-xl hover:bg-muted transition-all font-semibold text-sm flex items-center gap-2"
            title="Descarregar QR Code"
          >
            <Download className="h-4 w-4" />
            Descarregar
          </button>
          <button
            onClick={printQRCode}
            className="px-4 py-2 bg-gradient-to-r from-primary via-blue-600 to-primary text-primary-foreground rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all font-semibold text-sm flex items-center gap-2"
            title="Imprimir QR Code"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      )}

      <div className="text-xs text-center text-muted-foreground max-w-xs">
        <p className="font-mono bg-muted px-2 py-1 rounded break-all">
          {qrValue}
        </p>
      </div>
    </div>
  );
}
