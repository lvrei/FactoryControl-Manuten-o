// Tipos para o sistema de produção de corte de espuma

export interface FoamType {
  id: string;
  name: string;
  density: number;
  hardness: string;
  color: string;
  specifications: string;
  pricePerM3: number;
}

export interface ProductSheet {
  id: string;
  internalReference: string;
  foamType: FoamType;
  standardDimensions: {
    length: number;
    width: number;
    height: number;
  };
  description: string;
  documents: string[];
  photos: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Machine {
  id: string;
  name: string;
  type: 'BZM' | 'CAROUSEL' | 'CNC' | 'PRE_CNC';
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  currentOperator?: string;
  maxDimensions: {
    length: number;
    width: number;
    height: number;
  };
  cuttingPrecision: number; // em mm
}

export interface CuttingOperation {
  id: string;
  machineId: string;
  inputDimensions: {
    length: number;
    width: number;
    height: number;
  };
  outputDimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  completedQuantity: number;
  estimatedTime: number; // em minutos
  actualTime?: number;
  status: 'pending' | 'in_progress' | 'completed';
  operatorNotes?: string;
  observations?: string; // Observações para o operador
}

export interface ProductionOrderLine {
  id: string;
  foamType: FoamType;
  initialDimensions: {
    length: number;
    width: number;
    height: number;
  };
  finalDimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  completedQuantity: number;
  cuttingOperations: CuttingOperation[];
  status: 'pending' | 'in_progress' | 'completed';
  priority: number; // 1-10, onde 10 é mais prioritário
}

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    contact: string;
  };
  expectedDeliveryDate: string;
  lines: ProductionOrderLine[];
  status: 'created' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  totalVolume: number; // volume total em m³
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OperatorWorkItem {
  id: string;
  orderId: string;
  orderNumber: string;
  lineId: string;
  operationId: string;
  customer: string;
  foamType: string;
  inputDimensions: {
    length: number;
    width: number;
    height: number;
  };
  outputDimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  remainingQuantity: number;
  machineId: string;
  machineName: string;
  machineType: string;
  priority: number;
  expectedDeliveryDate: string;
  estimatedTime: number;
  observations?: string;
}

export interface ChatMessage {
  id: string;
  from: 'backend' | 'operator';
  to?: string; // operador específico ou máquina específica
  machineId?: string;
  operatorId?: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  orderId?: string; // relacionado a uma OP específica
}

export interface OperatorSession {
  id: string;
  operatorId: string;
  operatorName: string;
  machineId: string;
  machineName: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

// Estados para filtros e buscas
export interface ProductionFilters {
  status?: string[];
  priority?: string[];
  customer?: string;
  machine?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  foamType?: string;
}
