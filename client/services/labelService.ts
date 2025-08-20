import { PrintLabel } from '@/types/production';

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

  async printLabel(label: PrintLabel): Promise<{ success: boolean; zplCode: string }> {
    const zplCode = this.generateZPLCode(label);

    try {
      // In a real implementation, this would send to Zebra printer
      // For now, we'll just prepare the ZPL code and show it to user
      
      // Create a downloadable file with ZPL code
      const blob = new Blob([zplCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etiqueta_${label.barcodeId}.zpl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, zplCode };
    } catch (error) {
      console.error('Error printing label:', error);
      return { success: false, zplCode };
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

  // Preview ZPL as HTML (simplified representation)
  generatePreviewHTML(label: PrintLabel): string {
    const { barcodeId, customerName, orderNumber, foamType, quantity, dimensions, operatorName, machineName, completionDate } = label;
    
    return `
      <div style="width: 400px; height: 300px; border: 2px solid #000; padding: 10px; font-family: monospace; font-size: 12px; background: white;">
        <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">FactoryControl - Espuma Cortada</div>
        <div style="text-align: center; margin-bottom: 15px;">${new Date(completionDate).toLocaleDateString('pt-BR')} ${new Date(completionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        
        <div><strong>Cliente:</strong> ${customerName}</div>
        <div><strong>OP:</strong> ${orderNumber}</div>
        <div><strong>Tipo:</strong> ${foamType}</div>
        <br>
        <div><strong>Quantidade:</strong> ${quantity} unidades</div>
        <div><strong>Dimensões:</strong> ${dimensions.length}x${dimensions.width}x${dimensions.height}mm</div>
        <br>
        <div><strong>Máquina:</strong> ${machineName}</div>
        <div><strong>Operador:</strong> ${operatorName}</div>
        <br>
        <div style="text-align: center; margin: 10px 0;">
          <div style="font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 2px; border: 1px solid #000; padding: 5px;">
            ||||| ${barcodeId} |||||
          </div>
        </div>
        <div style="text-align: center;"><strong>Código:</strong> ${barcodeId}</div>
      </div>
    `;
  }
}

export const labelService = new LabelService();
