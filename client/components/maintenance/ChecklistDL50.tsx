import { useState } from "react";
import { X, Download, Save, Plus, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';

interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  status: 'ok' | 'nok' | 'na';
  observations?: string;
  required: boolean;
}

interface ChecklistData {
  equipmentId: string;
  equipmentName: string;
  model: string;
  serialNumber: string;
  location: string;
  inspectionDate: string;
  inspectorName: string;
  workOrderNumber: string;
  operatingHours: string;
  items: ChecklistItem[];
  photo?: string;
  responsibleName: string;
  responsibleRole: string;
  responsibleSignature: string;
}

interface ChecklistDL50Props {
  isOpen: boolean;
  onClose: () => void;
  equipmentData?: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    location: string;
  };
}

const defaultChecklistItems: ChecklistItem[] = [
  // Inspeção Pré-Operacional
  { id: '1', category: 'Inspeção Pré-Operacional', description: 'Estado geral do equipamento', status: 'ok', required: true },
  { id: '2', category: 'Inspeção Pré-Operacional', description: 'Presença de vazamentos visíveis', status: 'ok', required: true },
  { id: '3', category: 'Inspeção Pré-Operacional', description: 'Limpeza geral do equipamento', status: 'ok', required: true },
  { id: '4', category: 'Inspeção Pré-Operacional', description: 'Documentação de operação presente', status: 'ok', required: true },
  
  // Sistema Hidráulico
  { id: '5', category: 'Sistema Hidráulico', description: 'Nível de óleo hidráulico', status: 'ok', required: true },
  { id: '6', category: 'Sistema Hidráulico', description: 'Condição do óleo hidráulico', status: 'ok', required: true },
  { id: '7', category: 'Sistema Hidráulico', description: 'Funcionamento das mangueiras', status: 'ok', required: true },
  { id: '8', category: 'Sistema Hidráulico', description: 'Teste de pressão do sistema', status: 'ok', required: true },
  { id: '9', category: 'Sistema Hidráulico', description: 'Funcionamento dos cilindros', status: 'ok', required: true },
  
  // Sistema Elétrico
  { id: '10', category: 'Sistema Elétrico', description: 'Estado da bateria', status: 'ok', required: true },
  { id: '11', category: 'Sistema Elétrico', description: 'Conexões elétricas', status: 'ok', required: true },
  { id: '12', category: 'Sistema Elétrico', description: 'Funcionamento dos sinalizadores', status: 'ok', required: true },
  { id: '13', category: 'Sistema Elétrico', description: 'Sistema de alarmes', status: 'ok', required: false },
  
  // Segurança
  { id: '14', category: 'Segurança', description: 'Dispositivos de emergência', status: 'ok', required: true },
  { id: '15', category: 'Segurança', description: 'Proteções e guarda-corpos', status: 'ok', required: true },
  { id: '16', category: 'Segurança', description: 'Sinalização de segurança', status: 'ok', required: true },
  { id: '17', category: 'Segurança', description: 'EPIs disponíveis', status: 'ok', required: true },
  
  // Sistema Mecânico
  { id: '18', category: 'Sistema Mecânico', description: 'Estado dos rolamentos', status: 'ok', required: true },
  { id: '19', category: 'Sistema Mecânico', description: 'Lubrificação geral', status: 'ok', required: true },
  { id: '20', category: 'Sistema Mecânico', description: 'Alinhamento e fixação', status: 'ok', required: true },
  { id: '21', category: 'Sistema Mecânico', description: 'Desgaste de componentes', status: 'ok', required: true },
  
  // Calibração e Medição
  { id: '22', category: 'Calibração e Medição', description: 'Instrumentos de medição', status: 'ok', required: false },
  { id: '23', category: 'Calibração e Medição', description: 'Certificados de calibração válidos', status: 'ok', required: false },
  { id: '24', category: 'Calibração e Medição', description: 'Registos de temperatura/pressão', status: 'ok', required: false },
];

export function ChecklistDL50({ isOpen, onClose, equipmentData }: ChecklistDL50Props) {
  const [checklist, setChecklist] = useState<ChecklistData>({
    equipmentId: equipmentData?.id || '',
    equipmentName: equipmentData?.name || '',
    model: equipmentData?.model || '',
    serialNumber: equipmentData?.serialNumber || '',
    location: equipmentData?.location || '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '',
    workOrderNumber: '',
    operatingHours: '',
    items: defaultChecklistItems,
    photo: '',
    responsibleName: '',
    responsibleRole: 'Técnico de Manutenção',
    responsibleSignature: ''
  });

  const updateChecklistData = (field: keyof ChecklistData, value: any) => {
    setChecklist(prev => ({ ...prev, [field]: value }));
  };

  const updateChecklistItem = (itemId: string, field: keyof ChecklistItem, value: any) => {
    setChecklist(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = e.target?.result as string;
        setChecklist(prev => ({ ...prev, photo: photoData }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setChecklist(prev => ({ ...prev, photo: '' }));
  };

  const generateChecklistPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST DE INSPEÇÃO - MODELO DL50', 20, 20);
    
    // Equipment Information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Equipamento: ${checklist.equipmentName}`, 20, 35);
    doc.text(`Modelo: ${checklist.model}`, 20, 42);
    doc.text(`Número de Série: ${checklist.serialNumber}`, 20, 49);
    doc.text(`Localização: ${checklist.location}`, 120, 35);
    doc.text(`Data de Inspeção: ${new Date(checklist.inspectionDate).toLocaleDateString('pt-PT')}`, 120, 42);
    doc.text(`Inspetor: ${checklist.inspectorName}`, 120, 49);
    
    if (checklist.workOrderNumber) {
      doc.text(`O.T. Nº: ${checklist.workOrderNumber}`, 20, 56);
    }
    if (checklist.operatingHours) {
      doc.text(`Horas de Operação: ${checklist.operatingHours}`, 120, 56);
    }
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
    
    let yPosition = 75;
    let currentCategory = '';
    
    // Group items by category
    const categorizedItems = checklist.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);
    
    Object.entries(categorizedItems).forEach(([category, items]) => {
      // Category header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(category, 20, yPosition);
      yPosition += 10;
      
      // Items
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      items.forEach(item => {
        // Check if we need a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Status symbol
        let statusSymbol = '';
        let statusColor = '';
        switch (item.status) {
          case 'ok':
            statusSymbol = '✓';
            statusColor = 'green';
            break;
          case 'nok':
            statusSymbol = '✗';
            statusColor = 'red';
            break;
          case 'na':
            statusSymbol = 'N/A';
            statusColor = 'gray';
            break;
        }
        
        doc.text(`${statusSymbol}`, 25, yPosition);
        doc.text(item.description, 35, yPosition);
        
        if (item.required) {
          doc.text('*', 180, yPosition);
        }
        
        if (item.observations) {
          yPosition += 5;
          doc.setFontSize(8);
          doc.text(`Obs: ${item.observations}`, 35, yPosition);
          doc.setFontSize(9);
        }
        
        yPosition += 8;
      });
      
      yPosition += 5; // Space between categories
    });
    
    // Summary
    const okCount = checklist.items.filter(item => item.status === 'ok').length;
    const nokCount = checklist.items.filter(item => item.status === 'nok').length;
    const naCount = checklist.items.filter(item => item.status === 'na').length;
    const requiredNokCount = checklist.items.filter(item => item.status === 'nok' && item.required).length;
    
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DA INSPEÇÃO', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Itens Conformes (OK): ${okCount}`, 20, yPosition);
    doc.text(`Itens Não Conformes (NOK): ${nokCount}`, 20, yPosition + 8);
    doc.text(`Itens Não Aplicáveis (N/A): ${naCount}`, 20, yPosition + 16);
    
    // Overall status
    const overallStatus = requiredNokCount === 0 ? 'APROVADO' : 'REPROVADO';
    const statusColor = requiredNokCount === 0 ? 'green' : 'red';
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`STATUS GERAL: ${overallStatus}`, 20, yPosition + 30);
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('* Itens obrigatórios', 20, pageHeight - 20);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT')}`, 20, pageHeight - 10);
    doc.text('FactoryControl - Sistema de Gestão de Manutenção', 120, pageHeight - 10);
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Checklist_DL50_${checklist.equipmentName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
    
    doc.save(filename);
  };

  const getStatusIcon = (status: 'ok' | 'nok' | 'na') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'nok':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'na':
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const categorizedItems = checklist.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            Checklist de Inspeção - Modelo DL50
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Equipment Information */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Nome do Equipamento
              </label>
              <input
                type="text"
                value={checklist.equipmentName}
                onChange={(e) => updateChecklistData('equipmentName', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={checklist.model}
                onChange={(e) => updateChecklistData('model', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Número de Série
              </label>
              <input
                type="text"
                value={checklist.serialNumber}
                onChange={(e) => updateChecklistData('serialNumber', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Localização
              </label>
              <input
                type="text"
                value={checklist.location}
                onChange={(e) => updateChecklistData('location', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Data de Inspeção
              </label>
              <input
                type="date"
                value={checklist.inspectionDate}
                onChange={(e) => updateChecklistData('inspectionDate', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Nome do Inspetor
              </label>
              <input
                type="text"
                value={checklist.inspectorName}
                onChange={(e) => updateChecklistData('inspectorName', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Ordem de Trabalho
              </label>
              <input
                type="text"
                value={checklist.workOrderNumber}
                onChange={(e) => updateChecklistData('workOrderNumber', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Horas de Operação
              </label>
              <input
                type="text"
                value={checklist.operatingHours}
                onChange={(e) => updateChecklistData('operatingHours', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-card-foreground mb-4">Fotografia do Equipamento</h3>

            {checklist.photo ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img
                    src={checklist.photo}
                    alt="Foto do equipamento"
                    className="max-w-xs max-h-48 rounded-lg border"
                  />
                  <button
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    title="Remover foto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Alterar Foto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Adicionar Foto do Equipamento
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                </p>
              </div>
            )}
          </div>

          {/* Responsible Person Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-card-foreground mb-4">Responsável pela Inspeção</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={checklist.responsibleName}
                  onChange={(e) => updateChecklistData('responsibleName', e.target.value)}
                  placeholder="Nome completo do responsável"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Cargo/Função *
                </label>
                <select
                  value={checklist.responsibleRole}
                  onChange={(e) => updateChecklistData('responsibleRole', e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  required
                >
                  <option value="Técnico de Manutenção">Técnico de Manutenção</option>
                  <option value="Engenheiro de Manutenção">Engenheiro de Manutenção</option>
                  <option value="Supervisor de Manutenção">Supervisor de Manutenção</option>
                  <option value="Mecânico Industrial">Mecânico Industrial</option>
                  <option value="Eletricista Industrial">Eletricista Industrial</option>
                  <option value="Técnico em Automação">Técnico em Automação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Assinatura Digital *
                </label>
                <textarea
                  value={checklist.responsibleSignature}
                  onChange={(e) => updateChecklistData('responsibleSignature', e.target.value)}
                  placeholder="Digite sua assinatura ou identificação (ex: João Silva - CRM 12345)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                  rows={2}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta assinatura digital confirma que você é o responsável por esta inspeção.
                </p>
              </div>
            </div>
          </div>

          {/* Checklist Items by Category */}
          {Object.entries(categorizedItems).map(([category, items]) => (
            <div key={category} className="border rounded-lg">
              <div className="bg-muted p-4 rounded-t-lg">
                <h3 className="font-semibold text-card-foreground">{category}</h3>
              </div>
              <div className="p-4 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      {item.required && <span className="text-red-500 text-sm">*</span>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">{item.description}</p>
                      <div className="flex gap-4 mt-2">
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`status-${item.id}`}
                              checked={item.status === 'ok'}
                              onChange={() => updateChecklistItem(item.id, 'status', 'ok')}
                              className="rounded"
                            />
                            <span className="text-xs text-green-600">OK</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`status-${item.id}`}
                              checked={item.status === 'nok'}
                              onChange={() => updateChecklistItem(item.id, 'status', 'nok')}
                              className="rounded"
                            />
                            <span className="text-xs text-red-600">NOK</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              name={`status-${item.id}`}
                              checked={item.status === 'na'}
                              onChange={() => updateChecklistItem(item.id, 'status', 'na')}
                              className="rounded"
                            />
                            <span className="text-xs text-gray-600">N/A</span>
                          </label>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Observações..."
                        value={item.observations || ''}
                        onChange={(e) => updateChecklistItem(item.id, 'observations', e.target.value)}
                        className="w-full mt-2 rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={generateChecklistPDF}
              disabled={!checklist.equipmentName || !checklist.inspectorName || !checklist.responsibleName || !checklist.responsibleSignature}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Gerar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
