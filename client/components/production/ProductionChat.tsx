import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  User, 
  Factory, 
  Clock, 
  X,
  AlertCircle,
  CheckCircle,
  Trash2,
  Search
} from 'lucide-react';
import { ChatMessage, Machine, OperatorSession } from '@/types/production';
import { productionService } from '@/services/productionService';
import { cn } from '@/lib/utils';

interface ProductionChatProps {
  isBackend?: boolean; // Se é interface do backend ou do operador
  machineId?: string;
  operatorId?: string;
  onClose?: () => void;
}

export function ProductionChat({ isBackend = false, machineId, operatorId, onClose }: ProductionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operatorSessions, setOperatorSessions] = useState<OperatorSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMachine, setSelectedMachine] = useState(machineId || '');
  const [selectedOperator, setSelectedOperator] = useState(operatorId || '');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadMessages, 5000); // Atualizar mensagens a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [selectedMachine, selectedOperator]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [machinesData, sessions] = await Promise.all([
        productionService.getMachines(),
        productionService.getOperatorSessions ? productionService.getOperatorSessions() : Promise.resolve([])
      ]);
      
      setMachines(machinesData);
      setOperatorSessions(sessions.filter((session: OperatorSession) => session.isActive));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const chatMessages = await productionService.getChatMessages(
        selectedMachine || undefined,
        selectedOperator || undefined
      );
      setMessages(chatMessages);

      // Marcar como lidas as mensagens que não são nossas
      const unreadMessages = chatMessages.filter(msg =>
        !msg.isRead &&
        ((isBackend && msg.from === 'operator') || (!isBackend && msg.from === 'backend'))
      );

      for (const msg of unreadMessages) {
        await productionService.markMessageAsRead(msg.id);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'> = {
        from: isBackend ? 'backend' : 'operator',
        message: newMessage,
        machineId: selectedMachine || undefined,
        operatorId: selectedOperator || undefined,
        to: isBackend ? selectedOperator || undefined : 'backend'
      };

      await productionService.sendChatMessage(messageData);
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      // Em implementação real, haveria um endpoint para marcar como lida
      console.log('Marcando mensagem como lida:', messageId);
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
    
    try {
      // Em implementação real, haveria um endpoint para excluir mensagem
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredMessages = messages.filter(message => {
    if (!searchTerm) return true;
    return message.message.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const unreadCount = messages.filter(msg => !msg.isRead && 
    (isBackend ? msg.from === 'operator' : msg.from === 'backend')
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando chat...</div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-semibold">
              {isBackend ? 'Chat com Operadores' : 'Chat com Escritório'}
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtros */}
        {isBackend && (
          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="px-3 py-2 border rounded bg-background text-sm"
            >
              <option value="">Todas as máquinas</option>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} ({machine.type})
                </option>
              ))}
            </select>

            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="px-3 py-2 border rounded bg-background text-sm"
            >
              <option value="">Todos os operadores</option>
              {operatorSessions.map(session => (
                <option key={session.id} value={session.operatorId}>
                  {session.operatorName} ({session.machineName})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Busca */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar mensagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded bg-background text-sm"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchTerm 
                ? 'Nenhuma mensagem encontrada'
                : 'Nenhuma mensagem ainda'
              }
            </p>
            <p className="text-sm">
              {searchTerm 
                ? 'Tente ajustar o termo de busca'
                : 'Envie a primeira mensagem para começar a conversa'
              }
            </p>
          </div>
        ) : (
          filteredMessages.map(message => {
            const isOwnMessage = isBackend ? message.from === 'backend' : message.from === 'operator';
            const machine = machines.find(m => m.id === message.machineId);
            const session = operatorSessions.find(s => s.operatorId === message.operatorId);

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3 relative group",
                    isOwnMessage
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {/* Header da mensagem */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      {message.from === 'backend' ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Factory className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {message.from === 'backend' ? 'Escritório' : (session?.operatorName || 'Operador')}
                      </span>
                    </div>
                    
                    {(machine || session) && (
                      <span className="text-xs opacity-75">
                        {machine?.name || session?.machineName}
                      </span>
                    )}
                  </div>

                  {/* Conteúdo da mensagem */}
                  <div className="text-sm mb-2">{message.message}</div>

                  {/* Footer da mensagem */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs opacity-75">
                      <Clock className="h-3 w-3" />
                      {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>

                    <div className="flex items-center gap-1">
                      {!message.isRead && !isOwnMessage && (
                        <button
                          onClick={() => markMessageAsRead(message.id)}
                          className="text-xs opacity-75 hover:opacity-100"
                          title="Marcar como lida"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </button>
                      )}
                      
                      {isBackend && (
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="text-xs opacity-0 group-hover:opacity-75 hover:opacity-100 transition-opacity"
                          title="Excluir mensagem"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Indicador de não lida */}
                  {!message.isRead && !isOwnMessage && (
                    <div className="absolute -right-1 -top-1 bg-red-500 rounded-full h-2 w-2"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensagem */}
      <div className="p-4 border-t">
        {isBackend && !selectedMachine && !selectedOperator && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Selecione uma máquina ou operador para enviar mensagens direcionadas
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 border rounded bg-background"
            placeholder={
              isBackend 
                ? "Digite sua mensagem para os operadores..."
                : "Digite sua mensagem para o escritório..."
            }
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook para usar o chat
export function useChatNotifications(machineId?: string, operatorId?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    const checkMessages = async () => {
      try {
        const messages = await productionService.getChatMessages(machineId, operatorId);
        const unread = messages.filter(msg => !msg.isRead && msg.from !== 'operator');
        setUnreadCount(unread.length);

        if (messages.length > 0) {
          const latest = messages[messages.length - 1];
          setLatestMessage(latest);

          // Notificação visual se for nova mensagem
          if (latest.from === 'backend' && !latest.isRead) {
            // Criar notificação visual
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova mensagem do escritório', {
                body: latest.message,
                icon: '/icons/icon-192x192.png'
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar mensagens:', error);
      }
    };

    // Pedir permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkMessages();
    const interval = setInterval(checkMessages, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(interval);
  }, [machineId, operatorId]);

  return { unreadCount, latestMessage };
}
