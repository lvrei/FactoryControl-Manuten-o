import { Machine } from "@/types/production";

type Sensor = {
  id: string;
  name: string;
  type: string;
  protocol: 'OPC_UA' | 'MQTT' | 'HTTP' | 'MODBUS_TCP' | string;
  address?: string;
  metadata?: any;
  created_at?: string;
};

type SensorBinding = {
  id: string;
  sensorId: string;
  machineId: string;
  metric: string;
  unit?: string;
  scale?: number;
  offset?: number;
};

type SensorRule = {
  id: string;
  machineId: string;
  sensorId?: string | null;
  metric: string;
  operator: 'range' | 'gt' | 'lt' | 'eq';
  minValue?: number | null;
  maxValue?: number | null;
  thresholdValue?: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled?: boolean;
};

type Alert = {
  id: string;
  machine_id: string;
  rule_id?: string | null;
  sensor_id?: string | null;
  metric: string;
  value: number;
  status: 'active' | 'acknowledged' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  resolved_at?: string | null;
};

class IotService {
  async listSensors(): Promise<Sensor[]> {
    const r = await fetch('/api/sensors');
    if (!r.ok) throw new Error('Falha ao listar sensores');
    return r.json();
  }

  async createSensor(data: Partial<Sensor>): Promise<string> {
    const r = await fetch('/api/sensors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('Falha ao criar sensor');
    const j = await r.json();
    return j.id;
  }

  async bindSensor(data: Partial<SensorBinding>): Promise<string> {
    const r = await fetch('/api/sensors/bind', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('Falha ao associar sensor');
    const j = await r.json();
    return j.id;
  }

  async listRules(): Promise<SensorRule[]> {
    const r = await fetch('/api/rules');
    if (!r.ok) throw new Error('Falha ao listar regras');
    return r.json();
  }

  async createRule(data: Partial<SensorRule>): Promise<string> {
    const r = await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('Falha ao criar regra');
    const j = await r.json();
    return j.id;
  }

  async ingestReading(params: { sensorId: string; metric: string; value: number; timestamp?: string }): Promise<{ ok: boolean; alertsCreated: number }> {
    const r = await fetch('/api/sensors/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
    if (!r.ok) throw new Error('Falha no ingest');
    return r.json();
  }

  async listAlerts(status?: 'active' | 'acknowledged' | 'resolved'): Promise<Alert[]> {
    const r = await fetch(`/api/alerts${status ? `?status=${status}` : ''}`);
    if (!r.ok) throw new Error('Falha ao listar alertas');
    return r.json();
  }

  async ackAlert(id: string): Promise<void> {
    const r = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
    if (!r.ok) throw new Error('Falha ao confirmar alerta');
  }
}

export const iotService = new IotService();
export type { Sensor, SensorBinding, SensorRule, Alert };
