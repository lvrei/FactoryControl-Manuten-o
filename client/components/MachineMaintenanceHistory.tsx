import { useState, useEffect } from 'react';
import { 
  Factory, 
  Wrench, 
  Clock, 
  User, 
  FileText, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Euro,
  ChevronDown,
  ChevronUp,
  Filter,
  Search
} from 'lucide-react';
import { MaintenanceRequest, Machine } from '@/types/production';
import { maintenanceService } from '@/services/maintenanceService';
import { productionService } from '@/services/productionService';
import { cn } from '@/lib/utils';
import { BackToOperatorButton } from './BackToOperatorButton';

interface MachineMaintenanceHistoryProps {
  machineId?: string;
  onBackToOperator?: () => void;
}

export function MachineMaintenanceHistory({ machineId, onBackToOperator }: MachineMaintenanceHistoryProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>(machineId || '');
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadMaintenanceHistory();
    }
  }, [selectedMachine]);

  const loadMachines = async () => {
    try {
      const machinesData = await productionService.getMachines();
      setMachines(machinesData);
      if (!selectedMachine && machinesData.length > 0) {
        setSelectedMachine(machinesData[0].id);
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceHistory = async () => {
    if (!selectedMachine) return;
    
    setLoading(true);
    try {
      const allRequests = await maintenanceService.getMaintenanceRequests();
      const machineRequests = allRequests.filter(r => r.machineId === selectedMachine);
      // Sort by date (newest first)
      machineRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
      setMaintenanceHistory(machineRequests);
    } catch (error) {
      console.error('Error loading maintenance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = maintenanceHistory.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.operatorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedMachineData = machines.find(m => m.id === selectedMachine);

  // Calculate statistics
  const stats = {
    total: maintenanceHistory.length,
    completed: maintenanceHistory.filter(r => r.status === 'completed').length,
    pending: maintenanceHistory.filter(r => r.status === 'pending').length,
    inProgress: maintenanceHistory.filter(r => r.status === 'in_progress').length,
    totalCost: maintenanceHistory.reduce((sum, r) => sum + (r.cost || 0), 0),
    avgResolutionTime: calculateAverageResolutionTime(),
    lastMaintenance: maintenanceHistory.length > 0 ? maintenanceHistory[0].requestedAt : null
  };

  function calculateAverageResolutionTime(): number {
    const completedRequests = maintenanceHistory.filter(r => 
      r.status === 'completed' && r.completedAt
    );
    
    if (completedRequests.length === 0) return 0;
    
    const totalTime = completedRequests.reduce((sum, request) => {
      const start = new Date(request.requestedAt).getTime();
      const end = new Date(request.completedAt!).getTime();
      return sum + (end - start);
    }, 0);
    
    return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60)); // hours
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando histórico de manutenção...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      {onBackToOperator && (
        <div className="flex items-center justify-between">
          <BackToOperatorButton
            onClick={onBackToOperator}
            variant="header"
          />
        </div>
      )}

      {/* Machine Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Selecionar Máquina</label>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background"
          >
            <option value="">Selecione uma máquina...</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.id}>
                {machine.name} - {machine.type}
              </option>
            ))}
          </select>
        </div>

        {selectedMachineData && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={cn(
              "w-3 h-3 rounded-full",
              selectedMachineData.status === 'available' ? 'bg-green-500' :
              selectedMachineData.status === 'busy' ? 'bg-yellow-500' :
              selectedMachineData.status === 'maintenance' ? 'bg-red-500' :
              'bg-gray-500'
            )}></div>
            <span className="capitalize">{selectedMachineData.status}</span>
          </div>
        )}
      </div>

      {selectedMachine && (
        <>
          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Manutenções</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Wrench className="h-5 w-5 text-blue-500" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold">€{stats.totalCost.toFixed(2)}</p>
                </div>
                <Euro className="h-5 w-5 text-orange-500" />
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold">{stats.avgResolutionTime}h</p>
                </div>
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título, descrição ou operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">Todos os estados</option>
              <option value="completed">Concluídas</option>
              <option value="in_progress">Em Progresso</option>
              <option value="pending">Pendentes</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {/* Maintenance History */}
          <div className="bg-card border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Manutenção - {selectedMachineData?.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredHistory.length} registos encontrados
                {stats.lastMaintenance && (
                  <span className="ml-2">
                    • Última manutenção: {new Date(stats.lastMaintenance).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Nenhum registo encontrado com os filtros aplicados'
                      : 'Nenhum histórico de manutenção para esta máquina'
                    }
                  </p>
                </div>
              ) : (
                filteredHistory.map((request) => {
                  const isExpanded = expandedRequest === request.id;
                  const requestDate = new Date(request.requestedAt);
                  const completedDate = request.completedAt ? new Date(request.completedAt) : null;
                  const duration = completedDate ? 
                    Math.round((completedDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60)) : null;

                  return (
                    <div key={request.id} className="border-b last:border-b-0">
                      <div 
                        className="p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{request.title}</h4>
                              <span className={cn("px-2 py-1 rounded text-xs", getUrgencyColor(request.urgencyLevel))}>
                                {request.urgencyLevel === 'critical' ? 'Crítica' :
                                 request.urgencyLevel === 'high' ? 'Alta' :
                                 request.urgencyLevel === 'medium' ? 'Média' : 'Baixa'}
                              </span>
                              <span className={cn("px-2 py-1 rounded text-xs", getStatusColor(request.status))}>
                                {request.status === 'pending' ? 'Pendente' :
                                 request.status === 'assigned' ? 'Atribuída' :
                                 request.status === 'in_progress' ? 'Em Progresso' :
                                 request.status === 'completed' ? 'Concluída' : 'Cancelada'}
                              </span>
                            </div>
                            
                            <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {requestDate.toLocaleDateString('pt-BR')} às {requestDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.operatorName}
                              </div>
                              {duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Duração: {duration}h
                                </div>
                              )}
                              {request.cost && request.cost > 0 && (
                                <div className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  €{request.cost.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-muted/20">
                          <div className="space-y-3 text-sm">
                            <div>
                              <strong>Descrição:</strong>
                              <p className="mt-1">{request.description}</p>
                            </div>
                            
                            {request.technicianNotes && (
                              <div>
                                <strong>Notas do Técnico:</strong>
                                <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border">
                                  {request.technicianNotes}
                                </pre>
                              </div>
                            )}
                            
                            {request.assignedTo && (
                              <div>
                                <strong>Técnico Atribuído:</strong> {request.assignedTo}
                              </div>
                            )}
                            
                            {request.solution && (
                              <div>
                                <strong>Solução:</strong>
                                <p className="mt-1">{request.solution}</p>
                              </div>
                            )}
                            
                            {request.partsUsed && request.partsUsed.length > 0 && (
                              <div>
                                <strong>Peças Utilizadas:</strong>
                                <ul className="mt-1 list-disc list-inside">
                                  {request.partsUsed.map((part, index) => (
                                    <li key={index}>{part}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="grid gap-2 md:grid-cols-2 pt-2 border-t">
                              <div>
                                <strong>Categoria:</strong> {request.category}
                              </div>
                              <div>
                                <strong>Follow-up Necessário:</strong> {request.followUpRequired ? 'Sim' : 'Não'}
                              </div>
                              {request.nextMaintenanceDate && (
                                <div>
                                  <strong>Próxima Manutenção:</strong> {new Date(request.nextMaintenanceDate).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
