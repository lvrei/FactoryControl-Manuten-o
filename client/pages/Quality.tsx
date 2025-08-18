import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  X,
  Calendar,
  Package,
  User,
  FileText,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductionOrder } from '@/types/production';
import { productionService } from '@/services/productionService';

interface QualityInspection {
  id: string;
  orderId: string;
  orderNumber: string;
  internalReference: string;
  foamType: string;
  blockDimensions: {
    length: number;
    width: number;
    height: number;
  };
  blockQuantity: number;
  inspectionDate: string;
  inspector: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Critérios de inspeção
  visualInspection: {
    surfaceQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    colorConsistency: 'excellent' | 'good' | 'acceptable' | 'poor';
    bubblePresence: 'none' | 'minimal' | 'moderate' | 'excessive';
    notes: string;
  };
  
  dimensionalInspection: {
    lengthTolerance: number; // % de variação
    widthTolerance: number;
    heightTolerance: number;
    withinTolerance: boolean;
    notes: string;
  };
  
  densityTest: {
    expectedDensity: number;
    measuredDensity: number;
    withinRange: boolean;
    notes: string;
  };
  
  compressionTest?: {
    compressionForce: number;
    deformation: number;
    recoveryTime: number;
    passed: boolean;
    notes: string;
  };
  
  finalResult: 'approved' | 'approved_with_restrictions' | 'rejected';
  overallNotes: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Quality() {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);

  const [formData, setFormData] = useState({
    orderId: '',
    internalReference: '',
    inspector: '',
    priority: 'medium' as const,
    visualInspection: {
      surfaceQuality: 'good' as const,
      colorConsistency: 'good' as const,
      bubblePresence: 'minimal' as const,
      notes: ''
    },
    dimensionalInspection: {
      lengthTolerance: 0,
      widthTolerance: 0,
      heightTolerance: 0,
      withinTolerance: true,
      notes: ''
    },
    densityTest: {
      expectedDensity: 0,
      measuredDensity: 0,
      withinRange: true,
      notes: ''
    },
    compressionTest: {
      compressionForce: 0,
      deformation: 0,
      recoveryTime: 0,
      passed: true,
      notes: ''
    },
    finalResult: 'approved' as const,
    overallNotes: '',
    photos: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const orders = await productionService.getProductionOrders();
      setProductionOrders(orders);
      
      // Carregar inspeções do localStorage
      const savedInspections = localStorage.getItem('factoryControl_inspections');
      if (savedInspections) {
        setInspections(JSON.parse(savedInspections));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveInspections = (inspectionsList: QualityInspection[]) => {
    localStorage.setItem('factoryControl_inspections', JSON.stringify(inspectionsList));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.orderId || !formData.inspector) {
      alert('Selecione uma ordem de produção e informe o inspetor');
      return;
    }

    const selectedOrder = productionOrders.find(o => o.id === formData.orderId);
    if (!selectedOrder) return;

    const firstLine = selectedOrder.lines[0];
    if (!firstLine) return;

    try {
      const inspectionData: QualityInspection = {
        id: editingInspection?.id || Date.now().toString(),
        orderId: formData.orderId,
        orderNumber: selectedOrder.orderNumber,
        internalReference: formData.internalReference,
        foamType: firstLine.foamType.name,
        blockDimensions: firstLine.initialDimensions,
        blockQuantity: firstLine.quantity,
        inspectionDate: new Date().toISOString(),
        inspector: formData.inspector,
        status: 'in_progress',
        priority: formData.priority,
        visualInspection: formData.visualInspection,
        dimensionalInspection: formData.dimensionalInspection,
        densityTest: formData.densityTest,
        compressionTest: formData.compressionTest,
        finalResult: formData.finalResult,
        overallNotes: formData.overallNotes,
        photos: formData.photos,
        createdAt: editingInspection?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedInspections;
      if (editingInspection) {
        updatedInspections = inspections.map(insp => 
          insp.id === editingInspection.id ? inspectionData : insp
        );
      } else {
        updatedInspections = [...inspections, inspectionData];
      }

      setInspections(updatedInspections);
      saveInspections(updatedInspections);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar inspeção:', error);
      alert('Erro ao salvar inspeção');
    }
  };

  const handleEdit = (inspection: QualityInspection) => {
    setEditingInspection(inspection);
    setFormData({
      orderId: inspection.orderId,
      internalReference: inspection.internalReference,
      inspector: inspection.inspector,
      priority: inspection.priority,
      visualInspection: inspection.visualInspection,
      dimensionalInspection: inspection.dimensionalInspection,
      densityTest: inspection.densityTest,
      compressionTest: inspection.compressionTest || {
        compressionForce: 0, deformation: 0, recoveryTime: 0, passed: true, notes: ''
      },
      finalResult: inspection.finalResult,
      overallNotes: inspection.overallNotes,
      photos: inspection.photos
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta inspeção?')) return;
    
    const updatedInspections = inspections.filter(insp => insp.id !== id);
    setInspections(updatedInspections);
    saveInspections(updatedInspections);
  };

  const resetForm = () => {
    setFormData({
      orderId: '', internalReference: '', inspector: '', priority: 'medium',
      visualInspection: { surfaceQuality: 'good', colorConsistency: 'good', bubblePresence: 'minimal', notes: '' },
      dimensionalInspection: { lengthTolerance: 0, widthTolerance: 0, heightTolerance: 0, withinTolerance: true, notes: '' },
      densityTest: { expectedDensity: 0, measuredDensity: 0, withinRange: true, notes: '' },
      compressionTest: { compressionForce: 0, deformation: 0, recoveryTime: 0, passed: true, notes: '' },
      finalResult: 'approved', overallNotes: '', photos: []
    });
    setEditingInspection(null);
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.internalReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.foamType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    pending: { color: "text-gray-600 bg-gray-50", label: "Pendente" },
    in_progress: { color: "text-blue-600 bg-blue-50", label: "Em Andamento" },
    approved: { color: "text-green-600 bg-green-50", label: "Aprovado" },
    rejected: { color: "text-red-600 bg-red-50", label: "Rejeitado" }
  };

  const priorityConfig = {
    low: { color: "text-green-600 bg-green-50", label: "Baixa" },
    medium: { color: "text-yellow-600 bg-yellow-50", label: "Média" },
    high: { color: "text-orange-600 bg-orange-50", label: "Alta" },
    urgent: { color: "text-red-600 bg-red-50", label: "Urgente" }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando sistema de qualidade...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Qualidade</h1>
          <p className="text-muted-foreground">
            Inspeções de qualidade para blocos de espuma
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Inspeção
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">{inspections.length}</p>
            </div>
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-bold text-green-600">
                {inspections.filter(i => i.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-blue-600">
                {inspections.filter(i => i.status === 'pending' || i.status === 'in_progress').length}
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejeitadas</p>
              <p className="text-2xl font-bold text-red-600">
                {inspections.filter(i => i.status === 'rejected').length}
              </p>
            </div>
            <X className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar inspeções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background min-w-[150px]"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Andamento</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
        </select>
      </div>

      {/* Inspections List */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Ordem</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Tipo de Espuma</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Blocos</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Inspetor</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((inspection) => (
                <tr key={inspection.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-card-foreground">{inspection.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{inspection.internalReference}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-card-foreground">{inspection.foamType}</td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-medium">{inspection.blockQuantity} blocos</div>
                      <div className="text-muted-foreground">
                        {inspection.blockDimensions.length/1000}×{inspection.blockDimensions.width/1000}×{inspection.blockDimensions.height/1000}m
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-card-foreground">{inspection.inspector}</td>
                  <td className="p-4">
                    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", statusConfig[inspection.status].color)}>
                      {statusConfig[inspection.status].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", priorityConfig[inspection.priority].color)}>
                      {priorityConfig[inspection.priority].label}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(inspection.inspectionDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(inspection)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inspection.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInspections.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              {searchTerm || statusFilter !== 'all'
                ? 'Nenhuma inspeção encontrada'
                : 'Nenhuma inspeção registrada'
              }
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando a primeira inspeção de qualidade'
              }
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingInspection ? 'Editar Inspeção' : 'Nova Inspeção de Qualidade'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ordem de Produção *</label>
                    <select
                      value={formData.orderId}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="">Selecione uma ordem</option>
                      {productionOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Referência Interna</label>
                    <input
                      type="text"
                      value={formData.internalReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalReference: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: REF-ESP-001"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Inspetor *</label>
                    <input
                      type="text"
                      value={formData.inspector}
                      onChange={(e) => setFormData(prev => ({ ...prev, inspector: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Nome do inspetor"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Prioridade</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>

                {/* Visual Inspection */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-4">Inspeção Visual</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Qualidade da Superfície</label>
                      <select
                        value={formData.visualInspection.surfaceQuality}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          visualInspection: { ...prev.visualInspection, surfaceQuality: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="excellent">Excelente</option>
                        <option value="good">Boa</option>
                        <option value="acceptable">Aceitável</option>
                        <option value="poor">Ruim</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Consistência de Cor</label>
                      <select
                        value={formData.visualInspection.colorConsistency}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          visualInspection: { ...prev.visualInspection, colorConsistency: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="excellent">Excelente</option>
                        <option value="good">Boa</option>
                        <option value="acceptable">Aceitável</option>
                        <option value="poor">Ruim</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Presença de Bolhas</label>
                      <select
                        value={formData.visualInspection.bubblePresence}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          visualInspection: { ...prev.visualInspection, bubblePresence: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="none">Nenhuma</option>
                        <option value="minimal">Mínimas</option>
                        <option value="moderate">Moderadas</option>
                        <option value="excessive">Excessivas</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Observações Visuais</label>
                    <textarea
                      value={formData.visualInspection.notes}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        visualInspection: { ...prev.visualInspection, notes: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Density Test */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-4">Teste de Densidade</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Densidade Esperada (kg/m³)</label>
                      <input
                        type="number"
                        value={formData.densityTest.expectedDensity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          densityTest: { ...prev.densityTest, expectedDensity: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Densidade Medida (kg/m³)</label>
                      <input
                        type="number"
                        value={formData.densityTest.measuredDensity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          densityTest: { ...prev.densityTest, measuredDensity: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Dentro da Tolerância</label>
                      <select
                        value={formData.densityTest.withinRange ? 'true' : 'false'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          densityTest: { ...prev.densityTest, withinRange: e.target.value === 'true' }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Final Result */}
                <div className="border rounded-lg p-4">
                  <h4 className="text-lg font-medium mb-4">Resultado Final</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Resultado</label>
                      <select
                        value={formData.finalResult}
                        onChange={(e) => setFormData(prev => ({ ...prev, finalResult: e.target.value as any }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="approved">Aprovado</option>
                        <option value="approved_with_restrictions">Aprovado com Restrições</option>
                        <option value="rejected">Rejeitado</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Observações Gerais</label>
                    <textarea
                      value={formData.overallNotes}
                      onChange={(e) => setFormData(prev => ({ ...prev, overallNotes: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      rows={3}
                      placeholder="Observações gerais sobre a inspeção..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    {editingInspection ? 'Atualizar' : 'Criar'} Inspeção
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
