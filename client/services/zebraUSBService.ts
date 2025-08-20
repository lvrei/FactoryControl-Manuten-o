interface ZebraPrinter {
  device: USBDevice;
  name: string;
  serialNumber?: string;
  connected: boolean;
}

class ZebraUSBService {
  private connectedPrinter: ZebraPrinter | null = null;
  private readonly ZEBRA_VENDOR_ID = 0x0a5f; // Zebra Technologies vendor ID
  
  // Common Zebra printer product IDs
  private readonly ZEBRA_PRODUCT_IDS = [
    0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007, 0x0008,
    0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x000e, 0x000f, 0x0010,
    0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017, 0x0018,
    0x0019, 0x001a, 0x001b, 0x001c, 0x001d, 0x001e, 0x001f, 0x0020,
    0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027, 0x0028,
    0x0029, 0x002a, 0x002b, 0x002c, 0x002d, 0x002e, 0x002f, 0x0030,
    // Common models
    0x008e, 0x008f, 0x0090, 0x0091, 0x0092, 0x0093, 0x0094, 0x0095,
    0x0096, 0x0097, 0x0098, 0x0099, 0x009a, 0x009b, 0x009c, 0x009d,
    0x009e, 0x009f, 0x00a0, 0x00a1, 0x00a2, 0x00a3, 0x00a4, 0x00a5
  ];

  constructor() {
    // Check WebUSB support
    if (!navigator.usb) {
      console.warn('WebUSB not supported in this browser');
    }
  }

  async isWebUSBSupported(): Promise<boolean> {
    return !!navigator.usb;
  }

  async requestPrinterAccess(): Promise<ZebraPrinter | null> {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB não suportado neste navegador');
      }

      // Request device with Zebra vendor ID and common product IDs
      const device = await navigator.usb.requestDevice({
        filters: [{
          vendorId: this.ZEBRA_VENDOR_ID,
          // Don't specify productId to allow any Zebra printer
        }]
      });

      if (device) {
        await this.connectToPrinter(device);
        return this.connectedPrinter;
      }

      return null;
    } catch (error) {
      console.error('Erro ao solicitar acesso à impressora:', error);
      throw new Error('Erro ao conectar com a impressora USB. Certifique-se de que a impressora está ligada e conectada.');
    }
  }

  async getConnectedDevices(): Promise<USBDevice[]> {
    try {
      if (!navigator.usb) return [];
      
      const devices = await navigator.usb.getDevices();
      return devices.filter(device => 
        device.vendorId === this.ZEBRA_VENDOR_ID
      );
    } catch (error) {
      console.error('Erro ao obter dispositivos conectados:', error);
      return [];
    }
  }

  async connectToPrinter(device: USBDevice): Promise<void> {
    try {
      if (!device.opened) {
        await device.open();
      }

      // Select configuration (usually configuration 1)
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Claim the interface (usually interface 0)
      const interfaceNumber = device.configuration?.interfaces[0]?.interfaceNumber || 0;
      await device.claimInterface(interfaceNumber);

      this.connectedPrinter = {
        device,
        name: device.productName || 'Impressora Zebra',
        serialNumber: device.serialNumber || undefined,
        connected: true
      };

      console.log('Conectado à impressora:', this.connectedPrinter.name);
    } catch (error) {
      console.error('Erro ao conectar à impressora:', error);
      throw new Error('Erro ao estabelecer conexão com a impressora');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connectedPrinter && this.connectedPrinter.device.opened) {
        await this.connectedPrinter.device.close();
        this.connectedPrinter.connected = false;
        this.connectedPrinter = null;
        console.log('Desconectado da impressora');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  }

  async printZPL(zplCode: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.connectedPrinter || !this.connectedPrinter.connected) {
        throw new Error('Nenhuma impressora conectada');
      }

      const device = this.connectedPrinter.device;
      
      // Find the OUT endpoint (usually endpoint 1 or 2)
      const interface_ = device.configuration?.interfaces[0];
      const endpoint = interface_?.alternate.endpoints.find(
        ep => ep.direction === 'out' && ep.type === 'bulk'
      );

      if (!endpoint) {
        throw new Error('Endpoint de saída não encontrado');
      }

      // Convert ZPL string to bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(zplCode);

      // Send data to printer
      const result = await device.transferOut(endpoint.endpointNumber, data);

      if (result.status === 'ok') {
        return { 
          success: true, 
          message: `Etiqueta enviada com sucesso para ${this.connectedPrinter.name}` 
        };
      } else {
        throw new Error('Erro no envio dos dados');
      }

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido ao imprimir' 
      };
    }
  }

  async getPrinterStatus(): Promise<{ connected: boolean; name?: string; serialNumber?: string }> {
    if (!this.connectedPrinter) {
      return { connected: false };
    }

    return {
      connected: this.connectedPrinter.connected,
      name: this.connectedPrinter.name,
      serialNumber: this.connectedPrinter.serialNumber
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.connectedPrinter) {
        return { success: false, message: 'Nenhuma impressora conectada' };
      }

      // Send a simple test ZPL command
      const testZPL = `
^XA
^FO50,50^A0N,30,30^FDTeste de Conexao^FS
^FO50,100^A0N,20,20^FD${new Date().toLocaleString('pt-BR')}^FS
^XZ`;

      const result = await this.printZPL(testZPL);
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro no teste de conexão' 
      };
    }
  }

  // Helper method to check printer capabilities
  async getPrinterInfo(): Promise<string | null> {
    try {
      if (!this.connectedPrinter) return null;

      const device = this.connectedPrinter.device;
      
      // Request printer configuration with ZPL command
      const configRequest = '^XA^HH^XZ'; // Host identification command
      
      // This would require bidirectional communication
      // For now, return basic device info
      return `${device.manufacturerName || 'Zebra'} ${device.productName || 'Printer'} (USB: ${device.vendorId.toString(16)}:${device.productId.toString(16)})`;
    } catch (error) {
      console.error('Erro ao obter informações da impressora:', error);
      return null;
    }
  }
}

export const zebraUSBService = new ZebraUSBService();
