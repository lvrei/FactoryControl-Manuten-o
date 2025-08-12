import { useState, useEffect } from "react";
import { X, Download, FileText, BarChart3, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';

interface Machine {
  id: string;
  name: string;
}

interface MaintenanceReportsProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  initialEquipment?: string;
}

type ReportType = 'summary' | 'detailed' | 'performance' | 'costs' | 'equipment';
type DateOption = 'all' | 'range' | 'since';

export function MaintenanceReports({ isOpen, onClose, machines, initialEquipment }: MaintenanceReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateOption, setDateOption] = useState<DateOption>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sinceDate, setSinceDate] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>(initialEquipment || 'all');
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

  // Update selected equipment and report type when initialEquipment changes
  useEffect(() => {
    if (initialEquipment && initialEquipment !== 'all') {
      setSelectedEquipment(initialEquipment);
      setReportType('equipment');
    }
  }, [initialEquipment]);

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
                    onClick={() => setReportType(type.value as ReportType)}
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

          {/* Equipment Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Equipamento
            </label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">Todos os Equipamentos</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Options */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Período do Relatório
            </label>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dateOption"
                    value="all"
                    checked={dateOption === 'all'}
                    onChange={(e) => setDateOption(e.target.value as DateOption)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-card-foreground">Desde sempre</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dateOption"
                    value="since"
                    checked={dateOption === 'since'}
                    onChange={(e) => setDateOption(e.target.value as DateOption)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-card-foreground">Desde uma data específica</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="dateOption"
                    value="range"
                    checked={dateOption === 'range'}
                    onChange={(e) => setDateOption(e.target.value as DateOption)}
                    className="rounded border-input"
                  />
                  <span className="text-sm text-card-foreground">Período específico</span>
                </label>
              </div>

              {dateOption === 'since' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Desde</label>
                  <input
                    type="date"
                    value={sinceDate}
                    onChange={(e) => setSinceDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {dateOption === 'range' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Data Final</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
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
              disabled={
                (dateOption === 'range' && (!dateRange.start || !dateRange.end)) ||
                (dateOption === 'since' && !sinceDate)
              }
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
