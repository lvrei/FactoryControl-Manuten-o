// Tipos para o sistema de produção de corte de espuma

export interface FoamType {
  id: string;
  name: string;
  density: number;
  hardness: string;
  color: string;
  specifications: string;
  pricePerM3: number;
  stockColor?: string; // Cor para identificação visual no stock
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

// Interfaces para gestão de stock de blocos de espuma
export interface FoamBlock {
  id: string;
  productionNumber: string;
  foamType: FoamType;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  volume: number; // em m³
  weight?: number; // em kg
  productionDate: string;
  blockNumber: string;
  warehouse: 'BZM' | 'LOOPER';
  status: 'available' | 'reserved' | 'in_production' | 'consumed';
  qualityStatus: 'pending' | 'approved' | 'rejected';
  nonConformities: string[];
  comments: string;
  receivedDate: string;
  receivedBy: string;
  reservedFor?: string; // ID da ordem de produção que reservou o bloco
  consumedDate?: string;
  consumedBy?: string;
  photos?: string[];
}

export interface StockMovement {
  id: string;
  blockId: string;
  type: 'entry' | 'exit' | 'transfer' | 'reservation' | 'consumption';
  fromWarehouse?: 'BZM' | 'LOOPER';
  toWarehouse?: 'BZM' | 'LOOPER';
  quantity: number;
  timestamp: string;
  operator: string;
  reason: string;
  productionOrderId?: string;
  notes?: string;
}

export interface WarehouseLocation {
  id: string;
  warehouse: 'BZM' | 'LOOPER';
  zone: string;
  position: string;
  maxCapacity: number;
  currentOccupancy: number;
  blockIds: string[];
}

export interface StockFilters {
  warehouse?: 'BZM' | 'LOOPER' | 'all';
  foamType?: string;
  status?: string;
  qualityStatus?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  productionNumber?: string;
  blockNumber?: string;
}

// Authentication and User Management
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password: string; // In production, this should be hashed
  role: 'admin' | 'supervisor' | 'operator' | 'quality' | 'maintenance';
  accessLevel: 'full' | 'limited' | 'readonly';
  isActive: boolean;
  lastLogin?: string;
  assignedMachines?: string[]; // IDs of machines the operator can use
}

export interface LoginSession {
  id: string;
  userId: string;
  username: string;
  role: string;
  accessLevel: string;
  loginTime: string;
  lastActivity: string;
  isActive: boolean;
}

// Print Label for Zebra ZPL
export interface PrintLabel {
  id: string;
  orderId: string;
  lineId: string;
  operationId: string;
  barcodeId: string; // Unique internal ID for barcode
  customerName: string;
  orderNumber: string;
  foamType: string;
  quantity: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  operatorName: string;
  machineId: string;
  machineName: string;
  completionDate: string;
  printedBy: string;
  printedAt: string;
}

// Enhanced Machine interface with files
export interface MachineFile {
  id: string;
  name: string;
  type: 'photo' | 'manual' | 'certificate' | 'maintenance' | 'other';
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
}

// Update Machine interface to include files
export interface EnhancedMachine extends Machine {
  coverPhoto?: string;
  files: MachineFile[];
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  notes?: string;
}
