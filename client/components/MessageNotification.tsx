import { useState, useEffect } from 'react';
import { X, MessageCircle, Bell } from 'lucide-react';
import { ChatMessage } from '@/types/production';
import { cn } from '@/lib/utils';

interface MessageNotificationProps {
  message: ChatMessage;
  onClose: () => void;
  onView: () => void;
  autoCloseDelay?: number; // in milliseconds
}

export function MessageNotification({ 
  message, 
  onClose, 
  onView, 
  autoCloseDelay = 8000 
}: MessageNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (autoCloseDelay > 0) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (autoCloseDelay / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(autoCloseTimer);
      };
    }
  }, [autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const handleView = () => {
    onView();
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg min-w-80 max-w-md transition-all duration-300",
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    )}>
      {/* Progress bar */}
      <div className="absolute top-0 left-0 h-1 bg-primary rounded-t-lg transition-all duration-100 ease-linear"
           style={{ width: `${progress}%` }} />
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary/10 rounded">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-card-foreground text-sm">Nova Mensagem</h4>
              <p className="text-xs text-muted-foreground">
                {message.from === 'backend' ? 'Escritório' : 'Operador'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="mb-3">
          <p className="text-sm text-card-foreground line-clamp-2">
            {message.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleView}
            className="flex-1 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 flex items-center justify-center gap-1"
          >
            <MessageCircle className="h-3 w-3" />
            Ver Chat
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-1 text-sm border border-input rounded hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageNotificationContainerProps {
  notifications: (ChatMessage & { id: string })[];
  onDismiss: (id: string) => void;
  onViewChat: () => void;
}

export function MessageNotificationContainer({ 
  notifications, 
  onDismiss, 
  onViewChat 
}: MessageNotificationContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <div 
          key={notification.id}
          style={{ 
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index
          }}
        >
          <MessageNotification
            message={notification}
            onClose={() => onDismiss(notification.id)}
            onView={onViewChat}
            autoCloseDelay={8000}
          />
        </div>
      ))}
    </div>
  );
}
