import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Camera,
  Upload,
  Download,
  Eye,
  X,
  Settings
} from 'lucide-react';
import { ProductSheet, FoamType } from '@/types/production';
import { productionService } from '@/services/productionService';
import { cn } from '@/lib/utils';

interface ProductSheetsManagerProps {
  onClose?: () => void;
}

export function ProductSheetsManager({ onClose }: ProductSheetsManagerProps) {
  const [productSheets, setProductSheets] = useState<ProductSheet[]>([]);
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSheet, setEditingSheet] = useState<ProductSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFoamTypeForm, setShowFoamTypeForm] = useState(false);
  const [editingFoamType, setEditingFoamType] = useState<FoamType | null>(null);

  const [newFoamType, setNewFoamType] = useState({
    name: '',
    density: 0,
    hardness: '',
    color: '',
    specifications: '',
    pricePerM3: 0
  });

  const [formData, setFormData] = useState({
    internalReference: '',
    foamTypeId: '',
    standardDimensions: { length: 0, width: 0, height: 0 },
    description: '',
    documents: [] as string[],
    photos: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sheets, foams] = await Promise.all([
        productionService.getProductSheets(),
        productionService.getFoamTypes()
      ]);
      setProductSheets(sheets);
      setFoamTypes(foams);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.internalReference || !formData.foamTypeId) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const foamType = foamTypes.find(f => f.id === formData.foamTypeId);
    if (!foamType) return;

    try {
      const sheetData = {
        internalReference: formData.internalReference,
        foamType,
        standardDimensions: formData.standardDimensions,
        description: formData.description,
        documents: formData.documents,
        photos: formData.photos
      };

      if (editingSheet) {
        // Update existing sheet
        const updatedSheet = await productionService.updateProductSheet(editingSheet.id, sheetData);
        setProductSheets(prev => prev.map(s => s.id === editingSheet.id ? updatedSheet : s));
      } else {
        // Create new sheet
        const newSheet = await productionService.createProductSheet(sheetData);
        setProductSheets(prev => [...prev, newSheet]);
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar ficha técnica:', error);
      alert('Erro ao salvar ficha técnica');
    }
  };

  const resetForm = () => {
    setFormData({
      internalReference: '',
      foamTypeId: '',
      standardDimensions: { length: 0, width: 0, height: 0 },
      description: '',
      documents: [],
      photos: []
    });
    setEditingSheet(null);
  };

  const handleEdit = (sheet: ProductSheet) => {
    setEditingSheet(sheet);
    setFormData({
      internalReference: sheet.internalReference,
      foamTypeId: sheet.foamType.id,
      standardDimensions: sheet.standardDimensions,
      description: sheet.description,
      documents: sheet.documents,
      photos: sheet.photos
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha técnica?')) return;
    
    try {
      await productionService.deleteProductSheet(id);
      setProductSheets(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Erro ao excluir ficha técnica:', error);
      alert('Erro ao excluir ficha técnica');
    }
  };

  const handleFileUpload = (type: 'documents' | 'photos', file: File) => {
    // Simular upload de arquivo
    const fileUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], fileUrl]
    }));
  };

  const removeFile = (type: 'documents' | 'photos', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Funções para tipos de espuma
  const handleAddFoamType = async () => {
    if (!newFoamType.name || !newFoamType.density || !newFoamType.pricePerM3) {
      alert('Preencha pelo menos nome, densidade e preço');
      return;
    }

    try {
      if (editingFoamType) {
        await productionService.updateFoamType(editingFoamType.id, newFoamType);
      } else {
        await productionService.createFoamType(newFoamType);
      }

      // Recarregar tipos de espuma
      const updatedFoamTypes = await productionService.getFoamTypes();
      setFoamTypes(updatedFoamTypes);

      setNewFoamType({
        name: '', density: 0, hardness: '', color: '', specifications: '', pricePerM3: 0
      });
      setShowFoamTypeForm(false);
      setEditingFoamType(null);
    } catch (error) {
      console.error('Erro ao salvar tipo de espuma:', error);
      alert('Erro ao salvar tipo de espuma');
    }
  };

  const handleEditFoamType = (foamType: FoamType) => {
    setEditingFoamType(foamType);
    setNewFoamType({
      name: foamType.name,
      density: foamType.density,
      hardness: foamType.hardness,
      color: foamType.color,
      specifications: foamType.specifications,
      pricePerM3: foamType.pricePerM3
    });
    setShowFoamTypeForm(true);
  };

  const handleDeleteFoamType = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de espuma?')) return;

    try {
      await productionService.deleteFoamType(id);
      const updatedFoamTypes = await productionService.getFoamTypes();
      setFoamTypes(updatedFoamTypes);
    } catch (error) {
      console.error('Erro ao excluir tipo de espuma:', error);
      alert('Erro ao excluir tipo de espuma');
    }
  };

  const filteredSheets = productSheets.filter(sheet =>
    sheet.internalReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.foamType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando fichas técnicas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fichas Técnicas de Produtos</h2>
          <p className="text-muted-foreground">Gestão de fichas técnicas para tipos de espuma</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFoamTypeForm(true)}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Tipos de Espuma
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Ficha Técnica
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar fichas técnicas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingSheet ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
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
                    <label className="block text-sm font-medium mb-2">Referência Interna *</label>
                    <input
                      type="text"
                      value={formData.internalReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, internalReference: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: ESP-D20-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo de Espuma *</label>
                    <select
                      value={formData.foamTypeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, foamTypeId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="">Selecione um tipo de espuma</option>
                      {foamTypes.map(foam => (
                        <option key={foam.id} value={foam.id}>
                          {foam.name} - D{foam.density} ({foam.color})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dimensões Padrão (mm)</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Comprimento</label>
                      <input
                        type="number"
                        value={formData.standardDimensions.length}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          standardDimensions: { ...prev.standardDimensions, length: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Largura</label>
                      <input
                        type="number"
                        value={formData.standardDimensions.width}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          standardDimensions: { ...prev.standardDimensions, width: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Altura</label>
                      <input
                        type="number"
                        value={formData.standardDimensions.height}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          standardDimensions: { ...prev.standardDimensions, height: Number(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    rows={3}
                    placeholder="Descrição detalhada do produto..."
                  />
                </div>

                {/* Documentos */}
                <div>
                  <label className="block text-sm font-medium mb-2">Documentos</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('documents', file);
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg bg-background"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 flex items-center gap-1"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                    </div>
                    {formData.documents.length > 0 && (
                      <div className="space-y-1">
                        {formData.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Documento {index + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile('documents', index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fotos */}
                <div>
                  <label className="block text-sm font-medium mb-2">Fotos</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('photos', file);
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg bg-background"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 flex items-center gap-1"
                      >
                        <Camera className="h-4 w-4" />
                        Câmera
                      </button>
                    </div>
                    {formData.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img
                              src={photo}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile('photos', index)}
                              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
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
                    {editingSheet ? 'Atualizar' : 'Criar'} Ficha Técnica
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Fichas Técnicas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSheets.map(sheet => (
          <div key={sheet.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-card-foreground">{sheet.internalReference}</h3>
                <p className="text-sm text-muted-foreground">{sheet.foamType.name}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(sheet)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(sheet.id)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Dimensões: </span>
                <span className="text-card-foreground">
                  {sheet.standardDimensions.length} × {sheet.standardDimensions.width} × {sheet.standardDimensions.height} mm
                </span>
              </div>
              
              <div>
                <span className="text-muted-foreground">Densidade: </span>
                <span className="text-card-foreground">D{sheet.foamType.density}</span>
              </div>

              {sheet.description && (
                <p className="text-muted-foreground text-xs line-clamp-2">{sheet.description}</p>
              )}

              <div className="flex items-center gap-4 pt-2">
                {sheet.documents.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {sheet.documents.length} doc(s)
                  </div>
                )}
                {sheet.photos.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Camera className="h-3 w-3" />
                    {sheet.photos.length} foto(s)
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSheets.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">
            {searchTerm ? 'Nenhuma ficha técnica encontrada' : 'Nenhuma ficha técnica cadastrada'}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? 'Tente ajustar os termos de busca'
              : 'Comece criando sua primeira ficha técnica de produto'
            }
          </p>
        </div>
      )}

      {/* Modal de Gestão de Tipos de Espuma */}
      {showFoamTypeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingFoamType ? 'Editar Tipo de Espuma' : 'Gestão de Tipos de Espuma'}
                </h3>
                <button
                  onClick={() => {
                    setShowFoamTypeForm(false);
                    setEditingFoamType(null);
                    setNewFoamType({
                      name: '', density: 0, hardness: '', color: '', specifications: '', pricePerM3: 0
                    });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Lista de Tipos Existentes */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">Tipos de Espuma Existentes</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {foamTypes.map(foamType => (
                    <div key={foamType.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-semibold">{foamType.name}</h5>
                          <p className="text-sm text-muted-foreground">
                            D{foamType.density} - {foamType.color} - {foamType.hardness}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditFoamType(foamType)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteFoamType(foamType.id)}
                            className="p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>Preço: €{foamType.pricePerM3.toFixed(2)}/m³</div>
                        <div>{foamType.specifications}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="my-6" />

              {/* Formulário de Novo/Editar Tipo */}
              <div>
                <h4 className="text-lg font-medium mb-4">
                  {editingFoamType ? 'Editar Tipo' : 'Adicionar Novo Tipo'}
                </h4>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nome do Tipo *</label>
                      <input
                        type="text"
                        value={newFoamType.name}
                        onChange={(e) => setNewFoamType(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Ex: Espuma D25"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Densidade *</label>
                      <input
                        type="number"
                        value={newFoamType.density}
                        onChange={(e) => setNewFoamType(prev => ({ ...prev, density: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Ex: 25"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium mb-2">Dureza</label>
                      <select
                        value={newFoamType.hardness}
                        onChange={(e) => setNewFoamType(prev => ({ ...prev, hardness: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="">Selecionar dureza</option>
                        <option value="Muito Macia">Muito Macia</option>
                        <option value="Macia">Macia</option>
                        <option value="Média">Média</option>
                        <option value="Dura">Dura</option>
                        <option value="Extra Dura">Extra Dura</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Cor</label>
                      <input
                        type="text"
                        value={newFoamType.color}
                        onChange={(e) => setNewFoamType(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                        placeholder="Ex: Branca, Amarela, Azul"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Preço por m³ (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newFoamType.pricePerM3}
                      onChange={(e) => setNewFoamType(prev => ({ ...prev, pricePerM3: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      placeholder="Ex: 45.00"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Especificações</label>
                    <textarea
                      value={newFoamType.specifications}
                      onChange={(e) => setNewFoamType(prev => ({ ...prev, specifications: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      rows={3}
                      placeholder="Descrição técnica detalhada..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                  <button
                    onClick={() => {
                      setEditingFoamType(null);
                      setNewFoamType({
                        name: '', density: 0, hardness: '', color: '', specifications: '', pricePerM3: 0
                      });
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddFoamType}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    {editingFoamType ? 'Atualizar' : 'Adicionar'} Tipo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
