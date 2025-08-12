import { useState } from "react";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Search,
  Filter,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  Edit,
  FileText,
  Award,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface QualityInspection {
  id: string;
  inspectionNumber: string;
  product: string;
  batch: string;
  orderNumber: string;
  inspectionType: 'incoming' | 'in_process' | 'final' | 'customer_return';
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'rework';
  inspector: string;
  date: string;
  sampleSize: number;
  defects: number;
  defectRate: number;
  notes: string;
  criteria: QualityCriteria[];
}

interface QualityCriteria {
  id: string;
  name: string;
  specification: string;
  measured: string;
  result: 'pass' | 'fail' | 'warning';
  critical: boolean;
}

interface DefectType {
  type: string;
  count: number;
  percentage: number;
}

const qualityInspections: QualityInspection[] = [
  {
    id: "1",
    inspectionNumber: "QI-2024-001",
    product: "Componente A-150",
    batch: "LOT-240122-001",
    orderNumber: "OP-2024-001",
    inspectionType: "final",
    status: "approved",
    inspector: "Carlos Mendes",
    date: "2024-01-22T14:30",
    sampleSize: 50,
    defects: 2,
    defectRate: 4.0,
    notes: "Pequenos riscos superficiais - dentro do tolerável",
    criteria: [
      { id: "1", name: "Dimensões", specification: "150±0.5mm", measured: "149.8mm", result: "pass", critical: true },
      { id: "2", name: "Acabamento", specification: "Ra 1.6", measured: "Ra 1.4", result: "pass", critical: false },
      { id: "3", name: "Dureza", specification: "45-50 HRC", measured: "47 HRC", result: "pass", critical: true }
    ]
  },
  {
    id: "2", 
    inspectionNumber: "QI-2024-002",
    product: "Peça B-200",
    batch: "LOT-240121-002",
    orderNumber: "OP-2024-002",
    inspectionType: "in_process",
    status: "rejected",
    inspector: "Ana Silva",
    date: "2024-01-21T10:15",
    sampleSize: 30,
    defects: 8,
    defectRate: 26.7,
    notes: "Fora de especificação dimensional - requer retrabalho",
    criteria: [
      { id: "1", name: "Diâmetro", specification: "20±0.1mm", measured: "20.15mm", result: "fail", critical: true },
      { id: "2", name: "Concentricidade", specification: "0.05mm", measured: "0.08mm", result: "fail", critical: true },
      { id: "3", name: "Rugosidade", specification: "Ra 3.2", measured: "Ra 2.8", result: "pass", critical: false }
    ]
  },
  {
    id: "3",
    inspectionNumber: "QI-2024-003", 
    product: "Conjunto C-100",
    batch: "LOT-240120-003",
    orderNumber: "OP-2024-003",
    inspectionType: "incoming",
    status: "in_progress",
    inspector: "Roberto Santos",
    date: "2024-01-20T08:00",
    sampleSize: 25,
    defects: 1,
    defectRate: 4.0,
    notes: "Inspeção em andamento",
    criteria: [
      { id: "1", name: "Material", specification: "AISI 304", measured: "Conforme", result: "pass", critical: true },
      { id: "2", name: "Certificado", specification: "ISO 9001", measured: "Pendente", result: "warning", critical: true }
    ]
  }
];

const defectTypes: DefectType[] = [
  { type: "Dimensional", count: 45, percentage: 35 },
  { type: "Superficial", count: 30, percentage: 23 },
  { type: "Material", count: 25, percentage: 19 },
  { type: "Montagem", count: 20, percentage: 16 },
  { type: "Outros", count: 8, percentage: 7 }
];

const qualityTrend = [
  { month: 'Jan', defectRate: 3.2, target: 5.0 },
  { month: 'Fev', defectRate: 2.8, target: 5.0 },
  { month: 'Mar', defectRate: 4.1, target: 5.0 },
  { month: 'Abr', defectRate: 3.5, target: 5.0 },
  { month: 'Mai', defectRate: 2.9, target: 5.0 },
  { month: 'Jun', defectRate: 3.8, target: 5.0 }
];

const statusConfig = {
  pending: { color: "text-muted-foreground bg-muted", label: "Pendente", icon: Clock },
  in_progress: { color: "text-info bg-info/10", label: "Em Análise", icon: Eye },
  approved: { color: "text-success bg-success/10", label: "Aprovado", icon: CheckCircle },
  rejected: { color: "text-destructive bg-destructive/10", label: "Rejeitado", icon: XCircle },
  rework: { color: "text-warning bg-warning/10", label: "Retrabalho", icon: AlertTriangle }
};

const inspectionTypeConfig = {
  incoming: { label: "Recebimento", color: "text-info" },
  in_process: { label: "Processo", color: "text-warning" },
  final: { label: "Final", color: "text-success" },
  customer_return: { label: "Devolução", color: "text-destructive" }
};

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))'];

export default function Quality() {
  const [activeTab, setActiveTab] = useState<'inspections' | 'analytics'>('inspections');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);

  const filteredInspections = qualityInspections.filter(inspection => {
    const matchesSearch = inspection.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inspection.batch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInspections = qualityInspections.length;
  const approvedInspections = qualityInspections.filter(i => i.status === 'approved').length;
  const rejectedInspections = qualityInspections.filter(i => i.status === 'rejected').length;
  const pendingInspections = qualityInspections.filter(i => i.status === 'pending' || i.status === 'in_progress').length;

  const avgDefectRate = qualityInspections.reduce((sum, i) => sum + i.defectRate, 0) / qualityInspections.length;
  const approvalRate = (approvedInspections / totalInspections) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Qualidade</h1>
          <p className="text-muted-foreground">
            Inspeções, testes e gestão da qualidade de produtos
          </p>
        </div>
        
        <button
          onClick={() => alert('Formulário de nova inspeção em desenvolvimento')}
          className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Inspeção
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-card-foreground">{totalInspections}</p>
            </div>
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
              <p className="text-2xl font-bold text-success">{approvedInspections}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejeitados</p>
              <p className="text-2xl font-bold text-destructive">{rejectedInspections}</p>
            </div>
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-warning">{pendingInspections}</p>
            </div>
            <Clock className="h-6 w-6 text-warning" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa Aprovação</p>
              <p className="text-2xl font-bold text-card-foreground">{approvalRate.toFixed(1)}%</p>
            </div>
            <Target className="h-6 w-6 text-success" />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa Defeitos</p>
              <p className="text-2xl font-bold text-card-foreground">{avgDefectRate.toFixed(1)}%</p>
            </div>
            <TrendingDown className="h-6 w-6 text-success" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('inspections')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'inspections'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Inspeções ({qualityInspections.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === 'analytics'
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análises e Relatórios
        </button>
      </div>

      {activeTab === 'inspections' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Inspections List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-card-foreground">Inspeções de Qualidade</h3>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar inspeção..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Análise</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                    <option value="rework">Retrabalho</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredInspections.map((inspection) => {
                  const config = statusConfig[inspection.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <div
                      key={inspection.id}
                      onClick={() => setSelectedInspection(inspection)}
                      className={cn(
                        "border-b p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedInspection?.id === inspection.id && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-card-foreground">{inspection.inspectionNumber}</p>
                          <p className="text-sm text-muted-foreground">{inspection.product} • {inspection.batch}</p>
                        </div>
                        <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {inspectionTypeConfig[inspection.inspectionType].label} • {inspection.inspector}
                        </span>
                        <span className={cn(
                          "font-medium",
                          inspection.defectRate > 10 ? "text-destructive" : 
                          inspection.defectRate > 5 ? "text-warning" : "text-success"
                        )}>
                          {inspection.defectRate.toFixed(1)}% defeitos
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inspection Details */}
          <div className="lg:col-span-1">
            {selectedInspection ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground">Detalhes da Inspeção</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert(`Editando inspeção ${selectedInspection.inspectionNumber}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Editar inspeção"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => alert(`Gerando relatório para ${selectedInspection.inspectionNumber}`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        title="Gerar relatório"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número:</span>
                      <span className="font-medium text-card-foreground">{selectedInspection.inspectionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produto:</span>
                      <span className="font-medium text-card-foreground">{selectedInspection.product}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lote:</span>
                      <span className="font-medium text-card-foreground">{selectedInspection.batch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium text-card-foreground">
                        {inspectionTypeConfig[selectedInspection.inspectionType].label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inspetor:</span>
                      <span className="font-medium text-card-foreground">{selectedInspection.inspector}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium text-card-foreground">
                        {new Date(selectedInspection.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amostra:</span>
                      <span className="font-medium text-card-foreground">{selectedInspection.sampleSize} unid.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Defeitos:</span>
                      <span className="font-medium text-destructive">{selectedInspection.defects}</span>
                    </div>
                  </div>

                  {selectedInspection.notes && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Observações:</p>
                      <p className="text-sm text-card-foreground">{selectedInspection.notes}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h4 className="text-md font-semibold text-card-foreground mb-4">Critérios de Inspeção</h4>
                  <div className="space-y-3">
                    {selectedInspection.criteria.map((criterion) => (
                      <div key={criterion.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-card-foreground">{criterion.name}</p>
                            {criterion.critical && (
                              <span className="px-1.5 py-0.5 text-xs bg-destructive/10 text-destructive rounded">
                                Crítico
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Esp: {criterion.specification}</p>
                          <p className="text-xs text-muted-foreground">Med: {criterion.measured}</p>
                        </div>
                        <div className="flex items-center">
                          {criterion.result === 'pass' && <CheckCircle className="h-4 w-4 text-success" />}
                          {criterion.result === 'fail' && <XCircle className="h-4 w-4 text-destructive" />}
                          {criterion.result === 'warning' && <AlertTriangle className="h-4 w-4 text-warning" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Selecione uma Inspeção</h3>
                <p className="text-muted-foreground">
                  Escolha uma inspeção da lista para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quality Trend */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Tendência de Qualidade</h3>
              <p className="text-sm text-muted-foreground">Taxa de defeitos vs meta</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Meta"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="defectRate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Taxa Real (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Defect Types */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Tipos de Defeitos</h3>
              <p className="text-sm text-muted-foreground">Distribuição por categoria</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percentage }) => `${type} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {defectTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Defect Types Table */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-card-foreground">Análise Detalhada de Defeitos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">Tipo de Defeito</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Quantidade</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Percentual</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Tendência</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defectTypes.map((defect, index) => (
                      <tr key={defect.type} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="font-medium text-card-foreground">{defect.type}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{defect.count}</td>
                        <td className="p-4 text-sm text-muted-foreground">{defect.percentage}%</td>
                        <td className="p-4">
                          {index % 2 === 0 ? (
                            <div className="flex items-center gap-1 text-success">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-sm">-12%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-destructive">
                              <TrendingUp className="h-4 w-4" />
                              <span className="text-sm">+8%</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <button className="text-sm text-primary hover:text-primary/80 font-medium">
                            Analisar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">Certificações e Compliance</h3>
                  <p className="text-sm text-muted-foreground">Status das certificações de qualidade</p>
                </div>
                <Award className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-success/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">ISO 9001:2015</h4>
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground">Válido até: 15/06/2025</p>
                  <p className="text-sm text-success">Certificado ativo</p>
                </div>

                <div className="p-4 rounded-lg border bg-warning/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">ISO 14001</h4>
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <p className="text-sm text-muted-foreground">Válido até: 22/03/2024</p>
                  <p className="text-sm text-warning">Renovação necessária</p>
                </div>

                <div className="p-4 rounded-lg border bg-info/5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-card-foreground">IATF 16949</h4>
                    <Clock className="h-5 w-5 text-info" />
                  </div>
                  <p className="text-sm text-muted-foreground">Auditoria: 10/04/2024</p>
                  <p className="text-sm text-info">Em processo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
