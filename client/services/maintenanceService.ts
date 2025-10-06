import {
  MaintenanceRequest,
  MaintenanceAlert,
  MachineDowntime,
} from "@/types/production";
import { productionService } from "./productionService";
import { apiFetch } from "@/config/api";

class MaintenanceService {
  // DB-backed Scheduled Maintenances (plans)
  async getMaintenancePlans(): Promise<any[]> {
    const r = await apiFetch("api/maintenance/plans");
    if (!r.ok) throw new Error("Falha ao listar manutenções programadas");
    return r.json();
  }
  async createMaintenancePlan(plan: any): Promise<string> {
    const r = await apiFetch("api/maintenance/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!r.ok) throw new Error("Falha ao criar manutenção");
    const j = await r.json();
    return j.id;
  }
  async updateMaintenancePlan(id: string, patch: any): Promise<void> {
    const r = await apiFetch(`api/maintenance/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error("Falha ao atualizar manutenção");
  }
  async deleteMaintenancePlan(id: string): Promise<void> {
    const r = await apiFetch(`api/maintenance/plans/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error("Falha ao apagar manutenção");
  }

  // Maintenance Requests
  async createMaintenanceRequest(
    requestData: Omit<
      MaintenanceRequest,
      "id" | "requestedAt" | "status" | "priority"
    >,
  ): Promise<MaintenanceRequest> {
    const priority = this.calculatePriority(requestData.urgencyLevel);
    const resp = await apiFetch("api/maintenance/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestData,
        priority,
        followUpRequired:
          requestData.urgencyLevel === "critical" ||
          requestData.urgencyLevel === "high",
      }),
    });
    if (!resp.ok) throw new Error("Falha ao criar solicitação de manutenção");
    const { id } = await resp.json();
    const newRequest: MaintenanceRequest = {
      ...requestData,
      id,
      requestedAt: new Date().toISOString(),
      status: "pending",
      priority,
      followUpRequired:
        requestData.urgencyLevel === "critical" ||
        requestData.urgencyLevel === "high",
    };
    try {
      await apiFetch("api/maintenance/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "maintenance_request",
          machineId: requestData.machineId,
          machineName: requestData.machineName,
          title: `Solicitação de Manutenção - ${requestData.title}`,
          description: requestData.description,
          urgencyLevel: requestData.urgencyLevel,
          maintenanceRequestId: id,
        }),
      });
    } catch {}
    if (requestData.urgencyLevel === "critical") {
      try {
        await apiFetch("api/maintenance/downtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            machineId: requestData.machineId,
            machineName: requestData.machineName,
            reason: "breakdown",
            description: `Máquina parada devido a urgência crítica: ${requestData.title}`,
            reportedBy: requestData.operatorName,
            maintenanceRequestId: id,
            impact: "critical",
          }),
        });
      } catch {}
      await productionService.updateMachineStatus(
        requestData.machineId,
        "maintenance",
      );
    }
    return newRequest;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    const r = await apiFetch("api/maintenance/requests");
    if (!r.ok) throw new Error("Falha ao listar solicitações de manutenção");
    return r.json();
  }

  async getMaintenanceRequestsByMachine(
    machineId: string,
  ): Promise<MaintenanceRequest[]> {
    const list = await this.getMaintenanceRequests();
    return list.filter((r) => r.machineId === machineId);
  }

  async updateMaintenanceRequestStatus(
    id: string,
    status: MaintenanceRequest["status"],
    technicianNotes?: string,
  ): Promise<void> {
    const r = await fetch(`/api/maintenance/requests/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, technicianNotes }),
    });
    if (!r.ok) throw new Error("Falha ao atualizar estado da solicitação");
    if (status === "completed") {
      try {
        const dts = await this.getActiveMachineDowntime();
        const d = dts.find((x) => x.maintenanceRequestId === id);
        if (d) await this.endMachineDowntime(d.id);
      } catch {}
    }
  }

  // Maintenance Alerts
  async createMaintenanceAlert(
    alertData: Omit<MaintenanceAlert, "id" | "createdAt" | "status">,
  ): Promise<MaintenanceAlert> {
    const r = await fetch("/api/maintenance/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    });
    if (!r.ok) throw new Error("Falha ao criar alerta");
    const { id } = await r.json();
    return {
      ...alertData,
      id,
      createdAt: new Date().toISOString(),
      status: "active",
    } as MaintenanceAlert;
  }

  async getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    const r = await fetch("/api/maintenance/alerts");
    if (!r.ok) throw new Error("Falha ao listar alertas");
    return r.json();
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<void> {
    const r = await fetch(`/api/maintenance/alerts/${id}/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acknowledgedBy }),
    });
    if (!r.ok) throw new Error("Falha ao reconhecer alerta");
  }

  async resolveAlert(id: string, resolvedBy: string): Promise<void> {
    const r = await fetch(`/api/maintenance/alerts/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedBy }),
    });
    if (!r.ok) throw new Error("Falha ao resolver alerta");
  }

  // Machine Downtime
  async createMachineDowntime(
    downtimeData: Omit<MachineDowntime, "id" | "startTime" | "status">,
  ): Promise<MachineDowntime> {
    const r = await fetch("/api/maintenance/downtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(downtimeData),
    });
    if (!r.ok) throw new Error("Falha ao registar paragem");
    const { id } = await r.json();
    return {
      ...downtimeData,
      id,
      startTime: new Date().toISOString(),
      status: "ongoing",
    } as MachineDowntime;
  }

  async endMachineDowntime(id: string, resolvedBy?: string): Promise<void> {
    const r = await fetch(`/api/maintenance/downtime/${id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedBy }),
    });
    if (!r.ok) throw new Error("Falha ao terminar paragem");
  }

  async getMachineDowntime(): Promise<MachineDowntime[]> {
    const r = await fetch("/api/maintenance/downtime");
    if (!r.ok) throw new Error("Falha ao listar paragens");
    return r.json();
  }

  async getActiveMachineDowntime(): Promise<MachineDowntime[]> {
    const downtimes = await this.getMachineDowntime();
    return downtimes.filter((d) => d.status === "ongoing");
  }

  async getMachineDowntimeHistory(
    machineId: string,
  ): Promise<MachineDowntime[]> {
    const downtimes = await this.getMachineDowntime();
    return downtimes.filter((d) => d.machineId === machineId);
  }

  // Utility methods
  private calculatePriority(
    urgencyLevel: MaintenanceRequest["urgencyLevel"],
  ): number {
    switch (urgencyLevel) {
      case "critical":
        return 10;
      case "high":
        return 8;
      case "medium":
        return 5;
      case "low":
        return 2;
      default:
        return 1;
    }
  }

  // Stats and Analytics (computed from DB data)
  async getMaintenanceStats() {
    const [requests, alerts, downtimes] = await Promise.all([
      this.getMaintenanceRequests(),
      this.getMaintenanceAlerts(),
      this.getMachineDowntime(),
    ]);

    return {
      totalRequests: requests.length,
      pendingRequests: requests.filter((r) => r.status === "pending").length,
      criticalRequests: requests.filter((r) => r.urgencyLevel === "critical")
        .length,
      activeAlerts: alerts.filter((a) => a.status === "active").length,
      activeMachineDowntime: downtimes.filter((d) => d.status === "ongoing")
        .length,
      averageResolutionTime: this.calculateAverageResolutionTime(requests),
      mttr: this.calculateMTTR(downtimes),
      mtbf: this.calculateMTBF(downtimes),
    };
  }

  private calculateAverageResolutionTime(
    requests: MaintenanceRequest[],
  ): number {
    const completedRequests = requests.filter(
      (r) => r.status === "completed" && r.requestedAt && r.completedAt,
    );
    if (completedRequests.length === 0) return 0;

    const totalTime = completedRequests.reduce((sum, request) => {
      const start = new Date(request.requestedAt).getTime();
      const end = new Date(request.completedAt!).getTime();
      return sum + (end - start);
    }, 0);

    return Math.floor(totalTime / completedRequests.length / (1000 * 60));
  }

  private calculateMTTR(downtimes: MachineDowntime[]): number {
    const completedDowntimes = downtimes.filter(
      (d) => d.status === "completed" && d.duration,
    );
    if (completedDowntimes.length === 0) return 0;

    const totalDuration = completedDowntimes.reduce(
      (sum, downtime) => sum + (downtime.duration || 0),
      0,
    );
    return Math.floor(totalDuration / completedDowntimes.length);
  }

  private calculateMTBF(downtimes: MachineDowntime[]): number {
    const now = new Date().getTime();
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentDowntimes = downtimes.filter(
      (d) => new Date(d.startTime).getTime() > oneMonthAgo,
    );

    if (recentDowntimes.length === 0) return 0;

    const totalOperatingTime = 30 * 24 * 60; // minutes
    const totalDowntime = recentDowntimes.reduce(
      (sum, d) => sum + (d.duration || 0),
      0,
    );
    const actualOperatingTime = totalOperatingTime - totalDowntime;

    return Math.floor(actualOperatingTime / recentDowntimes.length);
  }
}

export const maintenanceService = new MaintenanceService();
