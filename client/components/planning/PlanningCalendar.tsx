import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductionPlan {
  id: string;
  orderId: string;
  orderNumber: string;
  machineId: string;
  machineName: string;
  plannedStartDate: string;
  plannedEndDate: string;
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  blocksQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  machineId: string;
  orderId: string;
  priority: string;
  status: string;
}

interface PlanningCalendarProps {
  plans: ProductionPlan[];
  currentDate: Date;
  viewMode: 'week' | 'month';
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: 'week' | 'month') => void;
  onPlanClick: (plan: ProductionPlan) => void;
}

export function PlanningCalendar({
  plans,
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onPlanClick
}: PlanningCalendarProps) {
  // Converter planos para eventos de calendário
  const events: CalendarEvent[] = plans.map(plan => ({
    id: plan.id,
    title: `${plan.orderNumber} - ${plan.machineName}`,
    start: new Date(plan.plannedStartDate),
    end: new Date(plan.plannedEndDate),
    machineId: plan.machineId,
    orderId: plan.orderId,
    priority: plan.priority,
    status: plan.status
  }));

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'in_progress': return 'bg-blue-100 border-blue-300';
      case 'delayed': return 'bg-red-100 border-red-300';
      case 'cancelled': return 'bg-gray-100 border-gray-300';
      default: return 'bg-yellow-100 border-yellow-300';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    onDateChange(newDate);
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para segunda-feira
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatDateHeader = () => {
    if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.getDate()} - ${end.getDate()} de ${start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="bg-card border rounded-lg">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário de Produção
          </h3>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('week')}
              className={cn(
                "px-3 py-1 text-sm rounded",
                viewMode === 'week' ? "bg-background shadow-sm" : "hover:bg-background/50"
              )}
            >
              Semana
            </button>
            <button
              onClick={() => onViewModeChange('month')}
              className={cn(
                "px-3 py-1 text-sm rounded",
                viewMode === 'month' ? "bg-background shadow-sm" : "hover:bg-background/50"
              )}
            >
              Mês
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium min-w-[200px] text-center">
            {formatDateHeader()}
          </div>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visualização da Semana */}
      {viewMode === 'week' && (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {getWeekDays().map(date => (
              <div key={date.toISOString()} className="border rounded p-2 min-h-[120px]">
                <div className="text-sm font-medium mb-2">
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {getEventsForDate(date).map(event => {
                    const plan = plans.find(p => p.id === event.id);
                    return (
                      <div
                        key={event.id}
                        onClick={() => plan && onPlanClick(plan)}
                        className={cn(
                          "text-xs p-1 rounded cursor-pointer",
                          getStatusColor(event.status),
                          "hover:opacity-80"
                        )}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className={cn("text-xs px-1 rounded", getPriorityColor(event.priority))}>
                          {event.priority.toUpperCase()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visualização do Mês */}
      {viewMode === 'month' && (
        <div className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            Visualização detalhada do mês será implementada em breve
          </div>
          {/* TODO: Implementar visualização completa do mês */}
        </div>
      )}

      {/* Legenda */}
      <div className="border-t p-4">
        <div className="text-sm font-medium mb-2">Legenda:</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Atrasado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
