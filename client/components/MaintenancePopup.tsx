import { useState, useEffect } from 'react';
import { X, AlertTriangle, Wrench, Clock, User, Factory, CheckCircle, XCircle } from 'lucide-react';
import { MaintenanceRequest } from '@/types/production';
import { maintenanceService } from '@/services/maintenanceService';
import { cn } from '@/lib/utils';

interface MaintenancePopupProps {
  request: MaintenanceRequest;
  onAcknowledge: (requestId: string) => void;
  onDismiss: (requestId: string) => void;
}

export function MaintenancePopup({ request, onAcknowledge, onDismiss }: MaintenancePopupProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('');

  useEffect(() => {
    const updateTimeElapsed = () => {
      const now = new Date();
      const requestTime = new Date(request.requestedAt);
      const diffMinutes = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60));
      
      if (diffMinutes < 60) {
        setTimeElapsed(`${diffMinutes} minutos atrás`);
      } else {
        const hours = Math.floor(diffMinutes / 60);
        setTimeElapsed(`${hours}h ${diffMinutes % 60}min atrás`);
      }
    };

    updateTimeElapsed();
    const interval = setInterval(updateTimeElapsed, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [request.requestedAt]);

  const handleAcknowledge = () => {
    setIsVisible(false);
    setTimeout(() => onAcknowledge(request.id), 300);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(request.id), 300);
  };

  if (!isVisible) return null;

  const urgencyConfig = {
    low: { color: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle },
    medium: { color: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: Clock },
    high: { color: 'bg-orange-50 border-orange-200 text-orange-800', icon: AlertTriangle },
    critical: { color: 'bg-red-50 border-red-200 text-red-800', icon: XCircle }
  };

  const config = urgencyConfig[request.urgencyLevel];
  const UrgencyIcon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className={cn(
        "bg-white rounded-lg border-2 shadow-xl max-w-md w-full animate-in slide-in-from-top-4 duration-300",
        config.color
      )}>
        {/* Header with urgency indicator */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-current/10">
                <UrgencyIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">🚨 PEDIDO DE MANUTENÇÃO URGENTE</h3>
                <p className="text-sm opacity-80">
                  {request.urgencyLevel === 'critical' ? 'CRÍTICO - MÁQUINA PARADA' :
                   request.urgencyLevel === 'high' ? 'ALTA PRIORIDADE' :
                   request.urgencyLevel === 'medium' ? 'PRIORIDADE MÉDIA' : 'BAIXA PRIORIDADE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Request details */}
        <div className="p-4 space-y-3">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              <span className="font-medium">Máquina:</span>
              <span>{request.machineName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Operador:</span>
              <span>{request.operatorName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Solicitado:</span>
              <span>{timeElapsed}</span>
            </div>
          </div>

          <div className="p-3 bg-white/50 rounded border">
            <h4 className="font-medium mb-1">{request.title}</h4>
            <p className="text-sm">{request.description}</p>
          </div>

          {request.urgencyLevel === 'critical' && (
            <div className="p-3 bg-red-100 border border-red-300 rounded">
              <p className="text-sm font-medium text-red-800">
                ⚠️ ATENÇÃO: Esta máquina foi automaticamente marcada como PARADA
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-white/50">
          <p className="text-sm text-gray-600 mb-3 text-center font-medium">
            Esta notificação requer confirmação obrigatória
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleAcknowledge}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar Recepção
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Dispensar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MaintenancePopupContainerProps {
  onRequestUpdate?: () => void;
}

export function MaintenancePopupContainer({ onRequestUpdate }: MaintenancePopupContainerProps) {
  const [pendingRequests, setPendingRequests] = useState<MaintenanceRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<MaintenanceRequest | null>(null);

  useEffect(() => {
    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingRequests.length > 0 && !currentRequest) {
      // Show the most urgent request first
      const sortedRequests = [...pendingRequests].sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      });
      setCurrentRequest(sortedRequests[0]);
    }
  }, [pendingRequests, currentRequest]);

  const loadPendingRequests = async () => {
    try {
      const requests = await maintenanceService.getMaintenanceRequests();
      const pending = requests.filter(r => r.status === 'pending');
      setPendingRequests(pending);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const handleAcknowledge = async (requestId: string) => {
    try {
      await maintenanceService.updateMaintenanceRequestStatus(
        requestId, 
        'assigned',
        'Recebido pela equipa de manutenção'
      );
      
      // Remove from current and pending
      setCurrentRequest(null);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Trigger update in parent component
      if (onRequestUpdate) {
        onRequestUpdate();
      }
      
      // Show next request if any
      const remaining = pendingRequests.filter(r => r.id !== requestId);
      if (remaining.length > 0) {
        setTimeout(() => {
          const sortedRequests = [...remaining].sort((a, b) => {
            const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
          });
          setCurrentRequest(sortedRequests[0]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error acknowledging request:', error);
    }
  };

  const handleDismiss = async (requestId: string) => {
    try {
      await maintenanceService.updateMaintenanceRequestStatus(
        requestId, 
        'cancelled',
        'Dispensado pela equipa de manutenção'
      );
      
      // Remove from current and pending
      setCurrentRequest(null);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Trigger update in parent component
      if (onRequestUpdate) {
        onRequestUpdate();
      }
    } catch (error) {
      console.error('Error dismissing request:', error);
    }
  };

  if (!currentRequest) return null;

  return (
    <MaintenancePopup
      request={currentRequest}
      onAcknowledge={handleAcknowledge}
      onDismiss={handleDismiss}
    />
  );
}
