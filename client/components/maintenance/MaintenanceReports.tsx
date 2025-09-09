import { useState, useEffect } from "react";
import { X, Download, FileText, BarChart3, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import { maintenanceService } from '@/services/maintenanceService';
import { MaintenanceRequest, MachineDowntime } from '@/types/production';

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

type ReportType = 'summary' | 'detailed' | 'performance' | 'costs' | 'equipment' | 'checklist';
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
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [downtimes, setDowntimes] = useState<MachineDowntime[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    },
    {
      value: 'checklist',
      label: 'Checklist DL50',
      description: 'Checklist de inspeção detalhado modelo DL50',
      icon: FileText
    }
  ];

  // Update selected equipment and report type when initialEquipment changes
  useEffect(() => {
    if (initialEquipment && initialEquipment !== 'all') {
      setSelectedEquipment(initialEquipment);
      setReportType('equipment');
    }
  }, [initialEquipment]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const [reqs, dts, pls] = await Promise.all([
          maintenanceService.getMaintenanceRequests(),
          maintenanceService.getMachineDowntime(),
          maintenanceService.getMaintenancePlans()
        ]);
        setRequests(reqs);
        setDowntimes(dts);
        setPlans(pls || []);
      } catch (e) {
        console.error('Erro ao carregar dados de manutenção', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  // Helpers to apply equipment and date filters consistently
  const withinDate = (dateStr?: string) => {
    if (!dateStr) return dateOption === 'all';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateOption === 'all';
    if (dateOption === 'all') return true;
    if (dateOption === 'since') return d >= new Date(sinceDate);
    if (dateOption === 'range') return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
    return true;
  };
  const byEquipment = (machineId?: string) => selectedEquipment === 'all' || machineId === selectedEquipment;
  const filteredRequests = () => requests.filter(r => byEquipment(r.machineId) && withinDate(r.completedAt || r.startedAt || r.assignedAt || r.requestedAt));
  const filteredPlans = () => (plans || []).filter((p:any) => byEquipment(p.machineId) && withinDate(p.completedDate || p.scheduledDate));
  const filteredDowntimes = () => downtimes.filter(d => byEquipment(d.machineId) && withinDate(d.endTime || d.startTime));

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const selectedMachine = machines.find(m => m.id === selectedEquipment);
    const reportTypeInfo = reportTypes.find(r => r.value === reportType);

    let dateInfo = '';
    if (dateOption === 'all') {
      dateInfo = 'Desde sempre';
    } else if (dateOption === 'since') {
      dateInfo = `Desde ${new Date(sinceDate).toLocaleDateString('pt-PT')}`;
    } else {
      dateInfo = `De ${new Date(dateRange.start).toLocaleDateString('pt-PT')} até ${new Date(dateRange.end).toLocaleDateString('pt-PT')}`;
    }

    const equipmentInfo = selectedEquipment === 'all' ? 'Todos os equipamentos' : selectedMachine?.name;

    // PDF Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FactoryControl - Relatório de Manutenção', 20, 20);

    // Report Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Relatório: ${reportTypeInfo?.label}`, 20, 40);
    doc.text(`Equipamento: ${equipmentInfo}`, 20, 50);
    doc.text(`Período: ${dateInfo}`, 20, 60);
    doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT')}`, 20, 70);

    // Add line separator
    doc.setLineWidth(0.5);
    doc.line(20, 80, 190, 80);

    let yPosition = 90;

    // Content based on report type
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    if (reportType === 'summary') {
      doc.text('Resumo Geral de Manutenções', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const reqs = filteredRequests();
      const plns = filteredPlans();
      const dts = filteredDowntimes();

      const total = reqs.length;
      const completed = reqs.filter(r=> r.status==='completed').length;
      const pending = reqs.filter(r=> r.status!=='completed' && r.status!=='cancelled').length;
      const critical = reqs.filter(r=> r.urgencyLevel==='critical').length;
      const activeDowntime = dts.filter(d=> d.status==='ongoing').length;
      const scheduledPlanned = plns.filter((p:any)=> p.status==='scheduled').length;
      const completedPlanned = plns.filter((p:any)=> p.status==='completed').length;

      const summaryData = [
        `Solicitações de Manutenção: ${total}`,
        `Concluídas: ${completed} | Pendentes: ${pending} | Críticas: ${critical}`,
        `Manutenções Programadas: ${plns.length} (Agendadas: ${scheduledPlanned}, Concluídas: ${completedPlanned})`,
        `Paragens Ativas: ${activeDowntime}`,
      ];

      summaryData.forEach((line, index) => {
        doc.text(line, 25, yPosition + (index * 8));
      });

    } else if (reportType === 'detailed') {
      doc.text('Relatório Detalhado de Manutenções', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const reqs = filteredRequests()
        .sort((a,b)=> new Date(b.completedAt || b.requestedAt).getTime()-new Date(a.completedAt || a.requestedAt).getTime());
      const plns = filteredPlans()
        .sort((a:any,b:any)=> new Date(b.completedDate || b.scheduledDate).getTime()-new Date(a.completedDate || a.scheduledDate).getTime());

      let index = 1;
      const pageHeight = doc.internal.pageSize.height;
      const addLine = (text: string, indent = 0) => {
        if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
        doc.text(text, 25 + indent, yPosition);
        yPosition += 6;
      };

      reqs.forEach(r => {
        const title = `${index++}. ${r.category === 'preventive' ? 'Preventiva' : 'Solicitação'} - ${r.machineName}`;
        addLine(title);
        const dateStr = new Date(r.completedAt || r.requestedAt).toLocaleString('pt-PT');
        addLine(`Data: ${dateStr} | Técnico: ${r.assignedTo || '—'}`, 5);
        addLine(`Título: ${r.title}`, 5);
        if (r.description) addLine(`Descrição: ${r.description}`, 5);
        const timeH = r.workHours != null ? `${r.workHours}h` : (r.actualDowntime ? `${Math.round(r.actualDowntime/60)}h` : '—');
        addLine(`Tempo: ${timeH} | Custo: €${(r.cost || 0).toFixed(2)} | Estado: ${r.status}`, 5);
        yPosition += 2;
      });

      plns.forEach((p:any) => {
        const title = `${index++}. Planeada (${p.type}) - ${p.machineName || '—'}`;
        addLine(title);
        const dateRef = p.completedDate || p.scheduledDate;
        addLine(`Data: ${dateRef ? new Date(dateRef).toLocaleString('pt-PT') : '—'} | Técnico: ${p.technician || '—'}`, 5);
        if (p.description) addLine(`Descrição: ${p.description}`, 5);
        const timeH = p.actualDuration != null ? `${p.actualDuration}h` : (p.estimatedDuration != null ? `${p.estimatedDuration}h (estim.)` : '—');
        const costV = p.actualCost != null ? p.actualCost : (p.estimatedCost != null ? p.estimatedCost : 0);
        addLine(`Tempo: ${timeH} | Custo: €${Number(costV).toFixed(2)} | Estado: ${p.status}`, 5);
        yPosition += 2;
      });

    } else if (reportType === 'performance') {
      doc.text('Análise de Performance de Equipamentos', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const dts = filteredDowntimes();
      const completed = dts.filter(d=> d.status==='completed' && typeof d.duration === 'number');
      const totalDowntime = completed.reduce((s,d)=> s + (d.duration || 0), 0); // minutes
      const mttr = completed.length ? Math.round(totalDowntime / completed.length) : 0; // minutes

      const now = new Date();
      let windowStart: Date;
      if (dateOption === 'range') windowStart = new Date(dateRange.start);
      else if (dateOption === 'since') windowStart = new Date(sinceDate);
      else windowStart = new Date(now.getTime() - 30*24*60*60*1000);
      const windowMinutes = Math.max(1, Math.round((now.getTime() - windowStart.getTime())/60000));
      const availability = Math.max(0, Math.min(100, Math.round((1 - (totalDowntime/windowMinutes)) * 100)));

      const byMachine: Record<string, {name:string, downtime:number}> = {};
      dts.forEach(d => {
        const key = d.machineId;
        if (!byMachine[key]) byMachine[key] = { name: d.machineName, downtime: 0 };
        byMachine[key].downtime += d.duration || 0;
      });
      const topDowntime = Object.values(byMachine).sort((a,b)=> b.downtime - a.downtime).slice(0,5);

      const lines: string[] = [];
      lines.push('Indicadores de Performance:');
      lines.push('');
      lines.push(`Disponibilidade Média (aprox.): ${availability}%`);
      lines.push(`MTTR (Tempo Médio de Reparo): ${Math.round(mttr)} min`);
      const failures = completed.length || 1;
      const mtbf = Math.round((windowMinutes - totalDowntime) / failures);
      lines.push(`MTBF (Tempo Médio Entre Falhas): ${mtbf} min`);
      lines.push('');
      lines.push('Equipamentos com Maior Tempo de Paragem:');
      topDowntime.forEach(m => lines.push(`• ${m.name || '—'}: ${Math.round(m.downtime)} min`));

      const pageHeight = doc.internal.pageSize.height;
      lines.forEach((line) => {
        if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
        doc.text(line.startsWith('•') ? line : line, line.startsWith('•') ? 30 : 25, yPosition);
        yPosition += 8;
      });

    } else if (reportType === 'costs') {
      doc.text('Análise de Custos de Manutenção', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const reqs = filteredRequests();
      const plns = filteredPlans();

      const reqCost = reqs.reduce((s,r)=> s + (r.cost || 0), 0);
      const planActual = plns.reduce((s:any,p:any)=> s + (p.actualCost || 0), 0);
      const planEstimatedOnly = plns.reduce((s:any,p:any)=> s + ((p.actualCost ? 0 : (p.estimatedCost || 0))), 0);
      const total = reqCost + planActual + planEstimatedOnly;
      const avgPerIntervention = (reqs.length + plns.length) ? total / (reqs.length + plns.length) : 0;

      const byMachineCosts: Record<string, {name: string, cost: number}> = {};
      reqs.forEach(r => {
        const key = r.machineId; if (!byMachineCosts[key]) byMachineCosts[key] = { name: r.machineName, cost: 0 };
        byMachineCosts[key].cost += r.cost || 0;
      });
      plns.forEach((p:any) => {
        const key = p.machineId; if (!byMachineCosts[key]) byMachineCosts[key] = { name: p.machineName, cost: 0 };
        byMachineCosts[key].cost += p.actualCost || p.estimatedCost || 0;
      });
      const topCosts = Object.values(byMachineCosts).sort((a,b)=> b.cost - a.cost).slice(0,5);

      const lines: string[] = [];
      lines.push('Resumo Financeiro:');
      lines.push('');
      lines.push(`Custo Total: €${total.toFixed(2)}`);
      lines.push(`Custo Médio por Intervenção: €${avgPerIntervention.toFixed(2)}`);
      lines.push(`Solicitações (corretivas): €${reqCost.toFixed(2)}`);
      lines.push(`Planos (atuais): €${planActual.toFixed(2)} | Planos (estimados): €${planEstimatedOnly.toFixed(2)}`);
      lines.push('');
      lines.push('Equipamentos com Maior Custo:');
      topCosts.forEach(m => lines.push(`• ${m.name || '—'}: €${m.cost.toFixed(2)}`));

      const pageHeight = doc.internal.pageSize.height;
      lines.forEach((line) => {
        if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
        doc.text(line.startsWith('•') ? line : line, line.startsWith('•') ? 30 : 25, yPosition);
        yPosition += 8;
      });

    } else if (reportType === 'equipment') {
      doc.text(`Relatório Específico: ${equipmentInfo}`, 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const reqs = filteredRequests().sort((a,b)=> new Date(b.requestedAt).getTime()-new Date(a.requestedAt).getTime());
      const plns = filteredPlans().sort((a:any,b:any)=> new Date(b.scheduledDate || b.completedDate).getTime()-new Date(a.scheduledDate || a.completedDate).getTime());
      const totalCount = reqs.length + plns.length;
      doc.text(`Total de intervenções: ${totalCount}`, 25, yPosition); yPosition += 8;

      const pageHeight = doc.internal.pageSize.height;
      for (const r of reqs) {
        const line = `${new Date(r.requestedAt).toLocaleDateString('pt-PT')} - ${r.machineName} - ${r.title} - ${r.status.toUpperCase()}`;
        doc.text(line, 25, yPosition); yPosition += 6;
        if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
      }
      for (const p of plns as any[]) {
        const ref = p.completedDate || p.scheduledDate;
        const line = `${ref ? new Date(ref).toLocaleDateString('pt-PT') : ''} - ${p.machineName || ''} - Plano ${p.type} - ${p.status.toUpperCase()}`;
        doc.text(line, 25, yPosition); yPosition += 6;
        if (yPosition > pageHeight - 20) { doc.addPage(); yPosition = 20; }
      }

    } else if (reportType === 'checklist') {
      doc.text('Checklist de Inspeção - Modelo DL50', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      doc.text('NOTA: Este é um modelo simplificado. Para checklist completo', 25, yPosition);
      doc.text('utilize a funcionalidade específica de Checklist DL50.', 25, yPosition + 8);
      yPosition += 25;

      const checklistCategories = [
        'Inspeção Pré-Operacional:',
        '• Estado geral do equipamento',
        '• Presença de vazamentos visíveis',
        '• Limpeza geral do equipamento',
        '• Documentação de operação presente',
        '',
        'Sistema Hidráulico:',
        '• Nível de óleo hidráulico',
        '• Condição do óleo hidráulico',
        '• Funcionamento das mangueiras',
        '• Teste de pressão do sistema',
        '',
        'Sistema Elétrico:',
        '• Estado da bateria',
        '• Conexões elétricas',
        '• Funcionamento dos sinalizadores',
        '',
        'Segurança:',
        '• Dispositivos de emergência',
        '• Proteções e guarda-corpos',
        '• Sinalização de segurança'
      ];

      checklistCategories.forEach((line, index) => {
        if (line.startsWith('•')) {
          doc.text(line, 30, yPosition + (index * 6));
        } else if (line.endsWith(':')) {
          doc.setFont('helvetica', 'bold');
          doc.text(line, 25, yPosition + (index * 6));
          doc.setFont('helvetica', 'normal');
        } else {
          doc.text(line, 25, yPosition + (index * 6));
        }
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Gerado pelo FactoryControl - Sistema de Gestão de Chão de Fábrica', 20, pageHeight - 10);

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Relatorio_${reportTypeInfo?.label.replace(/\s+/g, '_')}_${timestamp}.pdf`;

    // Download PDF
    doc.save(filename);
  };

  const handleGenerateReport = () => {
    try {
      generatePDFReport();
      onClose();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar o relatório. Tente novamente.');
    }
  };

  if (!isOpen) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card p-6 rounded">Carregando dados do relatório...</div>
      </div>
    );
  }

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
