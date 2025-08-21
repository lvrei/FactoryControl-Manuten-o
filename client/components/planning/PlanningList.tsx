import React from 'react';
import { Edit, Trash2, Play, Pause, Check, Clock, Factory, Package, Target } from 'lucide-react';
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

interface PlanningListProps {
  plans: ProductionPlan[];
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onEdit: (plan: ProductionPlan) => void;
  onDelete: (planId: string) => void;
  onStatusChange: (planId: string, status: ProductionPlan['status']) => void;
}

export function PlanningList({
  plans,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onStatusChange
}: PlanningListProps) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'text-red-700 bg-red-100', label: 'Urgente' };
      case 'high':
        return { color: 'text-orange-700 bg-orange-100', label: 'Alta' };
      case 'medium':
        return { color: 'text-blue-700 bg-blue-100', label: 'Média' };
      case 'low':
        return { color: 'text-gray-700 bg-gray-100', label: 'Baixa' };
      default:
        return { color: 'text-gray-700 bg-gray-100', label: 'Média' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { color: 'text-yellow-700 bg-yellow-100', label: 'Agendado', icon: Clock };
      case 'in_progress':
        return { color: 'text-blue-700 bg-blue-100', label: 'Em Andamento', icon: Play };
      case 'completed':
        return { color: 'text-green-700 bg-green-100', label: 'Concluído', icon: Check };
      case 'delayed':
        return { color: 'text-red-700 bg-red-100', label: 'Atrasado', icon: Clock };
      case 'cancelled':
        return { color: 'text-gray-700 bg-gray-100', label: 'Cancelado', icon: Pause };
      default:
        return { color: 'text-gray-700 bg-gray-100', label: 'Agendado', icon: Clock };
    }
  };

  const filteredPlans = plans.filter(plan =>
    plan.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (planId: string) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      onDelete(planId);
    }
  };

  return (
    <div className="bg-card border rounded-lg">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Lista de Planos</h3>
          <div className="text-sm text-muted-foreground">
            {filteredPlans.length} de {plans.length} planos
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por ordem, máquina ou observações..."
            className="w-full pl-4 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
      </div>

      {/* Lista de Planos */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {filteredPlans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'Nenhum plano encontrado para a busca.' : 'Nenhum plano criado ainda.'}
          </div>
        ) : (
          filteredPlans.map(plan => {
            const priorityConfig = getPriorityConfig(plan.priority);
            const statusConfig = getStatusConfig(plan.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={plan.id} className="p-4 hover:bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{plan.orderNumber}</h4>
                      <span className={cn("px-2 py-1 text-xs rounded-full", priorityConfig.color)}>
                        {priorityConfig.label}
                      </span>
                      <span className={cn("px-2 py-1 text-xs rounded-full flex items-center gap-1", statusConfig.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Factory className="h-4 w-4" />
                        {plan.machineName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(plan.plannedStartDate).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(plan.plannedStartDate).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {plan.estimatedDuration}h estimadas
                      </div>
                    </div>

                    {plan.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Observações:</strong> {plan.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4">
                    {/* Status Change Buttons */}
                    {plan.status === 'scheduled' && (
                      <button
                        onClick={() => onStatusChange(plan.id, 'in_progress')}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Iniciar Produção"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}

                    {plan.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => onStatusChange(plan.id, 'completed')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="Marcar como Concluído"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onStatusChange(plan.id, 'delayed')}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Marcar como Atrasado"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    {/* Edit Button */}
                    {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                      <button
                        onClick={() => onEdit(plan)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                        title="Editar Plano"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      title="Excluir Plano"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
