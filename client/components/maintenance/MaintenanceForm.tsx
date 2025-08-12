import { useState, useEffect } from "react";
import { X, Plus, Calendar, DollarSign, Camera, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (maintenance: MaintenanceData) => void;
  machines: Array<{ id: string; name: string }>;
  editingMaintenance?: MaintenanceData | null;
}

export interface MaintenanceData {
  id?: string;
  machineId: string;
  machineName?: string;
  type: 'preventive' | 'corrective' | 'predictive';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  estimatedCost: number;
  actualCost?: number;
  estimatedDuration: number;
  actualDuration?: number;
  description: string;
  technician: string;
  parts: string;
  notes: string;
  photos: File[];
  createdAt: string;
}

const maintenanceTypes = [
  { value: 'preventive', label: 'Preventiva', description: 'Manutenção programada' },
  { value: 'corrective', label: 'Corretiva', description: 'Reparo de falhas' },
  { value: 'predictive', label: 'Preditiva', description: 'Baseada em condições' }
];

const priorityTypes = [
  { value: 'low', label: 'Baixa', color: 'text-success bg-success/10' },
  { value: 'medium', label: 'Média', color: 'text-warning bg-warning/10' },
  { value: 'high', label: 'Alta', color: 'text-info bg-info/10' },
  { value: 'critical', label: 'Crítica', color: 'text-destructive bg-destructive/10' }
];

export function MaintenanceForm({ 
  isOpen, 
  onClose, 
  onSave, 
  machines, 
  editingMaintenance 
}: MaintenanceFormProps) {
  const [formData, setFormData] = useState<MaintenanceData>(
    editingMaintenance || {
      machineId: '',
      type: 'preventive',
      priority: 'medium',
      status: 'scheduled',
      scheduledDate: '',
      estimatedCost: 0,
      estimatedDuration: 2,
      description: '',
      technician: '',
      parts: '',
      notes: '',
      photos: [],
      createdAt: new Date().toISOString().split('T')[0]
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof MaintenanceData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));

    if (validFiles.length !== files.length) {
      alert('Apenas arquivos de imagem são permitidos');
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }));

    // Reset input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            {editingMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Máquina *
              </label>
              <select
                required
                value={formData.machineId}
                onChange={(e) => handleChange('machineId', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecionar máquina</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Tipo de Manutenção *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {maintenanceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Prioridade *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {priorityTypes.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Data Programada *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledDate}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="scheduled">Agendada</option>
                <option value="in_progress">Em Andamento</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Custo Estimado (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Duração Estimada (horas)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.estimatedDuration}
                onChange={(e) => handleChange('estimatedDuration', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Técnico Responsável
              </label>
              <input
                type="text"
                value={formData.technician}
                onChange={(e) => handleChange('technician', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nome do técnico"
              />
            </div>

            {formData.status === 'completed' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Data de Conclusão
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.completedDate || ''}
                    onChange={(e) => handleChange('completedDate', e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Custo Real (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.actualCost || 0}
                    onChange={(e) => handleChange('actualCost', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Duração Real (horas)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={formData.actualDuration || 0}
                    onChange={(e) => handleChange('actualDuration', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Descrição do Serviço *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Descreva o serviço de manutenção a ser realizado..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Peças e Materiais
            </label>
            <textarea
              value={formData.parts}
              onChange={(e) => handleChange('parts', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Liste as peças e materiais necessários..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Fotos e Anexos
            </label>
            <div className="space-y-3">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      Clique para adicionar fotos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG até 10MB cada
                    </p>
                  </div>
                </label>
              </div>

              {/* Photo Preview */}
              {formData.photos.length > 0 && (
                <div className="grid gap-3 md:grid-cols-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {photo.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {editingMaintenance ? 'Atualizar' : 'Criar'} Manutenção
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
