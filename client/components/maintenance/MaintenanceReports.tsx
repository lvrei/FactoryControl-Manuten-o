import { useState } from "react";
import { X, Download, Calendar, Filter, FileText, BarChart3, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Machine {
  id: string;
  name: string;
}

interface MaintenanceReportsProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
}

export function MaintenanceReports({ isOpen, onClose, machines }: MaintenanceReportsProps) {
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'performance' | 'costs'>('summary');
  const [dateOption, setDateOption] = useState<'all' | 'range' | 'since'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sinceDate, setSinceDate] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [filters, setFilters] = useState({
    types: [] as string[],
    status: 'all'
  });

  const reportTypes = [
    {
      value: 'summary',
      label: 'Resumo Geral',
      description: 'Visão geral das manutenções realizadas',
      icon: BarChart3
    },
    {
      value: 'detailed',
      label: 'Relatório Detalhado',
      description: 'Informações completas de cada manutenção',
      icon: FileText
    },
    {
      value: 'performance',
      label: 'Performance de Equipamentos',
      description: 'Análise de eficiência e tempo de inatividade',
      icon: TrendingUp
    },
    {
      value: 'costs',
      label: 'Análise de Custos',
      description: 'Relatório financeiro de manutenções',
      icon: Download
    },
    {
      value: 'equipment',
      label: 'Relatório por Equipamento',
      description: 'Histórico completo de um equipamento específico',
      icon: Settings
    }
  ];

  const handleGenerateReport = () => {
    const selectedMachine = machines.find(m => m.id === selectedEquipment);
    let dateInfo = '';

    if (dateOption === 'all') {
      dateInfo = 'Desde sempre';
    } else if (dateOption === 'since') {
      dateInfo = `Desde ${new Date(sinceDate).toLocaleDateString('pt-BR')}`;
    } else {
      dateInfo = `De ${new Date(dateRange.start).toLocaleDateString('pt-BR')} até ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`;
    }

    const equipmentInfo = selectedEquipment === 'all' ? 'Todos os equipamentos' : selectedMachine?.name;

    const reportData = {
      type: reportType,
      equipment: selectedEquipment,
      dateOption,
      dateRange,
      sinceDate,
      filters,
      timestamp: new Date().toISOString()
    };

    // Simulate report generation
    alert(`Gerando relatório PDF:\n• Tipo: ${reportTypes.find(r => r.value === reportType)?.label}\n• Equipamento: ${equipmentInfo}\n• Período: ${dateInfo}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold text-card-foreground">Gerar Relatório de Manutenção</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Tipo de Relatório
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.value}
                    onClick={() => setReportType(type.value as any)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      reportType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5",
                        reportType === type.value ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div>
                        <h4 className="font-medium text-card-foreground">{type.label}</h4>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Filtros
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">Todos os status</option>
                  <option value="completed">Concluídas</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="scheduled">Agendadas</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Tipo de Manutenção</label>
                <div className="flex gap-4">
                  {['Preventiva', 'Corretiva', 'Preditiva'].map((type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type)}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            types: e.target.checked
                              ? [...prev.types, type]
                              : prev.types.filter(t => t !== type)
                          }));
                        }}
                        className="rounded border-input"
                      />
                      <span className="text-sm text-card-foreground">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium text-card-foreground mb-2">Prévia do Relatório</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Tipo: {reportTypes.find(r => r.value === reportType)?.label}</p>
              <p>• Período: {dateRange.start || 'Não definido'} até {dateRange.end || 'Não definido'}</p>
              <p>• Status: {filters.status === 'all' ? 'Todos' : filters.status}</p>
              {filters.types.length > 0 && (
                <p>• Tipos: {filters.types.join(', ')}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={!dateRange.start || !dateRange.end}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
