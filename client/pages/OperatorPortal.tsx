import { useState, useEffect } from 'react';
import {
  User,
  Factory,
  Play,
  Square,
  CheckCircle,
  Clock,
  Package,
  Search,
  Filter,
  MessageCircle,
  AlertTriangle,
  Target,
  Timer,
  Calendar,
  ChevronRight,
  ArrowRight,
  Settings,
  Printer,
  Eye,
  Download
} from 'lucide-react';
import { Machine, OperatorWorkItem, OperatorSession, ChatMessage, PrintLabel } from '@/types/production';
import { productionService } from '@/services/productionService';
import { labelService } from '@/services/labelService';
import { cn } from '@/lib/utils';

interface OperatorPortalProps {
  onClose?: () => void;
}

function OperatorPortal({ onClose }: OperatorPortalProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workItems, setWorkItems] = useState<OperatorWorkItem[]>([]);
  const [currentSession, setCurrentSession] = useState<OperatorSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [operatorData, setOperatorData] = useState({
    id: '',
    name: ''
  });
  
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [completionQuantity, setCompletionQuantity] = useState<{ [key: string]: number }>({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<PrintLabel | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Atualizar a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadWorkItems();
      // Auto-refresh mais frequente para work items
      const interval = setInterval(loadWorkItems, 3000); // A cada 3 segundos
      return () => clearInterval(interval);
    }
  }, [selectedMachine]);

  const loadData = async () => {
    try {
      setLoading(true);
      const machinesData = await productionService.getMachines();
      setMachines(machinesData);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkItems = async () => {
    if (!selectedMachine) return;
    
    try {
      const items = await productionService.getOperatorWorkItems(selectedMachine);
      setWorkItems(items);
      
      // Carregar mensagens para a máquina
      const machineMessages = await productionService.getChatMessages(selectedMachine);
      setMessages(machineMessages);

      // Auto-refresh das mensagens a cada 3 segundos
      const chatInterval = setInterval(async () => {
        const updatedMessages = await productionService.getChatMessages(selectedMachine);

        // Marcar como lidas as mensagens novas do backend
        const newBackendMessages = updatedMessages.filter(msg =>
          msg.from === 'backend' && !msg.isRead &&
          !messages.find(oldMsg => oldMsg.id === msg.id)
        );

        for (const msg of newBackendMessages) {
          await productionService.markMessageAsRead(msg.id);
        }

        setMessages(updatedMessages);
      }, 3000);

      return () => clearInterval(chatInterval);
    } catch (error) {
      console.error('Erro ao carregar itens de trabalho:', error);
    }
  };

  const startSession = async () => {
    if (!operatorData.id || !operatorData.name || !selectedMachine) {
      alert('Preencha seus dados e selecione uma máquina');
      return;
    }

    try {
      const session = await productionService.startOperatorSession(
        operatorData.id,
        operatorData.name,
        selectedMachine
      );
      setCurrentSession(session);
      await loadData(); // Recarregar para atualizar status das máquinas
      await loadWorkItems();
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      alert('Erro ao iniciar sessão');
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      await productionService.endOperatorSession(currentSession.id);
      setCurrentSession(null);
      setSelectedMachine('');
      await loadData();
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      alert('Erro ao encerrar sessão');
    }
  };

  const completeWorkItem = async (workItem: OperatorWorkItem) => {
    const quantity = completionQuantity[workItem.id] || workItem.remainingQuantity;
    
    if (quantity <= 0 || quantity > workItem.remainingQuantity) {
      alert('Quantidade inválida');
      return;
    }

    try {
      await productionService.completeWorkItem(
        workItem.id,
        quantity,
        `Concluído por ${operatorData.name} na máquina ${workItem.machineName}`
      );
      
      // Resetar quantidade de conclusão
      setCompletionQuantity(prev => ({ ...prev, [workItem.id]: 0 }));
      
      // Recarregar lista de trabalho
      await loadWorkItems();
      
      alert(`${quantity} unidades concluídas com sucesso!`);
    } catch (error) {
      console.error('Erro ao concluir item:', error);
      alert('Erro ao concluir item');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;

    try {
      await productionService.sendChatMessage({
        from: 'operator',
        to: 'backend',
        machineId: currentSession.machineId,
        operatorId: currentSession.operatorId,
        message: newMessage
      });

      setNewMessage('');
      
      // Recarregar mensagens
      const machineMessages = await productionService.getChatMessages(currentSession.machineId);
      setMessages(machineMessages);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const filteredWorkItems = workItems.filter(item => {
    const matchesSearch = item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.foamType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || 
                           (priorityFilter === 'high' && item.priority >= 7) ||
                           (priorityFilter === 'medium' && item.priority >= 4 && item.priority < 7) ||
                           (priorityFilter === 'low' && item.priority < 4);
    
    return matchesSearch && matchesPriority;
  });

  const priorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 bg-red-50';
    if (priority >= 6) return 'text-orange-600 bg-orange-50';
    if (priority >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portal do Operador</h1>
              <p className="text-muted-foreground">Sistema de produção - Corte de espuma</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Voltar
              </button>
            )}
          </div>

          {/* Identificação do Operador */}
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Identificação do Operador
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">ID do Operador</label>
                <input
                  type="text"
                  value={operatorData.id}
                  onChange={(e) => setOperatorData(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="Ex: OP001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={operatorData.name}
                  onChange={(e) => setOperatorData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>
          </div>

          {/* Seleção de Máquina */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Selecionar Máquina de Trabalho
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Carregando máquinas...</div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {machines.map(machine => (
                  <div
                    key={machine.id}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-all",
                      selectedMachine === machine.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/50",
                      machine.status === 'offline' || machine.status === 'maintenance'
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    )}
                    onClick={() => {
                      if (machine.status === 'available' || machine.status === 'busy') {
                        setSelectedMachine(machine.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{machine.name}</h3>
                      <div className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        machine.status === 'available' && "bg-green-100 text-green-800",
                        machine.status === 'busy' && "bg-yellow-100 text-yellow-800",
                        machine.status === 'maintenance' && "bg-red-100 text-red-800",
                        machine.status === 'offline' && "bg-gray-100 text-gray-800"
                      )}>
                        {machine.status === 'available' && 'Disponível'}
                        {machine.status === 'busy' && 'Ocupada'}
                        {machine.status === 'maintenance' && 'Manutenção'}
                        {machine.status === 'offline' && 'Offline'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Tipo: {machine.type}</div>
                      <div>
                        Max: {machine.maxDimensions.length/1000}×{machine.maxDimensions.width/1000}×{machine.maxDimensions.height/1000}m
                      </div>
                      <div>Precisão: {machine.cuttingPrecision}mm</div>
                      {machine.currentOperator && (
                        <div className="text-primary font-medium">
                          Operador: {machine.currentOperator}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedMachine && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Máquina selecionada:</p>
                    <p className="font-semibold">
                      {machines.find(m => m.id === selectedMachine)?.name}
                    </p>
                  </div>
                  
                  <button
                    onClick={startSession}
                    disabled={!operatorData.id || !operatorData.name}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Iniciar Trabalho
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Lista de Trabalho - {currentSession.machineName}
            </h1>
            <p className="text-muted-foreground">
              Operador: {currentSession.operatorName} | Sessão iniciada: {new Date(currentSession.startTime).toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2 relative"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
              {messages.filter(m => !m.isRead && m.from === 'backend').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {messages.filter(m => !m.isRead && m.from === 'backend').length}
                </span>
              )}
            </button>
            
            <button
              onClick={endSession}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Encerrar Sessão
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de Trabalho */}
          <div className="lg:col-span-3">
            {/* Filtros */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por OP, cliente ou tipo de espuma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                />
              </div>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="all">Todas as prioridades</option>
                <option value="high">Alta prioridade (7-10)</option>
                <option value="medium">Média prioridade (4-6)</option>
                <option value="low">Baixa prioridade (1-3)</option>
              </select>
            </div>

            {/* Itens de Trabalho */}
            <div className="space-y-4">
              {filteredWorkItems.length === 0 ? (
                <div className="text-center py-12 bg-card border rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">
                    Nenhum trabalho pendente
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm || priorityFilter !== 'all' 
                      ? 'Nenhum item encontrado com os filtros aplicados'
                      : 'Não há trabalhos pendentes para esta máquina'
                    }
                  </p>
                </div>
              ) : (
                filteredWorkItems.map(item => (
                  <div key={item.id} className="bg-card border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{item.orderNumber}</h3>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            priorityColor(item.priority)
                          )}>
                            Prioridade {item.priority}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Cliente: {item.customer}</div>
                          <div>Tipo de espuma: {item.foamType}</div>
                          <div>Entrega: {new Date(item.expectedDeliveryDate).toLocaleDateString()}</div>
                          <div>Tempo estimado: {item.estimatedTime} min</div>
                        </div>
                      </div>
                      
                      {new Date(item.expectedDeliveryDate) < new Date() && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mb-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Dimensões de Entrada (mm)</div>
                        <div className="text-sm text-muted-foreground">
                          {item.inputDimensions.length} × {item.inputDimensions.width} × {item.inputDimensions.height}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">
                          {item.machineType === 'CAROUSEL' || item.machineType === 'PRE_CNC' || item.machineType === 'CNC'
                            ? 'Medidas Finais (mm)'
                            : 'Dimensões de Saída (mm)'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.outputDimensions.length} × {item.outputDimensions.width} × {item.outputDimensions.height}
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    {item.observations && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm font-medium text-yellow-800 mb-1">📋 Observações:</div>
                        <div className="text-sm text-yellow-700">{item.observations}</div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="font-medium">
                            {item.machineType === 'CAROUSEL' || item.machineType === 'PRE_CNC'
                              ? 'Coxins Restantes: '
                              : 'Restante: '
                            }
                          </span>
                          <span className="text-lg font-bold text-primary">{item.remainingQuantity}</span>
                          <span className="text-muted-foreground"> / {item.quantity}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Concluir:</span>
                          <input
                            type="number"
                            min="1"
                            max={item.remainingQuantity}
                            value={completionQuantity[item.id] || ''}
                            onChange={(e) => setCompletionQuantity(prev => ({
                              ...prev,
                              [item.id]: Number(e.target.value)
                            }))}
                            className="w-20 px-2 py-1 border rounded text-sm"
                            placeholder={item.remainingQuantity.toString()}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.machineType === 'CAROUSEL' || item.machineType === 'PRE_CNC'
                              ? 'coxins'
                              : 'unidades'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => completeWorkItem(item)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Concluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-card border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Resumo
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de itens:</span>
                  <span className="font-medium">{workItems.length}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alta prioridade:</span>
                  <span className="font-medium text-red-600">
                    {workItems.filter(item => item.priority >= 7).length}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tempo estimado:</span>
                  <span className="font-medium">
                    {Math.round(workItems.reduce((total, item) => total + item.estimatedTime, 0) / 60)}h
                  </span>
                </div>
              </div>
            </div>

            {/* Chat */}
            {showChat && (
              <div className="bg-card border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat com Escritório
                </h3>
                
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma mensagem
                    </div>
                  ) : (
                    messages.map(message => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-2 rounded text-sm",
                          message.from === 'operator' 
                            ? "bg-primary text-primary-foreground ml-4" 
                            : "bg-muted text-foreground mr-4"
                        )}
                      >
                        <div className="font-medium text-xs mb-1">
                          {message.from === 'operator' ? 'Você' : 'Escritório'}
                        </div>
                        {message.message}
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="Digite sua mensagem..."
                  />
                  <button
                    onClick={sendMessage}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OperatorPortal;
