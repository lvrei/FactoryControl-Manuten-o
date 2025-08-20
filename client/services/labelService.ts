import { PrintLabel } from '@/types/production';
import { zebraUSBService } from './zebraUSBService';

class LabelService {
  private storageKey = 'factoryControl_labels';

  private getStoredLabels(): PrintLabel[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveLabels(labels: PrintLabel[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(labels));
  }

  generateUniqueId(): string {
    // Generate unique ID for barcode (format: FC + timestamp + random)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FC${timestamp}${random}`;
  }

  generateZPLCode(label: PrintLabel): string {
    const { barcodeId, customerName, orderNumber, foamType, quantity, dimensions, operatorName, machineName, completionDate } = label;

    // ZPL code for Zebra printer - Otimizado para etiquetas 105.5x150mm (420x600 pontos a 203dpi)
    const zplCode = `
^XA
^PW420
^LL600
^LH0,0
~SD20

^FO20,20^A0N,25,20^FDFactoryControl^FS
^FO20,50^A0N,20,15^FD${new Date(completionDate).toLocaleDateString('pt-BR')} ${new Date(completionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}^FS

^FO20,85^A0N,20,15^FDCliente: ${customerName.substring(0, 25)}^FS
^FO20,110^A0N,20,15^FDOP: ${orderNumber}^FS
^FO20,135^A0N,18,12^FDTipo: ${foamType.substring(0, 20)}^FS

^FO20,170^A0N,18,12^FDQtd: ${quantity} un^FS
^FO20,195^A0N,16,10^FDDim: ${dimensions.length}x${dimensions.width}x${dimensions.height}mm^FS

^FO20,225^A0N,16,10^FDMaquina: ${machineName.substring(0, 20)}^FS
^FO20,250^A0N,16,10^FDOperador: ${operatorName.substring(0, 20)}^FS

^FO20,290^BY2,2,50
^BCN,50,Y,N,N
^FD${barcodeId}^FS

^FO20,360^A0N,16,12^FDCodigo: ${barcodeId}^FS

^FO20,570^A0N,12,8^FDwww.factorycontrol.pt^FS

^XZ`;

    return zplCode.trim();
  }

  async createLabel(labelData: Omit<PrintLabel, 'id' | 'barcodeId' | 'printedAt'>): Promise<PrintLabel> {
    const labels = this.getStoredLabels();
    
    const newLabel: PrintLabel = {
      ...labelData,
      id: Date.now().toString(),
      barcodeId: this.generateUniqueId(),
      printedAt: new Date().toISOString()
    };

    labels.push(newLabel);
    this.saveLabels(labels);
    return newLabel;
  }

  async printLabel(label: PrintLabel, directPrint: boolean = true): Promise<{ success: boolean; zplCode: string; message?: string }> {
    const zplCode = this.generateZPLCode(label);

    try {
      // Check if we should try direct USB printing first
      if (directPrint) {
        const printerStatus = await zebraUSBService.getPrinterStatus();

        if (printerStatus.connected) {
          // Try direct USB printing
          const usbResult = await zebraUSBService.printZPL(zplCode);
          if (usbResult.success) {
            return {
              success: true,
              zplCode,
              message: `Etiqueta impressa com sucesso via USB: ${usbResult.message}`
            };
          } else {
            // USB failed, fallback to download
            console.warn('USB printing failed, falling back to download:', usbResult.message);
          }
        }
      }

      // Fallback: Create a downloadable file with ZPL code
      const blob = new Blob([zplCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etiqueta_${label.barcodeId}.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        zplCode,
        message: 'Arquivo ZPL baixado. Envie manualmente para a impressora ou configure conexão USB.'
      };
    } catch (error) {
      console.error('Error printing label:', error);
      return {
        success: false,
        zplCode,
        message: error instanceof Error ? error.message : 'Erro desconhecido ao imprimir'
      };
    }
  }

  async sendToPrinter(zplCode: string, printerIP?: string): Promise<boolean> {
    try {
      // In production, this would send ZPL directly to Zebra printer via IP
      // Example implementation for network printer:
      
      if (printerIP) {
        // This would require a backend service or direct network access
        console.log(`Sending ZPL to printer at ${printerIP}:`, zplCode);
        
        // For now, we'll simulate success
        // In real implementation:
        // const response = await fetch(`http://${printerIP}:9100`, {
        //   method: 'POST',
        //   body: zplCode,
        //   headers: { 'Content-Type': 'text/plain' }
        // });
        
        return true;
      } else {
        // Fallback: show ZPL in console and download file
        console.log('ZPL Code for printer:', zplCode);
        return true;
      }
    } catch (error) {
      console.error('Error sending to printer:', error);
      return false;
    }
  }

  async getLabels(): Promise<PrintLabel[]> {
    return this.getStoredLabels().sort((a, b) => 
      new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime()
    );
  }

  async getLabelByBarcode(barcodeId: string): Promise<PrintLabel | null> {
    const labels = this.getStoredLabels();
    return labels.find(label => label.barcodeId === barcodeId) || null;
  }

  // Preview ZPL as HTML (optimized for 105.5x150mm label)
  generatePreviewHTML(label: PrintLabel): string {
    const { barcodeId, customerName, orderNumber, foamType, quantity, dimensions, operatorName, machineName, completionDate } = label;

    return `
      <div style="
        width: 420px;
        height: 600px;
        border: 2px solid #000;
        padding: 20px;
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        background: white;
        box-sizing: border-box;
        position: relative;
        transform: scale(0.7);
        transform-origin: top left;
      ">
        <div style="text-align: left; font-weight: bold; font-size: 16px; margin-bottom: 8px;">FactoryControl</div>
        <div style="text-align: left; font-size: 12px; margin-bottom: 20px; color: #666;">
          ${new Date(completionDate).toLocaleDateString('pt-BR')} ${new Date(completionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div style="margin-bottom: 8px;"><strong>Cliente:</strong> ${customerName.substring(0, 25)}</div>
        <div style="margin-bottom: 8px;"><strong>OP:</strong> ${orderNumber}</div>
        <div style="margin-bottom: 20px; font-size: 12px;"><strong>Tipo:</strong> ${foamType.substring(0, 20)}</div>

        <div style="margin-bottom: 8px; font-size: 12px;"><strong>Qtd:</strong> ${quantity} un</div>
        <div style="margin-bottom: 20px; font-size: 11px;"><strong>Dim:</strong> ${dimensions.length}×${dimensions.width}×${dimensions.height}mm</div>

        <div style="margin-bottom: 8px; font-size: 11px;"><strong>Máquina:</strong> ${machineName.substring(0, 20)}</div>
        <div style="margin-bottom: 30px; font-size: 11px;"><strong>Operador:</strong> ${operatorName.substring(0, 20)}</div>

        <div style="text-align: center; margin: 20px 0;">
          <div style="
            font-family: 'Courier New', monospace;
            font-size: 18px;
            letter-spacing: 1px;
            border: 2px solid #000;
            padding: 8px;
            background: linear-gradient(90deg, #000 2px, transparent 2px),
                        linear-gradient(90deg, transparent 8px, #000 10px);
            background-size: 12px 100%;
            color: white;
            text-shadow: 1px 1px 0 #000;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${barcodeId}
          </div>
        </div>

        <div style="text-align: center; font-size: 12px; margin-bottom: 20px;"><strong>Código:</strong> ${barcodeId}</div>

        <div style="
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          text-align: center;
          font-size: 10px;
          color: #666;
        ">
          www.factorycontrol.pt
        </div>
      </div>
    `;
  }

  // Get printer connection status for UI
  async getPrinterConnectionStatus(): Promise<{ connected: boolean; name?: string; message: string }> {
    try {
      const status = await zebraUSBService.getPrinterStatus();

      if (status.connected) {
        return {
          connected: true,
          name: status.name,
          message: `Conectado: ${status.name}`
        };
      } else {
        const isSupported = await zebraUSBService.isWebUSBSupported();
        return {
          connected: false,
          message: isSupported
            ? 'Impressora não conectada. Clique para configurar.'
            : 'WebUSB não suportado. Use Chrome/Edge para conexão direta.'
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: 'Erro ao verificar status da impressora'
      };
    }
  }
}

export const labelService = new LabelService();
