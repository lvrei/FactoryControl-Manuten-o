import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Search,
  Filter,
  Building2,
  Warehouse,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Ruler,
  Weight,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Archive,
  ArrowUpDown,
  FileText,
  QrCode,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import { productionService } from "@/services/productionService";
import { FoamBlock, FoamType, StockFilters } from "@/types/production";

interface NewBlockForm {
  productionNumber: string;
  foamTypeId: string;
  blockNumber: string;
  warehouse: 'BZM' | 'LOOPER';
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  productionDate: string;
  nonConformities: string;
  comments: string;
  receivedBy: string;
}

const warehouseConfig = {
  BZM: { label: "Armazém BZM", color: "text-blue-600 bg-blue-50", icon: Building2 },
  LOOPER: { label: "Armazém Looper", color: "text-green-600 bg-green-50", icon: Warehouse }
};

const statusConfig = {
  available: { label: "Disponível", color: "text-success bg-success/10", icon: CheckCircle },
  reserved: { label: "Reservado", color: "text-warning bg-warning/10", icon: Clock },
  in_production: { label: "Em Produção", color: "text-info bg-info/10", icon: ArrowUpDown },
  consumed: { label: "Consumido", color: "text-muted-foreground bg-muted", icon: Archive }
};

const qualityStatusConfig = {
  pending: { label: "Pendente", color: "text-warning bg-warning/10", icon: Clock },
  approved: { label: "Aprovado", color: "text-success bg-success/10", icon: CheckCircle },
  rejected: { label: "Rejeitado", color: "text-destructive bg-destructive/10", icon: AlertTriangle }
};

export default function Stock() {
  const [foamBlocks, setFoamBlocks] = useState<FoamBlock[]>([]);
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<FoamBlock | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FoamBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>({
    warehouse: 'all',
    status: '',
    qualityStatus: '',
    foamType: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'blocks' | 'movements' | 'analytics'>('blocks');
  const [stockSummary, setStockSummary] = useState<any>(null);

  const [newBlock, setNewBlock] = useState<NewBlockForm>({
    productionNumber: '',
    foamTypeId: '',
    blockNumber: '',
    warehouse: 'BZM',
    dimensions: { length: 2000, width: 1000, height: 500 },
    weight: undefined,
    productionDate: new Date().toISOString().split('T')[0],
    nonConformities: '',
    comments: '',
    receivedBy: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [filters, searchTerm]);

  const loadData = async () => {
    try {
      const [blocksData, typesData, summaryData] = await Promise.all([
        productionService.getFoamBlocks(),
        productionService.getFoamTypes(),
        productionService.getStockSummary()
      ]);
      
      setFoamBlocks(blocksData);
      setFoamTypes(typesData);
      setStockSummary(summaryData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    try {
      const data = await productionService.getFoamBlocks(filters);
      
      let filtered = data;
      if (searchTerm) {
        filtered = data.filter(block =>
          block.productionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.blockNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.foamType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          block.comments.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setFoamBlocks(filtered);
    } catch (error) {
      console.error('Erro ao carregar blocos:', error);
    }
  };

  const handleAddBlock = async () => {
    if (!newBlock.productionNumber || !newBlock.foamTypeId || !newBlock.blockNumber || !newBlock.receivedBy) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const foamType = foamTypes.find(type => type.id === newBlock.foamTypeId);
      if (!foamType) {
        alert('Tipo de espuma não encontrado');
        return;
      }

      if (editingBlock) {
        // Editar bloco existente
        await productionService.updateFoamBlock(editingBlock.id, {
          productionNumber: newBlock.productionNumber,
          foamType,
          blockNumber: newBlock.blockNumber,
          warehouse: newBlock.warehouse,
          dimensions: newBlock.dimensions,
          weight: newBlock.weight,
          productionDate: newBlock.productionDate,
          nonConformities: newBlock.nonConformities.split(',').map(s => s.trim()).filter(s => s),
          comments: newBlock.comments,
          receivedBy: newBlock.receivedBy
        });
      } else {
        // Criar novo bloco
        await productionService.createFoamBlock({
          productionNumber: newBlock.productionNumber,
          foamType,
          blockNumber: newBlock.blockNumber,
          warehouse: newBlock.warehouse,
          dimensions: newBlock.dimensions,
          weight: newBlock.weight,
          productionDate: newBlock.productionDate,
          status: 'available',
          qualityStatus: 'pending',
          nonConformities: newBlock.nonConformities.split(',').map(s => s.trim()).filter(s => s),
          comments: newBlock.comments,
          receivedBy: newBlock.receivedBy
        });
      }

      await loadData();
      setShowAddBlock(false);
      setEditingBlock(null);
      setNewBlock({
        productionNumber: '',
        foamTypeId: '',
        blockNumber: '',
        warehouse: 'BZM',
        dimensions: { length: 2000, width: 1000, height: 500 },
        weight: undefined,
        productionDate: new Date().toISOString().split('T')[0],
        nonConformities: '',
        comments: '',
        receivedBy: ''
      });
    } catch (error) {
      console.error('Erro ao salvar bloco:', error);
      alert('Erro ao salvar bloco');
    }
  };

  const handleEditBlock = (block: FoamBlock) => {
    setEditingBlock(block);
    setNewBlock({
      productionNumber: block.productionNumber,
      foamTypeId: block.foamType.id,
      blockNumber: block.blockNumber,
      warehouse: block.warehouse,
      dimensions: block.dimensions,
      weight: block.weight,
      productionDate: block.productionDate,
      nonConformities: block.nonConformities.join(', '),
      comments: block.comments,
      receivedBy: block.receivedBy
    });
    setShowAddBlock(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (confirm('Tem certeza que deseja remover este bloco do stock?')) {
      try {
        await productionService.deleteFoamBlock(blockId);
        await loadData();
        setSelectedBlock(null);
      } catch (error) {
        console.error('Erro ao deletar bloco:', error);
        alert('Erro ao deletar bloco');
      }
    }
  };

  const getFilteredBlocks = () => {
    return foamBlocks;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando stock...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Stock de Blocos</h1>
          <p className="text-muted-foreground">
            Controle de blocos de espuma nos armazéns BZM e Looper
          </p>
        </div>
        
        <button
          onClick={() => setShowAddBlock(true)}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Registrar Novo Bloco
        </button>
      </div>

      {/* Stats Cards */}
      {stockSummary && (
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Blocos</p>
                <p className="text-2xl font-bold text-card-foreground">{stockSummary.totalBlocks}</p>
              </div>
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Volume Total</p>
                <p className="text-2xl font-bold text-card-foreground">{stockSummary.totalVolume.toFixed(1)}m³</p>
              </div>
              <Archive className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Armazém BZM</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stockSummary.byWarehouse.find((w: any) => w.warehouse === 'BZM')?.blocks || 0}
                </p>
              </div>
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Armazém Looper</p>
                <p className="text-2xl font-bold text-green-600">
                  {stockSummary.byWarehouse.find((w: any) => w.warehouse === 'LOOPER')?.blocks || 0}
                </p>
              </div>
              <Warehouse className="h-6 w-6 text-green-600" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-success">
                  {stockSummary.byStatus.find((s: any) => s.status === 'available')?.blocks || 0}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('blocks')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'blocks'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Blocos ({foamBlocks.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'movements'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Movimentações
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'analytics'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análises
        </button>
      </div>

      {/* Filters and Search */}
      {activeTab === 'blocks' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nº produção, nº bloco, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={filters.warehouse || 'all'}
            onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value as any }))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todos armazéns</option>
            <option value="BZM">Armazém BZM</option>
            <option value="LOOPER">Armazém Looper</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos status</option>
            <option value="available">Disponível</option>
            <option value="reserved">Reservado</option>
            <option value="in_production">Em Produção</option>
            <option value="consumed">Consumido</option>
          </select>

          <select
            value={filters.qualityStatus || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, qualityStatus: e.target.value }))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Qualidade</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'blocks' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Blocks List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h3 className="text-lg font-semibold text-card-foreground">Lista de Blocos</h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {getFilteredBlocks().length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">Nenhum Bloco Encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      {foamBlocks.length === 0 ? 
                        'Adicione blocos de espuma para começar a gerir o stock' :
                        'Nenhum bloco corresponde aos filtros aplicados'
                      }
                    </p>
                    {foamBlocks.length === 0 && (
                      <button
                        onClick={() => setShowAddBlock(true)}
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
                      >
                        Registrar Primeiro Bloco
                      </button>
                    )}
                  </div>
                ) : (
                  getFilteredBlocks().map((block) => {
                    const warehouseConf = warehouseConfig[block.warehouse];
                    const statusConf = statusConfig[block.status];
                    const qualityConf = qualityStatusConfig[block.qualityStatus];
                    const WarehouseIcon = warehouseConf.icon;
                    const StatusIcon = statusConf.icon;
                    
                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedBlock(block)}
                        className={cn(
                          "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                          selectedBlock?.id === block.id && "bg-muted/50"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <div 
                              className="w-4 h-4 rounded border-2 border-gray-300 mt-1"
                              style={{ backgroundColor: block.foamType.stockColor || '#f8f9fa' }}
                            ></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-card-foreground">
                                  {block.blockNumber}
                                </p>
                                <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", warehouseConf.color)}>
                                  <WarehouseIcon className="h-3 w-3 mr-1" />
                                  {warehouseConf.label.replace('Armazém ', '')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {block.foamType.name} • {block.productionNumber}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {block.dimensions.length} × {block.dimensions.width} × {block.dimensions.height} mm
                                • {block.volume.toFixed(2)}m³
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", statusConf.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConf.label}
                            </span>
                            <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", qualityConf.color)}>
                              {qualityConf.label}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Recebido: {new Date(block.receivedDate).toLocaleDateString('pt-BR')}</span>
                          <span>Por: {block.receivedBy}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Block Details */}
          <div className="lg:col-span-1">
            {selectedBlock ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">Detalhes do Bloco</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert('Funcionalidade de edição em desenvolvimento')}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Editar bloco"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(selectedBlock.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Remover bloco"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="text-center mb-4">
                      <div 
                        className="w-16 h-16 rounded-lg border-4 border-gray-300 flex items-center justify-center mx-auto mb-2"
                        style={{ backgroundColor: selectedBlock.foamType.stockColor || '#f8f9fa' }}
                      >
                        <Package className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-medium text-card-foreground">{selectedBlock.blockNumber}</h4>
                      <p className="text-muted-foreground">{selectedBlock.foamType.name}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nº Produção:</span>
                        <span className="font-medium text-card-foreground">{selectedBlock.productionNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Armazém:</span>
                        <span className={cn("font-medium", warehouseConfig[selectedBlock.warehouse].color)}>
                          {warehouseConfig[selectedBlock.warehouse].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={cn("font-medium", statusConfig[selectedBlock.status].color)}>
                          {statusConfig[selectedBlock.status].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Qualidade:</span>
                        <span className={cn("font-medium", qualityStatusConfig[selectedBlock.qualityStatus].color)}>
                          {qualityStatusConfig[selectedBlock.qualityStatus].label}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-muted-foreground mb-2">Dimensões:</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs text-muted-foreground">Comprimento</p>
                          <p className="font-medium">{selectedBlock.dimensions.length}mm</p>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs text-muted-foreground">Largura</p>
                          <p className="font-medium">{selectedBlock.dimensions.width}mm</p>
                        </div>
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs text-muted-foreground">Altura</p>
                          <p className="font-medium">{selectedBlock.dimensions.height}mm</p>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-muted-foreground text-xs">Volume Total</p>
                        <p className="font-bold text-lg text-card-foreground">{selectedBlock.volume.toFixed(2)} m³</p>
                      </div>
                    </div>

                    {selectedBlock.weight && (
                      <div className="pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Peso:</span>
                          <span className="font-medium text-card-foreground">{selectedBlock.weight} kg</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Data Produção:</span>
                        <span className="font-medium text-card-foreground">
                          {new Date(selectedBlock.productionDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Data Recebimento:</span>
                        <span className="font-medium text-card-foreground">
                          {new Date(selectedBlock.receivedDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recebido por:</span>
                        <span className="font-medium text-card-foreground">{selectedBlock.receivedBy}</span>
                      </div>
                    </div>

                    {selectedBlock.comments && (
                      <div className="pt-4 border-t">
                        <p className="text-muted-foreground mb-2">Comentários:</p>
                        <p className="text-card-foreground">{selectedBlock.comments}</p>
                      </div>
                    )}

                    {selectedBlock.nonConformities.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-muted-foreground mb-2">Não Conformidades:</p>
                        <div className="space-y-1">
                          {selectedBlock.nonConformities.map((nc, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-warning" />
                              <span className="text-warning text-xs">{nc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione um Bloco</h3>
                <p className="text-muted-foreground">
                  Escolha um bloco da lista para ver os detalhes completos
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'movements' ? (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Historial de Movimentações</h3>
          <p className="text-muted-foreground text-center py-8">
            Funcionalidade de historial de movimentações em desenvolvimento.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Análises de Stock</h3>
          <p className="text-muted-foreground text-center py-8">
            Dashboard de análises de stock em desenvolvimento.
          </p>
        </div>
      )}

      {/* Modal de Adicionar Bloco */}
      {showAddBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Registrar Novo Bloco</h3>
                <button
                  onClick={() => {
                    setShowAddBlock(false);
                    setNewBlock({
                      productionNumber: '',
                      foamTypeId: '',
                      blockNumber: '',
                      warehouse: 'BZM',
                      dimensions: { length: 2000, width: 1000, height: 500 },
                      weight: undefined,
                      productionDate: new Date().toISOString().split('T')[0],
                      nonConformities: '',
                      comments: '',
                      receivedBy: '',
              
                    });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Informações Básicas</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nº de Produção *</label>
                      <input
                        type="text"
                        value={newBlock.productionNumber}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, productionNumber: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Ex: PROD-2024-001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Nº do Bloco *</label>
                      <input
                        type="text"
                        value={newBlock.blockNumber}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, blockNumber: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Ex: BLK-001"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Data de Produção *</label>
                      <input
                        type="date"
                        value={newBlock.productionDate}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, productionDate: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Tipo de Espuma *</label>
                      <select
                        value={newBlock.foamTypeId}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, foamTypeId: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        required
                      >
                        <option value="">Selecione o tipo</option>
                        {foamTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name} - {type.specifications}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Armazém *</label>
                      <select
                        value={newBlock.warehouse}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, warehouse: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        required
                      >
                        <option value="BZM">Armazém BZM</option>
                        <option value="LOOPER">Armazém Looper</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Dimensões e Peso</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Comprimento (mm) *</label>
                      <input
                        type="number"
                        value={newBlock.dimensions.length}
                        onChange={(e) => setNewBlock(prev => ({ 
                          ...prev, 
                          dimensions: { ...prev.dimensions, length: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Largura (mm) *</label>
                      <input
                        type="number"
                        value={newBlock.dimensions.width}
                        onChange={(e) => setNewBlock(prev => ({ 
                          ...prev, 
                          dimensions: { ...prev.dimensions, width: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Altura (mm) *</label>
                      <input
                        type="number"
                        value={newBlock.dimensions.height}
                        onChange={(e) => setNewBlock(prev => ({ 
                          ...prev, 
                          dimensions: { ...prev.dimensions, height: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Peso (kg)</label>
                      <input
                        type="number"
                        value={newBlock.weight || ''}
                        onChange={(e) => setNewBlock(prev => ({ 
                          ...prev, 
                          weight: e.target.value ? Number(e.target.value) : undefined
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Volume calculado: {
                        ((newBlock.dimensions.length * newBlock.dimensions.width * newBlock.dimensions.height) / 1000000).toFixed(3)
                      } m³
                    </p>
                  </div>
                </div>


                {/* Controle de Qualidade */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Controle de Qualidade</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Não Conformidades</label>
                      <input
                        type="text"
                        value={newBlock.nonConformities}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, nonConformities: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Separar por vírgulas (ex: risco superficial, densidade baixa)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Recebido por *</label>
                      <input
                        type="text"
                        value={newBlock.receivedBy}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, receivedBy: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Nome do responsável"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Comentários</label>
                    <textarea
                      value={newBlock.comments}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, comments: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      rows={3}
                      placeholder="Observações adicionais sobre o bloco..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowAddBlock(false);
                    setNewBlock({
                      productionNumber: '',
                      foamTypeId: '',
                      blockNumber: '',
                      warehouse: 'BZM',
                      dimensions: { length: 2000, width: 1000, height: 500 },
                      weight: undefined,
                      productionDate: new Date().toISOString().split('T')[0],
                      nonConformities: '',
                      comments: '',
                      receivedBy: '',
              
                    });
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddBlock}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Registrar Bloco
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
