import { useState, useEffect } from 'react';
import { 
  Plus, 
  Save, 
  X, 
  Trash2, 
  Edit, 
  Copy,
  AlertCircle,
  Factory,
  Calendar,
  User,
  Package,
  Settings
} from 'lucide-react';
import { ProductionOrder, ProductionOrderLine, FoamType, Machine, CuttingOperation } from '@/types/production';
import { productionService } from '@/services/productionService';
import { cn } from '@/lib/utils';

interface ProductionOrderManagerProps {
  onClose?: () => void;
  editingOrder?: ProductionOrder | null;
}

export function ProductionOrderManager({ onClose, editingOrder }: ProductionOrderManagerProps) {
  const [foamTypes, setFoamTypes] = useState<FoamType[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    orderNumber: '',
    customer: { id: '', name: '', contact: '' },
    expectedDeliveryDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: ''
  });

  const [lines, setLines] = useState<ProductionOrderLine[]>([]);

  useEffect(() => {
    loadData();
    if (editingOrder) {
      loadEditingOrder(editingOrder);
    }
  }, [editingOrder]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foams, machinesData] = await Promise.all([
        productionService.getFoamTypes(),
        productionService.getMachines()
      ]);
      setFoamTypes(foams);
      setMachines(machinesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEditingOrder = (order: ProductionOrder) => {
    setFormData({
      orderNumber: order.orderNumber,
      customer: order.customer,
      expectedDeliveryDate: order.expectedDeliveryDate.split('T')[0],
      priority: order.priority,
      notes: order.notes || ''
    });
    setLines(order.lines);
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OP-${year}${month}${day}-${sequence}`;
  };

  const addNewLine = () => {
    const newLine: ProductionOrderLine = {
      id: Date.now().toString(),
      foamType: foamTypes[0] || {} as FoamType,
      initialDimensions: { length: 40000, width: 2000, height: 2000 },
      finalDimensions: { length: 1000, width: 500, height: 200 },
      quantity: 1,
      completedQuantity: 0,
      cuttingOperations: [],
      status: 'pending',
      priority: 5
    };
    setLines(prev => [...prev, newLine]);
  };

  const updateLine = (lineId: string, updates: Partial<ProductionOrderLine>) => {
    setLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, ...updates } : line
    ));
  };

  const removeLine = (lineId: string) => {
    setLines(prev => prev.filter(line => line.id !== lineId));
  };

  const addOperationToLine = (lineId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    const newOperation: CuttingOperation = {
      id: Date.now().toString(),
      machineId: machines[0]?.id || '',
      inputDimensions: line.initialDimensions,
      outputDimensions: line.finalDimensions,
      quantity: line.quantity,
      completedQuantity: 0,
      estimatedTime: 60,
      status: 'pending',
      observations: ''
    };

    updateLine(lineId, {
      cuttingOperations: [...line.cuttingOperations, newOperation]
    });
  };

  const updateOperation = (lineId: string, operationId: string, updates: Partial<CuttingOperation>) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    const updatedOperations = line.cuttingOperations.map(op =>
      op.id === operationId ? { ...op, ...updates } : op
    );

    updateLine(lineId, { cuttingOperations: updatedOperations });
  };

  const removeOperation = (lineId: string, operationId: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    const updatedOperations = line.cuttingOperations.filter(op => op.id !== operationId);
    updateLine(lineId, { cuttingOperations: updatedOperations });
  };

  const calculateTotalVolume = () => {
    return lines.reduce((total, line) => {
      const volume = (line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.quantity) / 1000000000;
      return total + volume;
    }, 0);
  };

  const calculateEstimatedCost = () => {
    return lines.reduce((total, line) => {
      const volume = (line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.quantity) / 1000000000;
      return total + (volume * line.foamType.pricePerM3);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.orderNumber || !formData.customer.name || !formData.expectedDeliveryDate || lines.length === 0) {
      alert('Preencha todos os campos obrigatórios e adicione pelo menos uma linha');
      return;
    }

    // Validar se todas as linhas têm pelo menos uma operação
    const linesWithoutOperations = lines.filter(line => line.cuttingOperations.length === 0);
    if (linesWithoutOperations.length > 0) {
      alert('Todas as linhas devem ter pelo menos uma operação de corte');
      return;
    }

    try {
      const orderData = {
        orderNumber: formData.orderNumber,
        customer: formData.customer,
        expectedDeliveryDate: new Date(formData.expectedDeliveryDate).toISOString(),
        lines,
        status: 'created' as const,
        priority: formData.priority,
        totalVolume: calculateTotalVolume(),
        estimatedCost: calculateEstimatedCost(),
        notes: formData.notes,
        createdBy: 'Admin' // Em produção, pegar do contexto do usuário
      };

      if (editingOrder) {
        await productionService.updateProductionOrder(editingOrder.id, orderData);
        alert('Ordem de produção atualizada com sucesso!');
      } else {
        await productionService.createProductionOrder(orderData);
        alert('Ordem de produção criada com sucesso!');
      }

      if (onClose) onClose();
    } catch (error) {
      console.error('Erro ao salvar ordem de produção:', error);
      alert('Erro ao salvar ordem de produção');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-background rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {editingOrder ? 'Editar Ordem de Produção' : 'Nova Ordem de Produção'}
              </h2>
              <p className="text-muted-foreground">Sistema de corte de espuma</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dados Básicos */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dados Básicos da Ordem
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número da OP *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                      className="flex-1 px-3 py-2 border rounded-lg bg-background"
                      placeholder="OP-AAAAMMDD-XXX"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, orderNumber: generateOrderNumber() }))}
                      className="px-3 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                      title="Gerar automaticamente"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cliente *</label>
                  <input
                    type="text"
                    value={formData.customer.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      customer: { ...prev.customer, name: e.target.value, id: e.target.value.toLowerCase().replace(/\s/g, '_') }
                    }))}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Nome do cliente"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Data de Entrega *</label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
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

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  rows={2}
                  placeholder="Observações adicionais sobre a ordem..."
                />
              </div>
            </div>

            {/* Linhas de Produção */}
            <div className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Linhas de Produção ({lines.length})
                </h3>
                <button
                  type="button"
                  onClick={addNewLine}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Linha
                </button>
              </div>

              {lines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma linha de produção adicionada</p>
                  <p className="text-sm">Clique em "Adicionar Linha" para começar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {lines.map((line, lineIndex) => (
                    <div key={line.id} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Linha {lineIndex + 1}</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addOperationToLine(line.id)}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Operação
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Dados da Linha */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Tipo de Espuma</label>
                          <select
                            value={line.foamType.id}
                            onChange={(e) => {
                              const foamType = foamTypes.find(f => f.id === e.target.value);
                              if (foamType) updateLine(line.id, { foamType });
                            }}
                            className="w-full px-3 py-2 border rounded bg-background text-sm"
                          >
                            {foamTypes.map(foam => (
                              <option key={foam.id} value={foam.id}>
                                {foam.name} - D{foam.density}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Quantidade</label>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded bg-background text-sm"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Prioridade</label>
                          <input
                            type="number"
                            value={line.priority}
                            onChange={(e) => updateLine(line.id, { priority: Number(e.target.value) })}
                            className="w-full px-3 py-2 border rounded bg-background text-sm"
                            min="1"
                            max="10"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="text-sm">
                            <div className="font-medium">Volume: {((line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.quantity) / 1000000000).toFixed(3)} m³</div>
                            <div className="text-muted-foreground">Custo: €{((line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.quantity) / 1000000000 * line.foamType.pricePerM3).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Dimensões */}
                      <div className="grid gap-4 md:grid-cols-2 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Dimensões Iniciais (mm)</label>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              placeholder="Comprimento"
                              value={line.initialDimensions.length}
                              onChange={(e) => updateLine(line.id, {
                                initialDimensions: { ...line.initialDimensions, length: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Largura"
                              value={line.initialDimensions.width}
                              onChange={(e) => updateLine(line.id, {
                                initialDimensions: { ...line.initialDimensions, width: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Altura"
                              value={line.initialDimensions.height}
                              onChange={(e) => updateLine(line.id, {
                                initialDimensions: { ...line.initialDimensions, height: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Dimensões Finais (mm)</label>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="number"
                              placeholder="Comprimento"
                              value={line.finalDimensions.length}
                              onChange={(e) => updateLine(line.id, {
                                finalDimensions: { ...line.finalDimensions, length: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Largura"
                              value={line.finalDimensions.width}
                              onChange={(e) => updateLine(line.id, {
                                finalDimensions: { ...line.finalDimensions, width: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Altura"
                              value={line.finalDimensions.height}
                              onChange={(e) => updateLine(line.id, {
                                finalDimensions: { ...line.finalDimensions, height: Number(e.target.value) }
                              })}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Operações de Corte */}
                      {line.cuttingOperations.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-3">Operações de Corte ({line.cuttingOperations.length})</h5>
                          <div className="space-y-3">
                            {line.cuttingOperations.map((operation, opIndex) => (
                              <div key={operation.id} className="border rounded p-3 bg-background">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium">Operação {opIndex + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeOperation(line.id, operation.id)}
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                      <label className="block text-xs font-medium mb-1">Máquina</label>
                                      <select
                                        value={operation.machineId}
                                        onChange={(e) => updateOperation(line.id, operation.id, { machineId: e.target.value })}
                                        className="w-full px-2 py-1 border rounded bg-background text-sm"
                                      >
                                        {machines.map(machine => (
                                          <option key={machine.id} value={machine.id}>
                                            {machine.name} ({machine.type})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium mb-1">
                                        {(() => {
                                          const machine = machines.find(m => m.id === operation.machineId);
                                          if (machine?.type === 'CAROUSEL' || machine?.type === 'PRE_CNC') {
                                            return 'Quantidade de Coxins';
                                          } else if (machine?.type === 'CNC') {
                                            return 'Quantidade';
                                          } else {
                                            return 'Quantidade';
                                          }
                                        })()}
                                      </label>
                                      <input
                                        type="number"
                                        value={operation.quantity}
                                        onChange={(e) => updateOperation(line.id, operation.id, { quantity: Number(e.target.value) })}
                                        className="w-full px-2 py-1 border rounded bg-background text-sm"
                                        min="1"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-medium mb-1">Tempo Estimado (min)</label>
                                      <input
                                        type="number"
                                        value={operation.estimatedTime}
                                        onChange={(e) => updateOperation(line.id, operation.id, { estimatedTime: Number(e.target.value) })}
                                        className="w-full px-2 py-1 border rounded bg-background text-sm"
                                        min="1"
                                      />
                                    </div>
                                  </div>

                                  {/* Medidas Finais - só mostrar para Carrossel, Pré-CNC e CNC */}
                                  {(() => {
                                    const machine = machines.find(m => m.id === operation.machineId);
                                    if (machine?.type === 'CAROUSEL' || machine?.type === 'PRE_CNC' || machine?.type === 'CNC') {
                                      return (
                                        <div>
                                          <label className="block text-xs font-medium mb-2">
                                            Medidas Finais (mm) - Comprimento × Largura × Espessura
                                          </label>
                                          <div className="grid grid-cols-3 gap-2">
                                            <input
                                              type="number"
                                              placeholder="Comprimento"
                                              value={operation.outputDimensions.length}
                                              onChange={(e) => updateOperation(line.id, operation.id, {
                                                outputDimensions: { ...operation.outputDimensions, length: Number(e.target.value) }
                                              })}
                                              className="px-2 py-1 border rounded bg-background text-xs"
                                            />
                                            <input
                                              type="number"
                                              placeholder="Largura"
                                              value={operation.outputDimensions.width}
                                              onChange={(e) => updateOperation(line.id, operation.id, {
                                                outputDimensions: { ...operation.outputDimensions, width: Number(e.target.value) }
                                              })}
                                              className="px-2 py-1 border rounded bg-background text-xs"
                                            />
                                            <input
                                              type="number"
                                              placeholder="Espessura"
                                              value={operation.outputDimensions.height}
                                              onChange={(e) => updateOperation(line.id, operation.id, {
                                                outputDimensions: { ...operation.outputDimensions, height: Number(e.target.value) }
                                              })}
                                              className="px-2 py-1 border rounded bg-background text-xs"
                                            />
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                  {/* Observações */}
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Observações para o Operador</label>
                                    <textarea
                                      value={operation.observations || ''}
                                      onChange={(e) => updateOperation(line.id, operation.id, { observations: e.target.value })}
                                      className="w-full px-2 py-1 border rounded bg-background text-xs"
                                      rows={2}
                                      placeholder="Instruções específicas para esta operação..."
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {line.cuttingOperations.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground border border-dashed rounded">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma operação de corte definida</p>
                          <p className="text-xs">Adicione pelo menos uma operação para esta linha</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo */}
            {lines.length > 0 && (
              <div className="border rounded-lg p-6 bg-muted/30">
                <h3 className="text-lg font-semibold mb-4">Resumo da Ordem</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total de Linhas</div>
                    <div className="text-xl font-bold">{lines.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Volume Total</div>
                    <div className="text-xl font-bold">{calculateTotalVolume().toFixed(3)} m³</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Custo Estimado</div>
                    <div className="text-xl font-bold">€{calculateEstimatedCost().toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total de Operações</div>
                    <div className="text-xl font-bold">{lines.reduce((total, line) => total + line.cuttingOperations.length, 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border rounded-lg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingOrder ? 'Atualizar' : 'Criar'} Ordem
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
