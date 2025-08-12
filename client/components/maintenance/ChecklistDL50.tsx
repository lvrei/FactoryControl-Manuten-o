import { useState } from "react";
import { X, Download, Save, Plus, CheckCircle, XCircle, AlertTriangle, Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import { CameraCapture } from '../CameraCapture';

interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  status: 'ok' | 'nok' | 'na';
  observations?: string;
  required: boolean;
}

interface DetailedObservation {
  id: string;
  title: string;
  description: string;
  photos: string[];
  category: 'general' | 'safety' | 'maintenance' | 'defect' | 'improvement';
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
  detailedObservations: DetailedObservation[];
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
    responsibleSignature: '',
    detailedObservations: []
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

  const addDetailedObservation = () => {
    const newObservation: DetailedObservation = {
      id: Date.now().toString(),
      title: '',
      description: '',
      photos: [],
      category: 'general'
    };
    setChecklist(prev => ({
      ...prev,
      detailedObservations: [...prev.detailedObservations, newObservation]
    }));
  };

  const updateDetailedObservation = (id: string, field: keyof DetailedObservation, value: any) => {
    setChecklist(prev => ({
      ...prev,
      detailedObservations: prev.detailedObservations.map(obs =>
        obs.id === id ? { ...obs, [field]: value } : obs
      )
    }));
  };

  const removeDetailedObservation = (id: string) => {
    setChecklist(prev => ({
      ...prev,
      detailedObservations: prev.detailedObservations.filter(obs => obs.id !== id)
    }));
  };

  const addPhotoToObservation = (observationId: string, photoFile: File) => {
    if (!photoFile.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (photoFile.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const photoData = e.target?.result as string;
      setChecklist(prev => ({
        ...prev,
        detailedObservations: prev.detailedObservations.map(obs =>
          obs.id === observationId
            ? { ...obs, photos: [...obs.photos, photoData] }
            : obs
        )
      }));
    };
    reader.readAsDataURL(photoFile);
  };

  const removePhotoFromObservation = (observationId: string, photoIndex: number) => {
    setChecklist(prev => ({
      ...prev,
      detailedObservations: prev.detailedObservations.map(obs =>
        obs.id === observationId
          ? { ...obs, photos: obs.photos.filter((_, index) => index !== photoIndex) }
          : obs
      )
    }));
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
    
    // Add photo if available
    if (checklist.photo) {
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setLineWidth(0.5);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FOTOGRAFIA DO EQUIPAMENTO', 20, yPosition);
      yPosition += 15;

      try {
        doc.addImage(checklist.photo, 'JPEG', 20, yPosition, 80, 60);
        yPosition += 70;
      } catch (error) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Erro ao carregar a fotografia', 20, yPosition);
        yPosition += 15;
      }
    }

    // Summary
    const okCount = checklist.items.filter(item => item.status === 'ok').length;
    const nokCount = checklist.items.filter(item => item.status === 'nok').length;
    const naCount = checklist.items.filter(item => item.status === 'na').length;
    const requiredNokCount = checklist.items.filter(item => item.status === 'nok' && item.required).length;

    if (yPosition > 220) {
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
    yPosition += 50;

    // Signature section
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESPONSÁVEL PELA INSPEÇÃO', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${checklist.responsibleName}`, 20, yPosition);
    doc.text(`Cargo: ${checklist.responsibleRole}`, 20, yPosition + 8);
    doc.text(`Data: ${new Date(checklist.inspectionDate).toLocaleDateString('pt-PT')}`, 20, yPosition + 16);

    yPosition += 30;
    doc.text('Assinatura:', 20, yPosition);
    yPosition += 8;

    // Signature box
    doc.setLineWidth(0.3);
    doc.rect(20, yPosition, 100, 20);

    // Signature text inside box
    doc.setFontSize(8);
    const signatureLines = checklist.responsibleSignature.split('\n');
    signatureLines.forEach((line, index) => {
      if (line.trim() && index < 2) { // Maximum 2 lines in signature box
        doc.text(line.trim(), 22, yPosition + 8 + (index * 6));
      }
    });

    yPosition += 30;

    // Detailed Observations Section
    if (checklist.detailedObservations.length > 0) {
      // New page for observations
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES DETALHADAS', 20, yPosition);
      yPosition += 20;

      checklist.detailedObservations.forEach((observation, index) => {
        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        // Observation header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${observation.title || `Observação ${index + 1}`}`, 20, yPosition);
        yPosition += 10;

        // Category
        const categoryLabels = {
          general: 'Geral',
          safety: 'Segurança',
          maintenance: 'Manutenção',
          defect: 'Defeito',
          improvement: 'Melhoria'
        };

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Categoria: ${categoryLabels[observation.category]}`, 25, yPosition);
        yPosition += 10;

        // Description
        if (observation.description) {
          doc.text('Descrição:', 25, yPosition);
          yPosition += 6;

          // Split long descriptions into multiple lines
          const maxWidth = 160;
          const lines = doc.splitTextToSize(observation.description, maxWidth);
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, 30, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        }

        // Photos
        if (observation.photos.length > 0) {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.text(`Fotografias (${observation.photos.length}):`, 25, yPosition);
          yPosition += 10;

          // Add photos in grid layout
          let photosPerRow = 2;
          let photoWidth = 70;
          let photoHeight = 50;
          let currentRow = 0;
          let currentCol = 0;

          observation.photos.forEach((photo, photoIndex) => {
            // Check if we need a new page
            if (yPosition + photoHeight > 270) {
              doc.addPage();
              yPosition = 20;
              currentRow = 0;
              currentCol = 0;
            }

            try {
              const xPos = 30 + (currentCol * (photoWidth + 10));
              const yPos = yPosition + (currentRow * (photoHeight + 10));

              doc.addImage(photo, 'JPEG', xPos, yPos, photoWidth, photoHeight);

              // Add photo caption
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.text(`Foto ${photoIndex + 1}`, xPos, yPos + photoHeight + 5);

              currentCol++;
              if (currentCol >= photosPerRow) {
                currentCol = 0;
                currentRow++;
              }
            } catch (error) {
              doc.setFontSize(8);
              doc.text(`Erro ao carregar foto ${photoIndex + 1}`, 30, yPosition);
              yPosition += 8;
            }
          });

          // Calculate final position after photos
          const totalRows = Math.ceil(observation.photos.length / photosPerRow);
          yPosition += (totalRows * (photoHeight + 10)) + 10;
        }

        // Add separator line between observations
        if (index < checklist.detailedObservations.length - 1) {
          doc.setLineWidth(0.3);
          doc.line(20, yPosition, 190, yPosition);
          yPosition += 15;
        }
      });
    }

    // Footer on last page
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

          {/* Detailed Observations Section */}
          <div className="border rounded-lg">
            <div className="bg-muted p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-card-foreground">Observações Detalhadas</h3>
                <button
                  onClick={addDetailedObservation}
                  className="px-3 py-1 text-sm font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Nova Observação
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione observações específicas encontradas durante a inspeção com fotografias de evidência.
              </p>
            </div>
            <div className="p-4 space-y-4">
              {checklist.detailedObservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p>Nenhuma observação adicionada ainda.</p>
                  <p className="text-sm">Clique em "Nova Observação" para começar.</p>
                </div>
              ) : (
                checklist.detailedObservations.map((observation, index) => (
                  <div key={observation.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-card-foreground">Observação {index + 1}</h4>
                      <button
                        onClick={() => removeDetailedObservation(observation.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Remover observação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Título da Observação
                        </label>
                        <input
                          type="text"
                          value={observation.title}
                          onChange={(e) => updateDetailedObservation(observation.id, 'title', e.target.value)}
                          placeholder="Ex: Vazamento detectado na válvula principal"
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Categoria
                        </label>
                        <select
                          value={observation.category}
                          onChange={(e) => updateDetailedObservation(observation.id, 'category', e.target.value)}
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                        >
                          <option value="general">Geral</option>
                          <option value="safety">Segurança</option>
                          <option value="maintenance">Manutenção</option>
                          <option value="defect">Defeito</option>
                          <option value="improvement">Melhoria</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Descrição Detalhada
                      </label>
                      <textarea
                        value={observation.description}
                        onChange={(e) => updateDetailedObservation(observation.id, 'description', e.target.value)}
                        placeholder="Descreva detalhadamente a observação, incluindo localização, gravidade e ações recomendadas..."
                        className="w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                        rows={3}
                      />
                    </div>

                    {/* Photos section for each observation */}
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Fotografias da Observação
                      </label>

                      {/* Photo grid */}
                      {observation.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                          {observation.photos.map((photo, photoIndex) => (
                            <div key={photoIndex} className="relative group">
                              <img
                                src={photo}
                                alt={`Foto ${photoIndex + 1} da observação`}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <button
                                onClick={() => removePhotoFromObservation(observation.id, photoIndex)}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add photo button */}
                      <div>
                        <input
                          type="file"
                          id={`photo-${observation.id}`}
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach(file => {
                                addPhotoToObservation(observation.id, file);
                              });
                            }
                            e.target.value = ''; // Reset input
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor={`photo-${observation.id}`}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded hover:bg-secondary/90 cursor-pointer"
                        >
                          <Camera className="h-4 w-4" />
                          Adicionar Fotos
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pode selecionar múltiplas fotos de uma vez. Máximo 5MB por foto.
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

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
