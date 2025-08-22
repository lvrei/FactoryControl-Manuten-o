import { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Scan,
  Plus,
  Truck,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Filter,
  RefreshCw,
  User,
  Calendar,
  Weight,
  Ruler,
  FileBarChart
} from 'lucide-react';
import { ShippableItem, ShipmentLoad, ShippedItem, BarcodeScanner } from '@/types/production';
import { shippingService } from '@/services/shippingService';
import { cn } from '@/lib/utils';

interface MaterialShippingProps {
  operatorId: string;
  operatorName: string;
  onBack: () => void;
}

export default function MaterialShipping({ operatorId, operatorName, onBack }: MaterialShippingProps) {
  const [shippableItems, setShippableItems] = useState<ShippableItem[]>([]);
  const [currentLoad, setCurrentLoad] = useState<ShipmentLoad | null>(null);
  const [recentLoads, setRecentLoads] = useState<ShipmentLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [scanner, setScanner] = useState<BarcodeScanner>({ isScanning: false });
  const [scannerInput, setScannerInput] = useState('');
  const [scanResult, setScanResult] = useState<{ item: ShippableItem | null; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'current-load' | 'history'>('available');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [loadCompletionData, setLoadCompletionData] = useState({
    truckPlate: '',
    driverName: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Generate and load shippable items
      await shippingService.generateShippableItems();
      const items = await shippingService.getShippableItems();
      setShippableItems(items);

      // Get current load for operator
      const load = await shippingService.getCurrentLoad(operatorId);
      setCurrentLoad(load);

      // Get recent loads
      const loads = await shippingService.getLoads(10);
      setRecentLoads(loads);

    } catch (error) {
      console.error('Error loading shipping data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewLoad = async () => {
    try {
      const newLoad = await shippingService.createNewLoad(operatorId, operatorName);
      setCurrentLoad(newLoad);
      setActiveTab('current-load');
    } catch (error) {
      console.error('Error creating new load:', error);
      alert('Erro ao criar nova carga');
    }
  };

  const handleStartScanning = () => {
    const scannerState = shippingService.startBarcodeScanning();
    setScanner(scannerState);
    setScanResult(null);
  };

  const handleStopScanning = () => {
    const scannerState = shippingService.stopBarcodeScanning();
    setScanner(scannerState);
  };

  const handleBarcodeInput = async (barcodeId: string) => {
    if (!barcodeId.trim()) return;

    try {
      const result = await shippingService.processBarcodeScanned(barcodeId.trim().toUpperCase());
      setScanResult(result);
      
      if (result.item) {
        setScannerInput('');
      }
    } catch (error) {
      setScanResult({ 
        item: null, 
        error: error instanceof Error ? error.message : 'Erro ao processar código' 
      });
    }
  };

  const handleAddItemToLoad = async (item: ShippableItem, fromScan = false) => {
    if (!currentLoad) {
      alert('Crie uma nova carga primeiro');
      return;
    }

    try {
      const updatedLoad = await shippingService.addItemToLoad(
        currentLoad.id,
        item,
        undefined,
        fromScan ? new Date().toISOString() : undefined
      );
      setCurrentLoad(updatedLoad);
      
      // Refresh available items
      const items = await shippingService.getShippableItems();
      setShippableItems(items);

      if (fromScan) {
        setScanResult(null);
        setScannerInput('');
      }
    } catch (error) {
      console.error('Error adding item to load:', error);
      if (error.message === 'Item already in load') {
        alert('Este item já foi adicionado à carga atual.');
      } else {
        alert('Erro ao adicionar item à carga: ' + error.message);
      }
    }
  };

  const handleRemoveItemFromLoad = async (shippedItemId: string) => {
    if (!currentLoad) return;

    if (confirm('Remover este item da carga?')) {
      try {
        const updatedLoad = await shippingService.removeItemFromLoad(currentLoad.id, shippedItemId);
        setCurrentLoad(updatedLoad);
        
        // Refresh available items
        const items = await shippingService.getShippableItems();
        setShippableItems(items);
      } catch (error) {
        console.error('Error removing item from load:', error);
        alert('Erro ao remover item da carga');
      }
    }
  };

  const handleCompleteLoad = async () => {
    if (!currentLoad) return;

    try {
      await shippingService.completeLoad(
        currentLoad.id,
        loadCompletionData.truckPlate,
        loadCompletionData.driverName,
        loadCompletionData.notes
      );
      
      setCurrentLoad(null);
      setShowCompleteModal(false);
      setLoadCompletionData({ truckPlate: '', driverName: '', notes: '' });
      
      // Refresh data
      await loadData();
      setActiveTab('history');
      
      alert('Carga concluída com sucesso!');
    } catch (error) {
      console.error('Error completing load:', error);
      alert('Erro ao concluir carga');
    }
  };

  const handleExportAvailable = () => {
    shippingService.exportShippableItemsToCSV(filteredItems);
  };

  const handleExportLoad = (load: ShipmentLoad) => {
    shippingService.exportLoadToCSV(load);
  };

  // Filter items
  const customers = Array.from(new Set(shippableItems.map(item => item.customerName)));
  
  const filteredItems = shippableItems.filter(item => {
    const matchesSearch = 
      item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.foamType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcodeId && item.barcodeId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCustomer = selectedCustomer === 'all' || item.customerName === selectedCustomer;
    
    return matchesSearch && matchesCustomer;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Carregando material disponível...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Saída de Material
              </h1>
              <p className="text-muted-foreground">Gestão de cargas e expedição</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              <div>Operador: {operatorName}</div>
              <div>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>

        {/* Current Load Status */}
        {currentLoad && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Carga Ativa: {currentLoad.loadNumber}</div>
                  <div className="text-sm text-blue-700">
                    {currentLoad.totalItems} itens • {currentLoad.totalVolume.toFixed(2)} m³ • {currentLoad.totalWeight.toFixed(1)} kg
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('current-load')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Ver Carga
                </button>
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={currentLoad.totalItems === 0}
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            onClick={() => setActiveTab('available')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              activeTab === 'available'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Package className="h-4 w-4" />
            Material Disponível ({filteredItems.length})
          </button>
          <button
            onClick={() => setActiveTab('current-load')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              activeTab === 'current-load'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Truck className="h-4 w-4" />
            Carga Atual ({currentLoad?.totalItems || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              activeTab === 'history'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileBarChart className="h-4 w-4" />
            Histórico de Cargas ({recentLoads.length})
          </button>
        </div>

        {/* Available Material Tab */}
        {activeTab === 'available' && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-3">
                {!currentLoad && (
                  <button
                    onClick={handleCreateNewLoad}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Carga
                  </button>
                )}
                
                <button
                  onClick={handleExportAvailable}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Exportar Lista
                </button>
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar OP, cliente, tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg bg-background w-80"
                  />
                </div>
                
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="all">Todos os clientes</option>
                  {customers.map(customer => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Barcode Scanner */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scanner de Código de Barras
                </h3>
                {scanner.isScanning && (
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Scanner ativo</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Digite ou escaneie o código de barras..."
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeInput(scannerInput)}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background"
                />
                <button
                  onClick={() => handleBarcodeInput(scannerInput)}
                  disabled={!scannerInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Processar
                </button>
              </div>

              {scanResult && (
                <div className={cn(
                  "mt-4 p-4 rounded-lg border",
                  scanResult.item 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                )}>
                  {scanResult.item ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-green-800">Material encontrado!</div>
                        <button
                          onClick={() => handleAddItemToLoad(scanResult.item!, true)}
                          disabled={!currentLoad}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Adicionar à Carga
                        </button>
                      </div>
                      <div className="grid gap-2 text-sm text-green-700">
                        <div><strong>OP:</strong> {scanResult.item.orderNumber}</div>
                        <div><strong>Cliente:</strong> {scanResult.item.customerName}</div>
                        <div><strong>Tipo:</strong> {scanResult.item.foamType}</div>
                        <div><strong>Quantidade:</strong> {scanResult.item.quantity} un</div>
                        <div><strong>Dimensões:</strong> {scanResult.item.dimensions.length}×{scanResult.item.dimensions.width}×{scanResult.item.dimensions.height}mm</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-800">
                      <div className="font-medium">Erro</div>
                      <div className="text-sm">{scanResult.error}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Available Items List */}
            <div className="bg-card border rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-medium">Material Disponível para Expedição</h3>
                <p className="text-sm text-muted-foreground">
                  Material que completou todas as operações e está pronto para carregamento
                </p>
              </div>
              
              <div className="overflow-x-auto">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || selectedCustomer !== 'all' 
                        ? 'Nenhum material encontrado com os filtros aplicados'
                        : 'Nenhum material disponível para expedição'
                      }
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr className="text-xs">
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>ORDEM</div>
                          <div>PRODUÇÃO</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>CLIENTE</div>
                          <div>DESTINO</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>TIPO</div>
                          <div>ESPUMA</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>QUANT.</div>
                          <div>PEÇAS</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>DIMENSÕES</div>
                          <div>C×L×A (mm)</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>VOLUME</div>
                          <div>TOTAL (m³)</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>CÓDIGO</div>
                          <div>BARRAS</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>DATA</div>
                          <div>CONCLUSÃO</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>ACÇÕES</div>
                          <div>CARGA</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{item.orderNumber}</td>
                          <td className="p-3">{item.customerName}</td>
                          <td className="p-3">{item.foamType}</td>
                          <td className="p-3">{item.quantity} un</td>
                          <td className="p-3 text-sm">
                            {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height}mm
                          </td>
                          <td className="p-3">{item.volume.toFixed(3)} m³</td>
                          <td className="p-3 text-xs font-mono">
                            {item.barcodeId || 'N/A'}
                          </td>
                          <td className="p-3 text-sm">
                            {new Date(item.completedAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleAddItemToLoad(item)}
                              disabled={!currentLoad}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!currentLoad ? 'Crie uma nova carga primeiro' : 'Adicionar à carga'}
                            >
                              <Plus className="h-3 w-3" />
                              Adicionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Load Tab */}
        {activeTab === 'current-load' && (
          <div className="space-y-6">
            {currentLoad ? (
              <>
                {/* Load Info */}
                <div className="bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Carga {currentLoad.loadNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        Iniciada em {new Date(currentLoad.startTime).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportLoad(currentLoad)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        Exportar
                      </button>
                      <button
                        onClick={() => setShowCompleteModal(true)}
                        disabled={currentLoad.totalItems === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Concluir Carga
                      </button>
                    </div>
                  </div>

                  {/* Load Summary */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="text-xl font-bold">{currentLoad.totalItems}</div>
                        <div className="text-sm text-muted-foreground">Itens</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Ruler className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="text-xl font-bold">{currentLoad.totalVolume.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">m³</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Weight className="h-8 w-8 text-orange-600" />
                      <div>
                        <div className="text-xl font-bold">{currentLoad.totalWeight.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">kg</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Load Items */}
                <div className="bg-card border rounded-lg">
                  <div className="p-4 border-b">
                    <h3 className="font-medium">Itens na Carga</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {currentLoad.items.length === 0 ? (
                      <div className="text-center py-12">
                        <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Carga vazia. Adicione itens do material disponível.</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="border-b bg-muted/50">
                          <tr className="text-xs">
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>ORDEM</div>
                              <div>PRODUÇÃO</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>CLIENTE</div>
                              <div>DESTINO</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>TIPO</div>
                              <div>MATERIAL</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>QUANT.</div>
                              <div>PEÇAS</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>VOLUME</div>
                              <div>TOTAL (m³)</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>HORA</div>
                              <div>ADIÇÃO</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>MÉTODO</div>
                              <div>REGISTO</div>
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              <div>ACÇÕES</div>
                              <div>REMOVER</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentLoad.items.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{item.orderNumber}</td>
                              <td className="p-3">{item.customerName}</td>
                              <td className="p-3">{item.foamType}</td>
                              <td className="p-3">{item.quantity} un</td>
                              <td className="p-3">{item.volume.toFixed(3)} m³</td>
                              <td className="p-3 text-sm">
                                {new Date(item.addedToLoadAt).toLocaleTimeString('pt-BR')}
                              </td>
                              <td className="p-3">
                                {item.scannedAt ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-xs">Escaneado</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs">Manual</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <button
                                  onClick={() => handleRemoveItemFromLoad(item.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma carga ativa</p>
                <button
                  onClick={handleCreateNewLoad}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Criar Nova Carga
                </button>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-card border rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-medium">Histórico de Cargas</h3>
                <p className="text-sm text-muted-foreground">
                  Cargas concluídas e informações de expedição
                </p>
              </div>
              
              <div className="overflow-x-auto">
                {recentLoads.length === 0 ? (
                  <div className="text-center py-12">
                    <FileBarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma carga no histórico</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr className="text-xs">
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>NÚMERO</div>
                          <div>CARGA</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>OPERADOR</div>
                          <div>RESPONSÁVEL</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>ESTADO</div>
                          <div>EXPEDIÇÃO</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>TOTAL</div>
                          <div>ITENS</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>VOLUME</div>
                          <div>TOTAL (m³)</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>DATA</div>
                          <div>EXPEDIÇÃO</div>
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          <div>RELATÓRIO</div>
                          <div>EXPORTAR</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLoads.map((load) => (
                        <tr key={load.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{load.loadNumber}</td>
                          <td className="p-3">{load.operatorName}</td>
                          <td className="p-3">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
                              load.status === 'completed' ? "bg-green-100 text-green-800" :
                              load.status === 'loading' ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {load.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                              {load.status === 'loading' && <Clock className="h-3 w-3" />}
                              {load.status === 'completed' ? 'Concluída' : 
                               load.status === 'loading' ? 'Carregando' : 'Cancelada'}
                            </span>
                          </td>
                          <td className="p-3">{load.totalItems}</td>
                          <td className="p-3">{load.totalVolume.toFixed(2)} m³</td>
                          <td className="p-3 text-sm">
                            {new Date(load.startTime).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleExportLoad(load)}
                              className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              <Download className="h-3 w-3" />
                              Exportar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Complete Load Modal */}
        {showCompleteModal && currentLoad && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Concluir Carga {currentLoad.loadNumber}</h3>
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Matrícula do Camião</label>
                    <input
                      type="text"
                      value={loadCompletionData.truckPlate}
                      onChange={(e) => setLoadCompletionData(prev => ({ ...prev, truckPlate: e.target.value }))}
                      placeholder="Ex: 12-AB-34"
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome do Motorista</label>
                    <input
                      type="text"
                      value={loadCompletionData.driverName}
                      onChange={(e) => setLoadCompletionData(prev => ({ ...prev, driverName: e.target.value }))}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Observações</label>
                    <textarea
                      value={loadCompletionData.notes}
                      onChange={(e) => setLoadCompletionData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações sobre a carga..."
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      rows={3}
                    />
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm font-medium mb-1">Resumo da Carga:</div>
                    <div className="text-sm text-muted-foreground">
                      {currentLoad.totalItems} itens • {currentLoad.totalVolume.toFixed(2)} m³ • {currentLoad.totalWeight.toFixed(1)} kg
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCompleteModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCompleteLoad}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Concluir Carga
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
