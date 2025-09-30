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
  onOrderCreated?: () => void;
  initialLines?: ProductionOrderLine[];
}

export function ProductionOrderManager({ onClose, editingOrder, onOrderCreated }: ProductionOrderManagerProps) {
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

  // Preencher com linhas de nesting quando não está a editar
  useEffect(() => {
    if (!editingOrder && initialLines && initialLines.length > 0) {
      setLines(initialLines);
    }
  }, [editingOrder, initialLines]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foams, machinesData] = await Promise.all([
        productionService.getFoamTypes(),
        productionService.getMachines()
      ]);

      // Verificação defensiva para garantir arrays válidos
      const safeFoams = Array.isArray(foams) ? foams.filter(foam =>
        foam && typeof foam === 'object' && foam.id && foam.name
      ) : [];

      const safeMachines = Array.isArray(machinesData) ? machinesData.filter(machine =>
        machine && typeof machine === 'object' && machine.id && machine.name
      ) : [];

      setFoamTypes(safeFoams);
      setMachines(safeMachines);
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

    // Adicionar automaticamente operação BZM
    const bzmMachine = machines.find(m => m.type === 'BZM');
    if (bzmMachine) {
      const bzmOperation: CuttingOperation = {
        id: Date.now().toString() + '-bzm',
        machineId: bzmMachine.id,
        inputDimensions: newLine.initialDimensions,
        outputDimensions: newLine.finalDimensions,
        quantity: newLine.quantity,
        completedQuantity: 0,
        estimatedTime: 30,
        status: 'pending',
        observations: 'Corte inicial do bloco de espuma'
      };
      newLine.cuttingOperations = [bzmOperation];
    }

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
      inputDimensions: line.finalDimensions, // Use dimensões finais da linha como entrada da operação
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

  const calculateTotalLength = () => {
    return lines.reduce((total, line) => {
      // Comprimento em metros = (comprimento final em mm × quantidade de blocos) / 1000
      const lengthMeters = (line.finalDimensions.length * line.quantity) / 1000;
      return total + lengthMeters;
    }, 0);
  };

  const calculateEstimatedCost = () => {
    return lines.reduce((total, line) => {
      const volume = (line.finalDimensions.length * line.finalDimensions.width * line.finalDimensions.height * line.quantity) / 1000000000;
      return total + (volume * line.foamType.pricePerM3);
    }, 0);
  };

  // Helpers: cálculo de desperdício/aproveitamento com base na BZM
  const getMachineType = (machineId: string) => {
    const m = machines.find(mm => mm.id === machineId);
    return m?.type || 'UNKNOWN';
  };

  type WasteInfo = {
    opId: string;
    machineName: string;
    machineType: string;
    wasteLengthPctTotal: number;
    wasteWidthPctTotal: number;
    wasteHeightPctTotal: number;
    totalLengthUsed: number;
    totalLengthAvailable: number;
    totalHeightUsed: number;
    totalHeightAvailable: number;
    totalWidthUsed: number;
    totalWidthAvailable: number;
    alerts: string[];
  };

  const computeWasteForLine = (line: ProductionOrderLine): WasteInfo[] => {
    const infos: WasteInfo[] = [];
    // Base: dimensões finais da linha (saída da BZM) e nº de blocos
    const bzmDims = line.finalDimensions;
    const blocks = line.quantity || 0;

    // Acumuladores para aproveitamento total da linha (somar todas as operações downstream)
    let aggLenUsed = 0, aggWidUsed = 0, aggHeiUsed = 0;
    const unitAlerts: string[] = [];

    (line.cuttingOperations || []).forEach(op => {
      const type = getMachineType(op.machineId);
      if (type === 'BZM') return; // BZM é a referência
      if (!op.outputDimensions) return;
      if (!['CAROUSEL', 'PRE_CNC', 'CNC'].includes(type)) return;

      const out = op.outputDimensions;

      // Avisos unitários: comparar apenas medidas unitárias (não multiplicar por quantidade)
      if ((out.length || 0) > (bzmDims.length || 0)) unitAlerts.push('Comprimento superior ao das Medidas Finais');
      if ((out.width || 0) > (bzmDims.width || 0)) unitAlerts.push('Largura superior à das Medidas Finais');
      // Espessura: não avisamos unitário; apenas somatório para "espessura necessária"

      // Somatórios para desperdício (comprimento/largura) e para espessura necessária
      const qty = op.quantity || 0;
      aggLenUsed += qty * (out.length || 0);
      aggWidUsed += qty * (out.width || 0);
      aggHeiUsed += qty * (out.height || 0);
    });

    // Totais disponíveis por dimensão (com base na BZM x nº de blocos)
    const totalLengthAvailable = blocks * (bzmDims.length || 0);
    const totalWidthAvailable = blocks * (bzmDims.width || 0);
    const totalHeightAvailable = blocks * (bzmDims.height || 0);

    // Percentuais de desperdício (somente para cálculo de aproveitamento)
    const usedLenCapped = Math.min(aggLenUsed, totalLengthAvailable);
    const usedWidCapped = Math.min(aggWidUsed, totalWidthAvailable);
    const usedHeiCapped = Math.min(aggHeiUsed, totalHeightAvailable);

    const aggWasteLength = totalLengthAvailable > 0 ? (totalLengthAvailable - usedLenCapped) / totalLengthAvailable * 100 : 0;
    const aggWasteWidth = totalWidthAvailable > 0 ? (totalWidthAvailable - usedWidCapped) / totalWidthAvailable * 100 : 0;
    const aggWasteHeight = totalHeightAvailable > 0 ? (totalHeightAvailable - usedHeiCapped) / totalHeightAvailable * 100 : 0;

    // Alertas agregados: apenas espessura necessária pode exceder o disponível
    const aggAlerts: string[] = [...unitAlerts];
    if (aggHeiUsed > totalHeightAvailable) {
      aggAlerts.push(`Quantidade × espessura excede a disponível (${aggHeiUsed}mm > ${totalHeightAvailable}mm)`);
    }

    // Se existir pelo menos uma operação downstream, retornar apenas o total da linha
    if ((line.cuttingOperations || []).some(op => ['CAROUSEL', 'PRE_CNC', 'CNC'].includes(getMachineType(op.machineId)))) {
      infos.push({
        opId: 'TOTAL_LINHA',
        machineName: `Total da Linha`,
        machineType: 'AGREGADO',
        wasteLengthPctTotal: aggWasteLength,
        wasteWidthPctTotal: aggWasteWidth,
        wasteHeightPctTotal: aggWasteHeight,
        totalLengthUsed: aggLenUsed,
        totalLengthAvailable,
        totalHeightUsed: aggHeiUsed,
        totalHeightAvailable,
        totalWidthUsed: aggWidUsed,
        totalWidthAvailable,
        alerts: aggAlerts,
      });
    }

    return infos;
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
        const createdOrder = await productionService.createProductionOrder(orderData);
        console.log('✅ Order created successfully:', createdOrder.orderNumber);
        alert('Ordem de produção criada com sucesso!');
      }

      // Chamar callback para recarregar dados
      if (onOrderCreated) {
        onOrderCreated();
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
                            {(foamTypes || []).filter(foam => foam && foam.id && foam.name).map(foam => (
                              <option key={foam.id} value={foam.id}>
                                {foam.name} - D{foam.density || 'N/A'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Quantidade de Blocos</label>
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => {
                              const newQuantity = Number(e.target.value);
                              updateLine(line.id, { quantity: newQuantity });

                              // Atualizar quantidade na operação BZM automaticamente
                              const updatedOperations = line.cuttingOperations.map(op => {
                                const machine = machines.find(m => m.id === op.machineId);
                                if (machine?.type === 'BZM') {
                                  return { ...op, quantity: newQuantity };
                                }
                                return op;
                              });
                              updateLine(line.id, { cuttingOperations: updatedOperations });
                            }}
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
                              onChange={(e) => {
                                const newLength = Number(e.target.value);
                                const newFinalDimensions = { ...line.finalDimensions, length: newLength };

                                // Atualizar as dimensões de entrada/saída das operações conforme a máquina
                                const updatedOperations = line.cuttingOperations.map(op => {
                                  const machine = machines.find(m => m.id === op.machineId);
                                  if (!machine) return op;
                                  if (machine.type === 'BZM') {
                                    return { ...op, inputDimensions: newFinalDimensions, outputDimensions: newFinalDimensions };
                                  }
                                  if (machine.type === 'PRE_CNC' || machine.type === 'CNC') {
                                    return { ...op, inputDimensions: newFinalDimensions };
                                  }
                                  return op;
                                });

                                updateLine(line.id, {
                                  finalDimensions: newFinalDimensions,
                                  cuttingOperations: updatedOperations
                                });
                              }}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Largura"
                              value={line.finalDimensions.width}
                              onChange={(e) => {
                                const newWidth = Number(e.target.value);
                                const newFinalDimensions = { ...line.finalDimensions, width: newWidth };

                                // Atualizar as dimensões de entrada/saída das operações conforme a máquina
                                const updatedOperations = line.cuttingOperations.map(op => {
                                  const machine = machines.find(m => m.id === op.machineId);
                                  if (!machine) return op;
                                  if (machine.type === 'BZM') {
                                    return { ...op, inputDimensions: newFinalDimensions, outputDimensions: newFinalDimensions };
                                  }
                                  if (machine.type === 'PRE_CNC' || machine.type === 'CNC') {
                                    return { ...op, inputDimensions: newFinalDimensions };
                                  }
                                  return op;
                                });

                                updateLine(line.id, {
                                  finalDimensions: newFinalDimensions,
                                  cuttingOperations: updatedOperations
                                });
                              }}
                              className="px-2 py-1 border rounded bg-background text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Altura"
                              value={line.finalDimensions.height}
                              onChange={(e) => {
                                const newHeight = Number(e.target.value);
                                const newFinalDimensions = { ...line.finalDimensions, height: newHeight };

                                // Atualizar as dimensões de entrada/saída das operações conforme a máquina
                                const updatedOperations = line.cuttingOperations.map(op => {
                                  const machine = machines.find(m => m.id === op.machineId);
                                  if (!machine) return op;
                                  if (machine.type === 'BZM') {
                                    return { ...op, inputDimensions: newFinalDimensions, outputDimensions: newFinalDimensions };
                                  }
                                  if (machine.type === 'PRE_CNC' || machine.type === 'CNC') {
                                    return { ...op, inputDimensions: newFinalDimensions };
                                  }
                                  return op;
                                });

                                updateLine(line.id, {
                                  finalDimensions: newFinalDimensions,
                                  cuttingOperations: updatedOperations
                                });
                              }}
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
                                        onChange={(e) => {
                                          const selectedMachine = machines.find(m => m.id === e.target.value);
                                          const updates: Partial<CuttingOperation> = { machineId: e.target.value };

                                          // Para máquinas BZM, Pré-CNC e CNC, usar dimensões finais da linha como entrada
                                          if (selectedMachine && ['BZM', 'PRE_CNC', 'CNC'].includes(selectedMachine.type)) {
                                            updates.inputDimensions = line.finalDimensions;
                                          }
                                          // Se for BZM, a saída também acompanha as dimensões finais da linha
                                          if (selectedMachine && selectedMachine.type === 'BZM') {
                                            updates.outputDimensions = line.finalDimensions;
                                          }

                                          updateOperation(line.id, operation.id, updates);
                                        }}
                                        className="w-full px-2 py-1 border rounded bg-background text-sm"
                                      >
                                        {(machines || []).filter(machine => machine && machine.id && machine.name).map(machine => (
                                          <option key={machine.id} value={machine.id}>
                                            {machine.name} ({machine.type || 'N/A'})
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
                <div className="grid gap-4 md:grid-cols-5">
                  <div>
                    <div className="text-sm text-muted-foreground">Total de Linhas</div>
                    <div className="text-xl font-bold">{lines.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Comprimento Total</div>
                    <div className="text-xl font-bold text-blue-600">{calculateTotalLength().toFixed(2)} m</div>
                    <div className="text-xs text-muted-foreground">Dimensão final × blocos</div>
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

            {/* Resumo de Aproveitamento e Desperdício */}
            {lines.length > 0 && (
              <div className="border rounded-lg p-6 bg-muted/20">
                <h3 className="text-lg font-semibold mb-4">Aproveitamento por Linha (BZM vs Operações Seguintes)</h3>
                <div className="space-y-4">
                  {lines.map((line, idx) => {
                    const infos = computeWasteForLine(line);
                    const hasDownstream = infos.length > 0;
                    return (
                      <div key={line.id} className="p-4 rounded-lg border bg-background">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">Linha {idx + 1}</div>
                          <div className="text-xs text-muted-foreground">Blocos BZM: {line.quantity}</div>
                        </div>
                        {!hasDownstream ? (
                          <div className="text-sm text-muted-foreground">Apenas BZM — sem desperdício adicional calculado.</div>
                        ) : (
                          <div className="space-y-2">
                            {infos.map(info => (
                              <div key={info.opId} className="text-sm">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{info.machineName} ({info.machineType})</div>
                                  <div className="text-xs text-muted-foreground">Qtd OP: {(line.cuttingOperations || []).find(o => o.id === info.opId)?.quantity || 0}</div>
                                </div>
                                <div className="grid gap-2 md:grid-cols-4 mt-1">
                                  <div>
                                    <div className="text-xs text-muted-foreground">Desperdício Comprimento (total)</div>
                                    <div className="font-medium">{info.wasteLengthPctTotal.toFixed(1)}%</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Desperdício Largura (total)</div>
                                    <div className="font-medium">{info.wasteWidthPctTotal.toFixed(1)}%</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Desperdício Espessura (total)</div>
                                    <div className="font-medium">{info.wasteHeightPctTotal.toFixed(1)}%</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">Espessura Necessária</div>
                                    <div className="font-medium">{info.totalHeightUsed}mm de {info.totalHeightAvailable}mm</div>
                                  </div>
                                </div>
                                {info.alerts.length > 0 && (
                                  <ul className="mt-2 text-xs text-red-600 list-disc pl-4">
                                    {info.alerts.map((a, i) => (
                                      <li key={i}>{a}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
