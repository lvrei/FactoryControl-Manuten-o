import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Clock, 
  Factory, 
  Users, 
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Target,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FormValidation,
  SuccessMessage,
  useFormValidation,
  validationRules
} from '@/components/ui/FormValidation';
import { ProductionOrder, Machine } from '@/types/production';
import { productionService } from '@/services/productionService';

interface ProductionPlan {
  id: string;
  orderId: string;
  orderNumber: string;
  customer: string;
  machineId: string;
  machineName: string;
  operatorId?: string;
  operatorName?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  estimatedDuration: number; // em horas
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

export default function Planning() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    errors,
    isSubmitting,
    setIsSubmitting,
    addError,
    clearErrors,
    hasErrors
  } = useFormValidation();

  const [formData, setFormData] = useState({
    orderId: '',
    machineId: '',
    operatorName: '',
    plannedStartDate: '',
    plannedStartTime: '',
    estimatedDuration: 0,
    priority: 'medium' as const,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orders, machinesData] = await Promise.all([
        productionService.getProductionOrders(),
        productionService.getMachines()
      ]);
      
      setProductionOrders(orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'));
      setMachines(machinesData);
      
      // Carregar planos do localStorage
      const savedPlans = localStorage.getItem('factoryControl_plans');
      if (savedPlans) {
        setPlans(JSON.parse(savedPlans));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePlans = (plansList: ProductionPlan[]) => {
    localStorage.setItem('factoryControl_plans', JSON.stringify(plansList));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setIsSubmitting(true);

    // Validar campos obrigatórios
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

    const selectedOrder = productionOrders.find(o => o.id === formData.orderId);
    const selectedMachine = machines.find(m => m.id === formData.machineId);
    
    if (!selectedOrder || !selectedMachine) return;

    const startDateTime = new Date(`${formData.plannedStartDate}T${formData.plannedStartTime || '08:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + (formData.estimatedDuration * 60 * 60 * 1000));

    // Verificar conflitos de agendamento
    const conflictingPlan = plans.find(plan => 
      plan.id !== editingPlan?.id &&
      plan.machineId === formData.machineId &&
      plan.status !== 'completed' && plan.status !== 'cancelled' &&
      (
        (startDateTime >= new Date(plan.plannedStartDate) && startDateTime < new Date(plan.plannedEndDate)) ||
        (endDateTime > new Date(plan.plannedStartDate) && endDateTime <= new Date(plan.plannedEndDate)) ||
        (startDateTime <= new Date(plan.plannedStartDate) && endDateTime >= new Date(plan.plannedEndDate))
      )
    );

    if (conflictingPlan) {
      if (!confirm(`Existe um conflito com o plano "${conflictingPlan.orderNumber}" na mesma máquina. Deseja continuar mesmo assim?`)) {
        return;
      }
    }

    const blocksQuantity = selectedOrder.lines.reduce((total, line) => total + line.quantity, 0);

    try {
      const planData: ProductionPlan = {
        id: editingPlan?.id || Date.now().toString(),
        orderId: formData.orderId,
        orderNumber: selectedOrder.orderNumber,
        customer: selectedOrder.customer.name,
        machineId: formData.machineId,
        machineName: selectedMachine.name,
        operatorName: formData.operatorName,
        plannedStartDate: startDateTime.toISOString(),
        plannedEndDate: endDateTime.toISOString(),
        estimatedDuration: formData.estimatedDuration,
        priority: formData.priority,
        status: 'scheduled',
        blocksQuantity,
        notes: formData.notes,
        createdAt: editingPlan?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let updatedPlans;
      if (editingPlan) {
        updatedPlans = plans.map(plan => 
          plan.id === editingPlan.id ? planData : plan
        );
      } else {
        updatedPlans = [...plans, planData];
      }

      setPlans(updatedPlans);
      savePlans(updatedPlans);
      resetForm();
      setShowForm(false);
      // Sucesso
      setSuccessMessage(editingPlan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
      setShowForm(false);
      resetForm();

    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      addError('Sistema', 'Erro ao salvar plano. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (plan: ProductionPlan) => {
    setEditingPlan(plan);
    const startDate = new Date(plan.plannedStartDate);
    setFormData({
      orderId: plan.orderId,
      machineId: plan.machineId,
      operatorName: plan.operatorName || '',
      plannedStartDate: startDate.toISOString().split('T')[0],
      plannedStartTime: startDate.toTimeString().slice(0, 5),
      estimatedDuration: plan.estimatedDuration,
      priority: plan.priority,
      notes: plan.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    
    const updatedPlans = plans.filter(plan => plan.id !== id);
    setPlans(updatedPlans);
    savePlans(updatedPlans);
  };

  const updatePlanStatus = (id: string, status: ProductionPlan['status']) => {
    const updatedPlans = plans.map(plan => 
      plan.id === id ? { ...plan, status, updatedAt: new Date().toISOString() } : plan
    );
    setPlans(updatedPlans);
    savePlans(updatedPlans);
  };

  const resetForm = () => {
    setFormData({
      orderId: '', machineId: '', operatorName: '', plannedStartDate: '',
      plannedStartTime: '', estimatedDuration: 0, priority: 'medium', notes: ''
    });
    setEditingPlan(null);
  };

  // Funções de calendário
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getPlansForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter(plan => {
      const planDate = new Date(plan.plannedStartDate).toISOString().split('T')[0];
      return planDate === dateStr;
    });
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.machineName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const statusConfig = {
    scheduled: { color: "text-blue-600 bg-blue-50", label: "Agendado" },
    in_progress: { color: "text-purple-600 bg-purple-50", label: "Em Andamento" },
    completed: { color: "text-green-600 bg-green-50", label: "Concluído" },
    delayed: { color: "text-red-600 bg-red-50", label: "Atrasado" },
    cancelled: { color: "text-gray-600 bg-gray-50", label: "Cancelado" }
  };

  const priorityConfig = {
    low: { color: "text-green-600 bg-green-50", label: "Baixa" },
    medium: { color: "text-yellow-600 bg-yellow-50", label: "Média" },
    high: { color: "text-orange-600 bg-orange-50", label: "Alta" },
    urgent: { color: "text-red-600 bg-red-50", label: "Urgente" }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Carregando planeamento...</div>
      </div>
    );
  }

  const weekDays = getWeekDays(currentDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Planeamento de Produção</h1>
          <p className="text-muted-foreground">
            Agendamento e controle de ordens de produção
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
            className="px-4 py-2 border rounded-lg hover:bg-muted flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {viewMode === 'week' ? 'Visão Mensal' : 'Visão Semanal'}
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Plano
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Agendado</p>
              <p className="text-2xl font-bold text-card-foreground">{plans.filter(p => p.status === 'scheduled').length}</p>
            </div>
            <Target className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
              <p className="text-2xl font-bold text-purple-600">{plans.filter(p => p.status === 'in_progress').length}</p>
            </div>
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Concluído</p>
              <p className="text-2xl font-bold text-green-600">{plans.filter(p => p.status === 'completed').length}</p>
            </div>
            <Factory className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Atrasado</p>
              <p className="text-2xl font-bold text-red-600">{plans.filter(p => p.status === 'delayed').length}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() - (viewMode === 'week' ? 7 : 30));
              setCurrentDate(newDate);
            }}
            className="p-2 border rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <h2 className="text-xl font-semibold">
            {viewMode === 'week' 
              ? `Semana de ${weekDays[0].toLocaleDateString('pt-BR')} - ${weekDays[6].toLocaleDateString('pt-BR')}`
              : currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            }
          </h2>
          
          <button
            onClick={() => {
              const newDate = new Date(currentDate);
              newDate.setDate(currentDate.getDate() + (viewMode === 'week' ? 7 : 30));
              setCurrentDate(newDate);
            }}
            className="p-2 border rounded-lg hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-2 border rounded-lg hover:bg-muted text-sm"
        >
          Hoje
        </button>
      </div>

      {/* Weekly Calendar View */}
      {viewMode === 'week' && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-muted">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
              <div key={day} className="bg-background p-4 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-muted min-h-[300px]">
            {weekDays.map((day, index) => {
              const dayPlans = getPlansForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div key={index} className={cn("bg-background p-2", isToday && "bg-blue-50")}>
                  <div className={cn("text-sm font-medium mb-2", isToday && "text-blue-600")}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayPlans.map(plan => (
                      <div
                        key={plan.id}
                        className={cn(
                          "text-xs p-1 rounded cursor-pointer hover:opacity-80",
                          priorityConfig[plan.priority].color
                        )}
                        onClick={() => handleEdit(plan)}
                        title={`${plan.orderNumber} - ${plan.customer} (${plan.machineName})`}
                      >
                        <div className="font-medium truncate">{plan.orderNumber}</div>
                        <div className="truncate">{plan.machineName}</div>
                        <div className="truncate">{new Date(plan.plannedStartDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar planos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-muted-foreground">Ordem</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Máquina</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Operador</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Agendamento</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Duração</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Prioridade</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-card-foreground">{plan.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{plan.blocksQuantity} blocos</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-card-foreground">{plan.customer}</td>
                  <td className="p-4 text-sm text-card-foreground">{plan.machineName}</td>
                  <td className="p-4 text-sm text-card-foreground">{plan.operatorName || '-'}</td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div>{new Date(plan.plannedStartDate).toLocaleDateString('pt-BR')}</div>
                      <div className="text-muted-foreground">
                        {new Date(plan.plannedStartDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} - 
                        {new Date(plan.plannedEndDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-card-foreground">{plan.estimatedDuration}h</td>
                  <td className="p-4">
                    <select
                      value={plan.status}
                      onChange={(e) => updatePlanStatus(plan.id, e.target.value as any)}
                      className={cn("text-xs px-2 py-1 rounded border-0", statusConfig[plan.status].color)}
                    >
                      <option value="scheduled">Agendado</option>
                      <option value="in_progress">Em Andamento</option>
                      <option value="completed">Concluído</option>
                      <option value="delayed">Atrasado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", priorityConfig[plan.priority].color)}>
                      {priorityConfig[plan.priority].label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlans.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              {searchTerm ? 'Nenhum plano encontrado' : 'Nenhum plano agendado'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Tente ajustar o termo de busca'
                : 'Comece criando o primeiro plano de produção'
              }
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {editingPlan ? 'Editar Plano' : 'Novo Plano de Produção'}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ordem de Produção *</label>
                    <select
                      value={formData.orderId}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="">Selecione uma ordem</option>
                      {productionOrders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.orderNumber} - {order.customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Máquina *</label>
                    <select
                      value={formData.machineId}
                      onChange={(e) => setFormData(prev => ({ ...prev, machineId: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    >
                      <option value="">Selecione uma máquina</option>
                      {machines.map(machine => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name} ({machine.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Data de Início *</label>
                    <input
                      type="date"
                      value={formData.plannedStartDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hora de Início</label>
                    <input
                      type="time"
                      value={formData.plannedStartTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, plannedStartTime: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Duração Estimada (horas) *</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                      min="0.5"
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

                <div>
                  <label className="block text-sm font-medium mb-2">Operador</label>
                  <input
                    type="text"
                    value={formData.operatorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, operatorName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    placeholder="Nome do operador responsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                    rows={3}
                    placeholder="Observações sobre o planeamento..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
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
                    {editingPlan ? 'Atualizar' : 'Criar'} Plano
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
