import { MaintenanceRequest, MaintenanceAlert, MachineDowntime } from '@/types/production';
import { productionService } from './productionService';

class MaintenanceService {
  private maintenanceRequestsKey = 'factoryControl_maintenanceRequests';
  private maintenanceAlertsKey = 'factoryControl_maintenanceAlerts';
  private machineDowntimeKey = 'factoryControl_machineDowntime';

  // DB-backed Scheduled Maintenances (plans)
  async getMaintenancePlans(): Promise<any[]> {
    try { const r = await fetch('/api/maintenance/plans'); if (r.ok) return r.json(); } catch {}
    return [];
  }
  async createMaintenancePlan(plan: any): Promise<string> {
    const r = await fetch('/api/maintenance/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) });
    if (!r.ok) throw new Error('Falha ao criar manutenção'); const j = await r.json(); return j.id;
  }
  async updateMaintenancePlan(id: string, patch: any): Promise<void> {
    const r = await fetch(`/api/maintenance/plans/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!r.ok) throw new Error('Falha ao atualizar manutenção');
  }
  async deleteMaintenancePlan(id: string): Promise<void> {
    const r = await fetch(`/api/maintenance/plans/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Falha ao apagar manutenção');
  }

  // Maintenance Requests
  async createMaintenanceRequest(requestData: Omit<MaintenanceRequest, 'id' | 'requestedAt' | 'status' | 'priority'>): Promise<MaintenanceRequest> {
    const priority = this.calculatePriority(requestData.urgencyLevel);
    try {
      const resp = await fetch('/api/maintenance/requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestData, priority, followUpRequired: requestData.urgencyLevel === 'critical' || requestData.urgencyLevel === 'high' })
      });
      if (resp.ok) {
        const { id } = await resp.json();
        const newRequest: MaintenanceRequest = { ...requestData, id, requestedAt: new Date().toISOString(), status: 'pending', priority, followUpRequired: requestData.urgencyLevel === 'critical' || requestData.urgencyLevel === 'high' };
        try {
          await fetch('/api/maintenance/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            type: 'maintenance_request', machineId: requestData.machineId, machineName: requestData.machineName, title: `Solicitação de Manutenção - ${requestData.title}`,
            description: requestData.description, urgencyLevel: requestData.urgencyLevel, maintenanceRequestId: id
          }) });
        } catch {}
        if (requestData.urgencyLevel === 'critical') {
          try {
            await fetch('/api/maintenance/downtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
              machineId: requestData.machineId, machineName: requestData.machineName, reason: 'breakdown', description: `Máquina parada devido a urgência crítica: ${requestData.title}`,
              reportedBy: requestData.operatorName, maintenanceRequestId: id, impact: 'critical'
            }) });
          } catch {}
          await productionService.updateMachineStatus(requestData.machineId, 'maintenance');
        }
        return newRequest;
      }
    } catch {}

    const requests = this.getStoredMaintenanceRequests();
    const newRequest: MaintenanceRequest = { ...requestData, id: this.generateId(), requestedAt: new Date().toISOString(), status: 'pending', priority, followUpRequired: requestData.urgencyLevel === 'critical' || requestData.urgencyLevel === 'high' };
    requests.push(newRequest);
    localStorage.setItem(this.maintenanceRequestsKey, JSON.stringify(requests));
    await this.createMaintenanceAlert({ type: 'maintenance_request', machineId: requestData.machineId, machineName: requestData.machineName, title: `Solicitação de Manutenção - ${requestData.title}`, description: requestData.description, urgencyLevel: requestData.urgencyLevel, maintenanceRequestId: newRequest.id });
    if (requestData.urgencyLevel === 'critical') {
      await this.createMachineDowntime({ machineId: requestData.machineId, machineName: requestData.machineName, reason: 'breakdown', description: `Máquina parada devido a urgência crítica: ${requestData.title}`, reportedBy: requestData.operatorName, maintenanceRequestId: newRequest.id, impact: 'critical' });
      await productionService.updateMachineStatus(requestData.machineId, 'maintenance');
    }
    return newRequest;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    try { const r = await fetch('/api/maintenance/requests'); if (r.ok) return r.json(); } catch {}
    return this.getStoredMaintenanceRequests();
  }

  async getMaintenanceRequestsByMachine(machineId: string): Promise<MaintenanceRequest[]> {
    try { const list = await this.getMaintenanceRequests(); return list.filter(r => r.machineId === machineId); } catch {}
    const requests = this.getStoredMaintenanceRequests();
    return requests.filter(r => r.machineId === machineId);
  }

  async updateMaintenanceRequestStatus(id: string, status: MaintenanceRequest['status'], technicianNotes?: string): Promise<void> {
    try {
      const r = await fetch(`/api/maintenance/requests/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, technicianNotes }) });
      if (r.ok) {
        if (status === 'completed') {
          try { const dts = await this.getActiveMachineDowntime(); const d = dts.find(x => x.maintenanceRequestId === id); if (d) await this.endMachineDowntime(d.id); } catch {}
        }
        return;
      }
    } catch {}

    const requests = this.getStoredMaintenanceRequests();
    const requestIndex = requests.findIndex(r => r.id === id);
    if (requestIndex !== -1) {
      const request = requests[requestIndex];
      request.status = status;
      request.technicianNotes = technicianNotes;
      if (status === 'assigned') request.assignedAt = new Date().toISOString();
      else if (status === 'in_progress') request.startedAt = new Date().toISOString();
      else if (status === 'completed') {
        request.completedAt = new Date().toISOString();
        const downtimes = this.getStoredMachineDowntime();
        const downtime = downtimes.find(d => d.maintenanceRequestId === id && d.status === 'ongoing');
        if (downtime) await this.endMachineDowntime(downtime.id);
        if (request.urgencyLevel === 'critical' && status === 'completed') {
          await productionService.updateMachineStatus(request.machineId, 'available');
        }
      }
      localStorage.setItem(this.maintenanceRequestsKey, JSON.stringify(requests));
    }
  }

  // Maintenance Alerts
  async createMaintenanceAlert(alertData: Omit<MaintenanceAlert, 'id' | 'createdAt' | 'status'>): Promise<MaintenanceAlert> {
    try { const r = await fetch('/api/maintenance/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alertData) }); if (r.ok) { const { id } = await r.json(); return { ...alertData, id, createdAt: new Date().toISOString(), status: 'active' } as MaintenanceAlert; } } catch {}
    const alerts = this.getStoredMaintenanceAlerts();
    const newAlert: MaintenanceAlert = { ...alertData, id: this.generateId(), createdAt: new Date().toISOString(), status: 'active' };
    alerts.push(newAlert);
    localStorage.setItem(this.maintenanceAlertsKey, JSON.stringify(alerts));
    return newAlert;
  }

  async getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    try { const r = await fetch('/api/maintenance/alerts'); if (r.ok) return r.json(); } catch {}
    return this.getStoredMaintenanceAlerts();
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<void> {
    try { const r = await fetch(`/api/maintenance/alerts/${id}/ack`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acknowledgedBy }) }); if (r.ok) return; } catch {}
    const alerts = this.getStoredMaintenanceAlerts();
    const alertIndex = alerts.findIndex(a => a.id === id);
    if (alertIndex !== -1) {
      alerts[alertIndex].status = 'acknowledged';
      alerts[alertIndex].acknowledgedAt = new Date().toISOString();
      alerts[alertIndex].acknowledgedBy = acknowledgedBy;
      localStorage.setItem(this.maintenanceAlertsKey, JSON.stringify(alerts));
    }
  }

  async resolveAlert(id: string, resolvedBy: string): Promise<void> {
    try { const r = await fetch(`/api/maintenance/alerts/${id}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedBy }) }); if (r.ok) return; } catch {}
    const alerts = this.getStoredMaintenanceAlerts();
    const alertIndex = alerts.findIndex(a => a.id === id);
    if (alertIndex !== -1) {
      alerts[alertIndex].status = 'resolved';
      alerts[alertIndex].resolvedAt = new Date().toISOString();
      alerts[alertIndex].resolvedBy = resolvedBy;
      localStorage.setItem(this.maintenanceAlertsKey, JSON.stringify(alerts));
    }
  }

  // Machine Downtime
  async createMachineDowntime(downtimeData: Omit<MachineDowntime, 'id' | 'startTime' | 'status'>): Promise<MachineDowntime> {
    try { const r = await fetch('/api/maintenance/downtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(downtimeData) }); if (r.ok) { const { id } = await r.json(); return { ...downtimeData, id, startTime: new Date().toISOString(), status: 'ongoing' } as MachineDowntime; } } catch {}
    const downtimes = this.getStoredMachineDowntime();
    const newDowntime: MachineDowntime = { ...downtimeData, id: this.generateId(), startTime: new Date().toISOString(), status: 'ongoing' };
    downtimes.push(newDowntime);
    localStorage.setItem(this.machineDowntimeKey, JSON.stringify(downtimes));
    return newDowntime;
  }

  async endMachineDowntime(id: string, resolvedBy?: string): Promise<void> {
    try { const r = await fetch(`/api/maintenance/downtime/${id}/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedBy }) }); if (r.ok) return; } catch {}
    const downtimes = this.getStoredMachineDowntime();
    const downtimeIndex = downtimes.findIndex(d => d.id === id);
    if (downtimeIndex !== -1) {
      const downtime = downtimes[downtimeIndex];
      downtime.endTime = new Date().toISOString();
      downtime.status = 'completed';
      downtime.resolvedBy = resolvedBy;
      downtime.duration = Math.floor((new Date(downtime.endTime).getTime() - new Date(downtime.startTime).getTime()) / (1000 * 60));
      localStorage.setItem(this.machineDowntimeKey, JSON.stringify(downtimes));
    }
  }

  async getMachineDowntime(): Promise<MachineDowntime[]> {
    try { const r = await fetch('/api/maintenance/downtime'); if (r.ok) return r.json(); } catch {}
    return this.getStoredMachineDowntime();
  }

  async getActiveMachineDowntime(): Promise<MachineDowntime[]> {
    const downtimes = await this.getMachineDowntime();
    return downtimes.filter(d => d.status === 'ongoing');
  }

  async getMachineDowntimeHistory(machineId: string): Promise<MachineDowntime[]> {
    const downtimes = this.getStoredMachineDowntime();
    return downtimes.filter(d => d.machineId === machineId);
  }

  // Utility methods
  private calculatePriority(urgencyLevel: MaintenanceRequest['urgencyLevel']): number {
    switch (urgencyLevel) {
      case 'critical': return 10;
      case 'high': return 8;
      case 'medium': return 5;
      case 'low': return 2;
      default: return 1;
    }
  }


  private generateId(): string {
    return `MAINT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStoredMaintenanceRequests(): MaintenanceRequest[] {
    try {
      const stored = localStorage.getItem(this.maintenanceRequestsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredMaintenanceAlerts(): MaintenanceAlert[] {
    try {
      const stored = localStorage.getItem(this.maintenanceAlertsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getStoredMachineDowntime(): MachineDowntime[] {
    try {
      const stored = localStorage.getItem(this.machineDowntimeKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // Stats and Analytics
  async getMaintenanceStats() {
    const requests = this.getStoredMaintenanceRequests();
    const alerts = this.getStoredMaintenanceAlerts();
    const downtimes = this.getStoredMachineDowntime();

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      criticalRequests: requests.filter(r => r.urgencyLevel === 'critical').length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      activeMachineDowntime: downtimes.filter(d => d.status === 'ongoing').length,
      averageResolutionTime: this.calculateAverageResolutionTime(requests),
      mttr: this.calculateMTTR(downtimes), // Mean Time To Repair
      mtbf: this.calculateMTBF(downtimes) // Mean Time Between Failures
    };
  }

  private calculateAverageResolutionTime(requests: MaintenanceRequest[]): number {
    const completedRequests = requests.filter(r => r.status === 'completed' && r.requestedAt && r.completedAt);
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, request) => {
      const start = new Date(request.requestedAt).getTime();
      const end = new Date(request.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return Math.floor(totalTime / completedRequests.length / (1000 * 60)); // minutes
  }

  private calculateMTTR(downtimes: MachineDowntime[]): number {
    const completedDowntimes = downtimes.filter(d => d.status === 'completed' && d.duration);
    if (completedDowntimes.length === 0) return 0;

    const totalDuration = completedDowntimes.reduce((sum, downtime) => sum + (downtime.duration || 0), 0);
    return Math.floor(totalDuration / completedDowntimes.length);
  }

  private calculateMTBF(downtimes: MachineDowntime[]): number {
    // Simplified MTBF calculation
    const now = new Date().getTime();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentDowntimes = downtimes.filter(d => new Date(d.startTime).getTime() > oneMonthAgo);
    
    if (recentDowntimes.length === 0) return 0;
    
    const totalOperatingTime = 30 * 24 * 60; // 30 days in minutes
    const totalDowntime = recentDowntimes.reduce((sum, d) => sum + (d.duration || 0), 0);
    const actualOperatingTime = totalOperatingTime - totalDowntime;
    
    return Math.floor(actualOperatingTime / recentDowntimes.length);
  }
}

export const maintenanceService = new MaintenanceService();
