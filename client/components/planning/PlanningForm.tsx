import React from 'react';
import { X, Calendar, Clock, Factory, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormValidation, useFormValidation } from '@/components/ui/FormValidation';
import { ProductionOrder, Machine } from '@/types/production';

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

interface PlanningFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: any) => Promise<void>;
  editingPlan: ProductionPlan | null;
  productionOrders: ProductionOrder[];
  machines: Machine[];
}

interface FormData {
  orderId: string;
  machineId: string;
  plannedStartDate: string;
  plannedStartTime: string;
  estimatedDuration: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes: string;
}

export function PlanningForm({
  isOpen,
  onClose,
  onSave,
  editingPlan,
  productionOrders,
  machines
}: PlanningFormProps) {
  const [formData, setFormData] = React.useState<FormData>({
    orderId: '',
    machineId: '',
    plannedStartDate: '',
    plannedStartTime: '08:00',
    estimatedDuration: '',
    priority: 'medium',
    notes: ''
  });

  const {
    errors,
    isSubmitting,
    setIsSubmitting,
    addError,
    clearErrors,
    hasErrors
  } = useFormValidation();

  // Inicializar formulário quando editingPlan muda
  React.useEffect(() => {
    if (editingPlan) {
      const startDate = new Date(editingPlan.plannedStartDate);
      setFormData({
        orderId: editingPlan.orderId,
        machineId: editingPlan.machineId,
        plannedStartDate: startDate.toISOString().split('T')[0],
        plannedStartTime: startDate.toTimeString().split(':').slice(0, 2).join(':'),
        estimatedDuration: editingPlan.estimatedDuration.toString(),
        priority: editingPlan.priority,
        notes: editingPlan.notes || ''
      });
    } else {
      // Reset form for new plan
      setFormData({
        orderId: '',
        machineId: '',
        plannedStartDate: '',
        plannedStartTime: '08:00',
        estimatedDuration: '',
        priority: 'medium',
        notes: ''
      });
    }
    clearErrors();
  }, [editingPlan, clearErrors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsSubmitting(true);

    // Validações
    let hasValidationErrors = false;

    if (!formData.orderId) {
      addError('Ordem de Produção', 'Selecione uma ordem de produção');
      hasValidationErrors = true;
    }

    if (!formData.machineId) {
      addError('Máquina', 'Selecione uma máquina');
      hasValidationErrors = true;
    }

    if (!formData.plannedStartDate) {
      addError('Data de Início', 'Informe a data de início');
      hasValidationErrors = true;
    }

    if (!formData.estimatedDuration || Number(formData.estimatedDuration) <= 0) {
      addError('Duração', 'Informe uma duração válida em horas');
      hasValidationErrors = true;
    }

    if (hasValidationErrors) {
      setIsSubmitting(false);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      addError('Sistema', 'Erro ao salvar plano. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b p-6">
          <h3 className="text-xl font-semibold">
            {editingPlan ? 'Editar Plano' : 'Novo Plano de Produção'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Validation Errors */}
          {hasErrors && <FormValidation errors={errors} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ordem de Produção */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Package className="inline h-4 w-4 mr-1" />
                Ordem de Produção *
              </label>
              <select
                value={formData.orderId}
                onChange={(e) => handleChange('orderId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                required
              >
                <option value="">Selecione uma ordem...</option>
                {productionOrders.map(order => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} - {order.customer}
                  </option>
                ))}
              </select>
            </div>

            {/* Máquina */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Factory className="inline h-4 w-4 mr-1" />
                Máquina *
              </label>
              <select
                value={formData.machineId}
                onChange={(e) => handleChange('machineId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                required
              >
                <option value="">Selecione uma máquina...</option>
                {machines.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Data de Início */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data de Início *
              </label>
              <input
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => handleChange('plannedStartDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                required
              />
            </div>

            {/* Horário de Início */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Horário de Início
              </label>
              <input
                type="time"
                value={formData.plannedStartTime}
                onChange={(e) => handleChange('plannedStartTime', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              />
            </div>

            {/* Duração Estimada */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duração Estimada (horas) *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.estimatedDuration}
                onChange={(e) => handleChange('estimatedDuration', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                placeholder="Ex: 2.5"
                required
              />
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium mb-2">Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium mb-2">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background"
              rows={3}
              placeholder="Observações adicionais sobre o planejamento..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-muted"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasErrors}
              className={cn(
                "px-4 py-2 rounded-lg font-medium flex items-center gap-2",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Salvando...
                </>
              ) : (
                editingPlan ? 'Atualizar Plano' : 'Criar Plano'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
