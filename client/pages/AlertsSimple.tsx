import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
  Factory,
  Settings,
  Activity,
  Users,
  Package,
  Shield,
  Search,
  Filter,
  Eye,
  EyeOff,
  MoreVertical,
  Wrench,
  Timer,
  AlertCircle,
  FileText,
  Play,
  CheckSquare,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maintenanceService } from '@/services/maintenanceService';
import { MaintenanceRequest, MaintenanceAlert, MachineDowntime } from '@/types/production';
import { MaintenancePopupContainer } from '@/components/MaintenancePopup';
import { MaintenanceWorkSheet } from '@/components/MaintenanceWorkSheet';
import { MachineMaintenanceHistory } from '@/components/MachineMaintenanceHistory';
import { iotService, type Alert as IoTAlert } from '@/services/iotService';
import { IoTAlertPopupContainer } from '@/components/IoTAlertPopup';
import { authService } from '@/services/authService';

export default function AlertsSimple() {
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'alerts';
  const selectedMachineFromURL = urlParams.get('machine');
  const [activeTab, setActiveTab] = useState<'alerts' | 'iot_history' | 'maintenance' | 'history' | 'analytics' | 'rules'>(
    (initialTab === 'history' || initialTab === 'maintenance' || initialTab === 'analytics' || initialTab === 'rules' || initialTab === 'iot_history')
      ? (initialTab as any)
      : 'alerts'
  );
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [machineDowntime, setMachineDowntime] = useState<MachineDowntime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showWorkSheet, setShowWorkSheet] = useState(false);
  const [iotAlerts, setIotAlerts] = useState<IoTAlert[]>([]);
  const [iotHistory, setIotHistory] = useState<IoTAlert[]>([]);
  const [iotHistoryStatus, setIotHistoryStatus] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');

  useEffect(() => {
    loadMaintenanceData();
    const interval = setInterval(loadMaintenanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      try { const list = await iotService.listAlerts('active'); if (!cancelled) setIotAlerts(list || []); } catch {}
    };
    loadAlerts();
    const t = setInterval(loadAlerts, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (activeTab !== 'iot_history') return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const list = await iotService.listAlerts();
        if (!cancelled) setIotHistory(list || []);
      } catch {}
    };
    loadHistory();
    const t = setInterval(loadHistory, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeTab]);

  const loadMaintenanceData = async () => {
    try {
      const [requests, alerts, downtime] = await Promise.all([
        maintenanceService.getMaintenanceRequests(),
        maintenanceService.getMaintenanceAlerts(),
        maintenanceService.getMachineDowntime()
      ]);
      
      // Add sample data if empty for testing
      const sampleRequests = requests && requests.length > 0 ? requests : [
        {
          id: 'sample-1',
          machineId: 'machine-1',
          machineName: 'BZM-001',
          operatorId: 'op-1',
          operatorName: 'João Silva',
          urgencyLevel: 'high' as const,
          category: 'mechanical' as const,
          title: 'Ruído estranho no motor',
          description: 'Motor fazendo ruído anormal durante operação',
          reportedIssues: ['ruído', 'vibração'],
          status: 'pending' as const,
          priority: 8,
          requestedAt: new Date().toISOString(),
          followUpRequired: true
        }
      ];

      setMaintenanceRequests(sampleRequests);
      setMaintenanceAlerts(alerts || []);
      setMachineDowntime(downtime || []);
    } catch (error) {
      console.error('Erro ao carregar dados de manutenção:', error);
      // Set empty arrays as fallback
      setMaintenanceRequests([]);
      setMaintenanceAlerts([]);
      setMachineDowntime([]);
    } finally {
      setLoading(false);
    }
  };

  const pendingMaintenanceRequests = maintenanceRequests.filter(r => r.status === 'pending').length;
  const criticalMaintenanceRequests = maintenanceRequests.filter(r => r.urgencyLevel === 'critical' && r.status !== 'completed').length;
  const activeMachineDowntime = machineDowntime.filter(d => d.status === 'ongoing').length;

  const handleTabClick = (tab: string) => {
    console.log('Tab clicked:', tab);
    setActiveTab(tab as any);
  };

  const handleRequestUpdate = () => {
    loadMaintenanceData();
  };

  const handleConfirmReceipt = async (requestId: string) => {
    try {
      await maintenanceService.updateMaintenanceRequestStatus(
        requestId,
        'assigned',
        'Confirmado recebimento pela equipa de manutenção'
      );
      loadMaintenanceData();
    } catch (error) {
      console.error('Error confirming receipt:', error);
    }
  };

  const handleStartWork = async (requestId: string) => {
    try {
      await maintenanceService.updateMaintenanceRequestStatus(
        requestId,
        'in_progress',
        'Trabalho de manutenção iniciado'
      );
      loadMaintenanceData();
    } catch (error) {
      console.error('Error starting work:', error);
    }
  };

  const handleOpenWorkSheet = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setShowWorkSheet(true);
  };

  const handleWorkSheetComplete = (requestId: string) => {
    setShowWorkSheet(false);
    setSelectedRequest(null);
    loadMaintenanceData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Alertas</h1>
          <p className="text-muted-foreground">
            Monitoramento e gestão de alertas do sistema
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Alertas Ativos (IoT)</p>
              <p className="text-2xl font-bold text-card-foreground">{iotAlerts.length}</p>
            </div>
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Manutenção Pendente</p>
              <p className="text-2xl font-bold text-destructive">{pendingMaintenanceRequests}</p>
            </div>
            <Wrench className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Críticas</p>
              <p className="text-2xl font-bold text-red-600">{criticalMaintenanceRequests}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Máquinas Paradas</p>
              <p className="text-2xl font-bold text-orange-600">{activeMachineDowntime}</p>
            </div>
            <Factory className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => handleTabClick('alerts')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'alerts'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Alertas ({iotAlerts.length})
        </button>
        <button
          onClick={() => handleTabClick('iot_history')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'iot_history'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Histórico IoT
        </button>
        <button
          onClick={() => handleTabClick('maintenance')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'maintenance'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Manutenção ({pendingMaintenanceRequests})
        </button>
        <button
          onClick={() => handleTabClick('history')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'history'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Histórico por Máquina
        </button>
        <button
          onClick={() => handleTabClick('analytics')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'analytics'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análises
        </button>
        <button
          onClick={() => handleTabClick('rules')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'rules'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Regras (3)
        </button>
      </div>

      <IoTAlertPopupContainer />

      {/* Content */}
      <div className="min-h-96">
        {activeTab === 'alerts' && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Alertas Ativos</h3>
            {iotAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta ativo no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {iotAlerts.map(a => (
                  <div key={a.id} className="p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">Máquina: {a.machine_id}</div>
                      <div className={cn("text-xs uppercase px-2 py-1 rounded", a.priority === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white')}>{a.priority}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.metric}: {a.value}</div>
                    {a.message && <div className="text-xs">{a.message}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'iot_history' && (
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Histórico de Alertas IoT</h3>
              <select
                value={iotHistoryStatus}
                onChange={(e) => setIotHistoryStatus(e.target.value as any)}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="acknowledged">Reconhecidos</option>
                <option value="resolved">Resolvidos</option>
              </select>
            </div>
            {(() => {
              const list = iotHistoryStatus === 'all' ? iotHistory : iotHistory.filter(a => a.status === iotHistoryStatus);
              if (!list || list.length === 0) {
                return (
                  <div className="text-center py-10">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sem histórico encontrado</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2 max-h-[480px] overflow-auto">
                  {list.map((a) => (
                    <div key={a.id} className="p-3 rounded border flex items-start gap-3">
                      <div className={cn("text-xs uppercase px-2 py-1 rounded", a.status === 'active' ? 'bg-red-600 text-white' : a.status === 'acknowledged' ? 'bg-amber-500 text-white' : 'bg-green-600 text-white')}>
                        {a.status}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">Máquina: {a.machine_id}</div>
                          <div className={cn("text-xs uppercase px-2 py-1 rounded", a.priority === 'critical' ? 'bg-red-600 text-white' : a.priority === 'high' ? 'bg-orange-600 text-white' : a.priority === 'medium' ? 'bg-amber-500 text-white' : 'bg-gray-500 text-white')}>{a.priority}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{a.metric}: {a.value}</div>
                        {a.message && <div className="text-xs mt-1">{a.message}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'maintenance' && (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Carregando dados de manutenção...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <strong>✅ Separador Manutenção Ativo!</strong>
                <p>Solicitações: {maintenanceRequests.length} | Alertas: {maintenanceAlerts.length} | Downtime: {machineDowntime.length}</p>
              </div>

              {/* Maintenance Overview */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Solicitações Pendentes</p>
                      <p className="text-2xl font-bold text-destructive">{pendingMaintenanceRequests}</p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Críticas</p>
                      <p className="text-2xl font-bold text-red-600">{criticalMaintenanceRequests}</p>
                    </div>
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Máquinas Paradas</p>
                      <p className="text-2xl font-bold text-orange-600">{activeMachineDowntime}</p>
                    </div>
                    <Factory className="h-6 w-6 text-orange-600" />
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Em Progresso</p>
                      <p className="text-2xl font-bold text-blue-600">{maintenanceRequests.filter(r => r.status === 'in_progress').length}</p>
                    </div>
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Maintenance Requests */}
              <div className="rounded-lg border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-500" />
                  Solicitações de Manutenção
                </h3>
                
                <div className="space-y-3">
                  {maintenanceRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma solicitação ativa</p>
                    </div>
                  ) : (
                    maintenanceRequests.map((request) => {
                      const requestTime = new Date(request.requestedAt);
                      const now = new Date();
                      const ageMinutes = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60));
                      const ageHours = Math.floor(ageMinutes / 60);
                      const ageDays = Math.floor(ageHours / 24);
                      
                      return (
                        <div key={request.id} className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{request.title}</h4>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              request.urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' :
                              request.urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                              request.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            )}>
                              {request.urgencyLevel === 'critical' ? 'Crítica' :
                               request.urgencyLevel === 'high' ? 'Alta' :
                               request.urgencyLevel === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="space-y-1">
                                <div>Máquina: {request.machineName}</div>
                                <div>Operador: {request.operatorName}</div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className={cn(
                                  "px-2 py-1 rounded text-xs",
                                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  request.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                  request.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                                  request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                )}>
                                  {request.status === 'pending' ? 'Pendente' :
                                   request.status === 'assigned' ? 'Atribuída' :
                                   request.status === 'in_progress' ? 'Em Progresso' :
                                   request.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Há {ageDays > 0 ? `${ageDays}d` : ageHours > 0 ? `${ageHours}h` : `${ageMinutes}min`}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t">
                              {request.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmReceipt(request.id)}
                                  className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center justify-center gap-1"
                                >
                                  <CheckSquare className="h-3 w-3" />
                                  Confirmar Recepção
                                </button>
                              )}

                              {request.status === 'assigned' && (
                                <button
                                  onClick={() => handleStartWork(request.id)}
                                  className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center justify-center gap-1"
                                >
                                  <Play className="h-3 w-3" />
                                  Iniciar Trabalho
                                </button>
                              )}

                              {(request.status === 'in_progress' || request.status === 'assigned') && (
                                <button
                                  onClick={() => handleOpenWorkSheet(request)}
                                  className="flex-1 px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center justify-center gap-1"
                                >
                                  <FileText className="h-3 w-3" />
                                  Folha de Trabalho
                                </button>
                              )}

                              {request.status === 'completed' && (
                                <button
                                  onClick={() => handleOpenWorkSheet(request)}
                                  className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 flex items-center justify-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  Ver Detalhes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📋 Histórico de Manutenção por Máquina</h3>
              <p className="text-sm text-blue-800">
                Consulte o histórico completo de manutenção de cada máquina, incluindo estatísticas, custos e detalhes técnicos.
              </p>
            </div>
            <MachineMaintenanceHistory
              machineId={selectedMachineFromURL || undefined}
              onBackToOperator={() => window.open('/operator', '_self')}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Análises</h3>
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Análises e estatísticas em desenvolvimento</p>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Regras de Notificação</h3>
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Configuração de regras em desenvolvimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Popup for Backend Team */}
      <MaintenancePopupContainer onRequestUpdate={handleRequestUpdate} />

      {/* Maintenance Work Sheet */}
      {showWorkSheet && selectedRequest && (
        <MaintenanceWorkSheet
          request={selectedRequest}
          onClose={() => {
            setShowWorkSheet(false);
            setSelectedRequest(null);
          }}
          onComplete={handleWorkSheetComplete}
        />
      )}
    </div>
  );
}
