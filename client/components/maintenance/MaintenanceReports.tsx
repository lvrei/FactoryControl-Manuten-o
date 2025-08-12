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

      const summaryData = [
        'Total de Manutenções Realizadas: 47',
        'Manutenções Preventivas: 31 (66%)',
        'Manutenções Corretivas: 16 (34%)',
        'Tempo Médio de Execução: 2.3 horas',
        'Taxa de Eficiência: 94.2%',
        'Custo Total: €12.450',
        'Equipamentos com Maior Necessidade:'
      ];

      summaryData.forEach((line, index) => {
        doc.text(line, 25, yPosition + (index * 8));
      });

      yPosition += summaryData.length * 8 + 10;

      const equipmentStats = [
        '• Torno CNC-001: 8 manutenções',
        '• Fresadora FR-023: 6 manutenções',
        '• Prensa PR-015: 5 manutenções'
      ];

      equipmentStats.forEach((line, index) => {
        doc.text(line, 30, yPosition + (index * 8));
      });

    } else if (reportType === 'detailed') {
      doc.text('Relatório Detalhado de Manutenções', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const detailedData = [
        '1. Manutenção Preventiva - Torno CNC-001',
        '   Data: 15/01/2024 | Técnico: João Silva',
        '   Atividades: Lubrificação, verificação de peças',
        '   Tempo: 1.5h | Custo: €89',
        '',
        '2. Manutenção Corretiva - Fresadora FR-023',
        '   Data: 18/01/2024 | Técnico: Maria Santos',
        '   Atividades: Substituição de motor, alinhamento',
        '   Tempo: 4h | Custo: €320',
        '',
        '3. Manutenção Preventiva - Prensa PR-015',
        '   Data: 22/01/2024 | Técnico: Pedro Costa',
        '   Atividades: Inspeção hidráulica, troca de filtros',
        '   Tempo: 2h | Custo: €145'
      ];

      detailedData.forEach((line, index) => {
        if (line.startsWith('  ')) {
          doc.text(line, 30, yPosition + (index * 6));
        } else {
          doc.text(line, 25, yPosition + (index * 6));
        }
      });

    } else if (reportType === 'performance') {
      doc.text('Análise de Performance de Equipamentos', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const performanceData = [
        'Indicadores de Performance:',
        '',
        'Disponibilidade Média: 96.8%',
        'Tempo Médio Entre Falhas (MTBF): 180 horas',
        'Tempo Médio de Reparo (MTTR): 2.1 horas',
        'Eficiência Global (OEE): 92.4%',
        '',
        'Equipamentos com Melhor Performance:',
        '• Torno CNC-002: 98.5% disponibilidade',
        '• Robot de Solda RB-007: 97.8% disponibilidade',
        '• Fresadora FR-019: 97.2% disponibilidade',
        '',
        'Equipamentos com Atenção Necessária:',
        '• Prensa PR-012: 89.3% disponibilidade',
        '• Torno CNC-001: 91.7% disponibilidade'
      ];

      performanceData.forEach((line, index) => {
        if (line.startsWith('•')) {
          doc.text(line, 30, yPosition + (index * 8));
        } else {
          doc.text(line, 25, yPosition + (index * 8));
        }
      });

    } else if (reportType === 'costs') {
      doc.text('Análise de Custos de Manutenção', 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const costData = [
        'Resumo Financeiro:',
        '',
        'Custo Total de Manutenções: €12.450',
        'Custo Médio por Manutenção: €265',
        'Custo de Peças: €7.890 (63%)',
        'Custo de Mão-de-obra: €4.560 (37%)',
        '',
        'Distribuição por Tipo:',
        '• Manutenção Preventiva: €8.200 (66%)',
        '• Manutenção Corretiva: €4.250 (34%)',
        '',
        'Equipamentos com Maior Custo:',
        '• Fresadora FR-023: €2.340',
        '• Torno CNC-001: €1.890',
        '• Prensa PR-015: €1.650',
        '',
        'Projeção Anual: €149.400'
      ];

      costData.forEach((line, index) => {
        if (line.startsWith('•')) {
          doc.text(line, 30, yPosition + (index * 8));
        } else {
          doc.text(line, 25, yPosition + (index * 8));
        }
      });

    } else if (reportType === 'equipment') {
      doc.text(`Relatório Específico: ${equipmentInfo}`, 20, yPosition);
      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const equipmentData = [
        'Informações do Equipamento:',
        '',
        `Nome: ${equipmentInfo}`,
        'Localização: Área de Produção A',
        'Ano de Fabricação: 2019',
        'Último Serviço: 15/01/2024',
        'Próxima Manutenção: 15/04/2024',
        '',
        'Histórico de Manutenções (Últimos 6 meses):',
        '• 15/01/2024 - Manutenção Preventiva - €89',
        '• 20/11/2023 - Troca de filtros - €45',
        '• 18/09/2023 - Manutenção Corretiva - €230',
        '• 15/07/2023 - Lubrificação geral - €35',
        '',
        'Estatísticas:',
        'Total de Manutenções: 8',
        'Custo Total: €1.890',
        'Tempo Total de Parada: 18.5 horas',
        'Disponibilidade: 91.7%'
      ];

      equipmentData.forEach((line, index) => {
        if (line.startsWith('•')) {
          doc.text(line, 30, yPosition + (index * 7));
        } else {
          doc.text(line, 25, yPosition + (index * 7));
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
