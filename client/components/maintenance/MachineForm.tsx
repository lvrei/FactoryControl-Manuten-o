import { useState } from "react";
import { X, Plus } from "lucide-react";
import { BackToOperatorButton } from '../BackToOperatorButton';
import { cn } from "@/lib/utils";

interface MachineFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (machine: MachineData) => void;
  editingMachine?: MachineData | null;
  showBackToOperator?: boolean;
  onBackToOperator?: () => void;
}

export interface MachineData {
  id?: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  installationDate: string;
  location: string;
  category: string;
  status: 'operational' | 'maintenance' | 'stopped';
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  maintenanceInterval: number;
  operatingHours: number;
  notes: string;
}

const categories = [
  'Linha de Montagem',
  'Prensa Hidráulica',
  'Forno Industrial',
  'Robô Soldador',
  'Sistema de Pintura',
  'Esteira Transportadora',
  'Compressor',
  'Gerador',
  'Sistema de Ventilação',
  'Outros'
];

export function MachineForm({ isOpen, onClose, onSave, editingMachine }: MachineFormProps) {
  const [formData, setFormData] = useState<MachineData>(
    editingMachine || {
      name: '',
      model: '',
      manufacturer: '',
      serialNumber: '',
      installationDate: '',
      location: '',
      category: '',
      status: 'operational',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      maintenanceInterval: 30,
      operatingHours: 0,
      notes: ''
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof MachineData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
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
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Nome da Máquina *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Prensa Hidráulica 01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: HP-500X"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Fabricante
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Bosch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Número de Série
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: BSC123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Categoria *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecionar categoria</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as 'operational' | 'maintenance' | 'stopped')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="operational">Operacional</option>
                <option value="maintenance">Em Manutenção</option>
                <option value="stopped">Parada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Data de Instalação
              </label>
              <input
                type="date"
                value={formData.installationDate}
                onChange={(e) => handleChange('installationDate', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Localização
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ex: Setor A - Linha 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Última Manutenção
              </label>
              <input
                type="date"
                value={formData.lastMaintenanceDate}
                onChange={(e) => handleChange('lastMaintenanceDate', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Próxima Manutenção
              </label>
              <input
                type="date"
                value={formData.nextMaintenanceDate}
                onChange={(e) => handleChange('nextMaintenanceDate', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Intervalo de Manutenção (dias)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maintenanceInterval}
                onChange={(e) => handleChange('maintenanceInterval', parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Horas de Operação
              </label>
              <input
                type="number"
                min="0"
                value={formData.operatingHours}
                onChange={(e) => handleChange('operatingHours', parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Informações adicionais sobre a máquina..."
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
              {editingMachine ? 'Atualizar' : 'Criar'} Máquina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
