import { useState, useEffect } from 'react';
import { X, Wrench, Clock, User, Factory, CheckCircle, XCircle, FileText, Camera, Upload, Save } from 'lucide-react';
import { MaintenanceRequest } from '@/types/production';
import { maintenanceService } from '@/services/maintenanceService';
import { cn } from '@/lib/utils';

interface MaintenanceWorkSheetProps {
  request: MaintenanceRequest;
  onClose: () => void;
  onComplete: (requestId: string) => void;
}

export function MaintenanceWorkSheet({ request, onClose, onComplete }: MaintenanceWorkSheetProps) {
  const [workSheet, setWorkSheet] = useState({
    technicianName: '',
    startTime: new Date().toISOString(),
    endTime: '',
    diagnosis: '',
    actionsTaken: '',
    partsUsed: [''],
    workHours: 0,
    cost: 0,
    solved: false,
    followUpRequired: false,
    nextMaintenanceDate: '',
    observations: '',
    photos: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Auto-fill technician name from user session if available
    const user = JSON.parse(localStorage.getItem('factoryControl_session') || '{}');
    if (user.username) {
      setWorkSheet(prev => ({ ...prev, technicianName: user.username }));
    }
  }, []);

  const addPart = () => {
    setWorkSheet(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, '']
    }));
  };

  const updatePart = (index: number, value: string) => {
    setWorkSheet(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.map((part, i) => i === index ? value : part)
    }));
  };

  const removePart = (index: number) => {
    setWorkSheet(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!workSheet.technicianName || !workSheet.diagnosis) {
      alert('Preencha o técnico responsável e o diagnóstico');
      return;
    }

    setIsSubmitting(true);
    try {
      const status = workSheet.solved ? 'completed' : 'in_progress';
      const notes = `
Folha de Trabalho de Manutenção:
Técnico: ${workSheet.technicianName}
Diagnóstico: ${workSheet.diagnosis}
Ações Realizadas: ${workSheet.actionsTaken}
Peças Utilizadas: ${workSheet.partsUsed.filter(p => p.trim()).join(', ')}
Horas de Trabalho: ${workSheet.workHours}h
Custo: €${workSheet.cost}
Problema Resolvido: ${workSheet.solved ? 'Sim' : 'Não'}
Follow-up Necessário: ${workSheet.followUpRequired ? 'Sim' : 'Não'}
Observações: ${workSheet.observations}
      `.trim();

      await maintenanceService.updateMaintenanceRequestStatus(
        request.id,
        status,
        notes
      );

      onComplete(request.id);
    } catch (error) {
      console.error('Error submitting work sheet:', error);
      alert('Erro ao submeter folha de trabalho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgencyConfig = {
    low: 'border-green-200',
    medium: 'border-yellow-200',
    high: 'border-orange-200',
    critical: 'border-red-200'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={cn(
        "bg-white rounded-lg border-2 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto",
        urgencyConfig[request.urgencyLevel]
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Folha de Trabalho de Manutenção</h2>
              <p className="text-sm text-gray-600">#{request.id.slice(-8)} - {request.machineName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Information */}
          <div className="grid gap-4 md:grid-cols-2 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium mb-2">Informações da Solicitação</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Título:</strong> {request.title}</div>
                <div><strong>Descrição:</strong> {request.description}</div>
                <div><strong>Operador:</strong> {request.operatorName}</div>
                <div><strong>Urgência:</strong> 
                  <span className={cn(
                    "ml-1 px-2 py-1 rounded text-xs",
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
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Tempos</h3>
              <div className="space-y-1 text-sm">
                <div><strong>Solicitado:</strong> {new Date(request.requestedAt).toLocaleString('pt-BR')}</div>
                <div><strong>Iniciado:</strong> {new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </div>

          {/* Work Sheet Form */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Técnico Responsável *</label>
                <input
                  type="text"
                  value={workSheet.technicianName}
                  onChange={(e) => setWorkSheet(prev => ({ ...prev, technicianName: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nome do técnico"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Diagnóstico *</label>
                <textarea
                  value={workSheet.diagnosis}
                  onChange={(e) => setWorkSheet(prev => ({ ...prev, diagnosis: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24"
                  placeholder="Descreva o diagnóstico do problema"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ações Realizadas</label>
                <textarea
                  value={workSheet.actionsTaken}
                  onChange={(e) => setWorkSheet(prev => ({ ...prev, actionsTaken: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24"
                  placeholder="Descreva as ações tomadas para resolver o problema"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Horas de Trabalho</label>
                  <input
                    type="number"
                    step="0.5"
                    value={workSheet.workHours}
                    onChange={(e) => setWorkSheet(prev => ({ ...prev, workHours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Custo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={workSheet.cost}
                    onChange={(e) => setWorkSheet(prev => ({ ...prev, cost: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Peças Utilizadas</label>
                <div className="space-y-2">
                  {workSheet.partsUsed.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={part}
                        onChange={(e) => updatePart(index, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg"
                        placeholder="Nome da peça"
                      />
                      {workSheet.partsUsed.length > 1 && (
                        <button
                          onClick={() => removePart(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addPart}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Adicionar peça
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  value={workSheet.observations}
                  onChange={(e) => setWorkSheet(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg h-24"
                  placeholder="Observações adicionais"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Próxima Manutenção</label>
                <input
                  type="date"
                  value={workSheet.nextMaintenanceDate}
                  onChange={(e) => setWorkSheet(prev => ({ ...prev, nextMaintenanceDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="solved"
                    checked={workSheet.solved}
                    onChange={(e) => setWorkSheet(prev => ({ ...prev, solved: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="solved" className="text-sm font-medium">
                    Problema Resolvido
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="followUp"
                    checked={workSheet.followUpRequired}
                    onChange={(e) => setWorkSheet(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="followUp" className="text-sm font-medium">
                    Follow-up Necessário
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !workSheet.technicianName || !workSheet.diagnosis}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Folha de Trabalho'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
