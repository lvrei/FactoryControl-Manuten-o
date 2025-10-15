import { apiFetch } from "@/config/api";
export type VisionStatus = {
  scope: "machine" | "camera" | "roi";
  id: string;
  roiId?: string | null;
  status: "active" | "inactive";
  confidence?: number;
  updatedAt?: string | null;
};
export type UptimeResult = {
  scope: "machine" | "camera";
  id: string;
  from: string;
  to: string;
  activeMs: number;
  totalMs: number;
  percentActive: number;
};

class VisionService {
  async getStatusByMachine(machineId: string): Promise<VisionStatus> {
    const resp = await fetch(
      `/api/vision/status?machineId=${encodeURIComponent(machineId)}`,
    );
    if (!resp.ok) throw new Error("Falha ao obter status");
    return resp.json();
  }
  async getStatusByCamera(cameraId: string): Promise<VisionStatus> {
    const resp = await fetch(
      `/api/vision/status?cameraId=${encodeURIComponent(cameraId)}`,
    );
    if (!resp.ok) throw new Error("Falha ao obter status");
    return resp.json();
  }
  async getStatusByROI(roiId: string): Promise<VisionStatus> {
    const resp = await fetch(
      `/api/vision/status?roiId=${encodeURIComponent(roiId)}`,
    );
    if (!resp.ok) throw new Error("Falha ao obter status");
    return resp.json();
  }
  async getUptimeByMachine(
    machineId: string,
    from?: string,
    to?: string,
  ): Promise<UptimeResult> {
    const q = new URLSearchParams({ machineId });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const resp = await apiFetch(`api/vision/uptime?${q.toString()}`);
    if (!resp.ok) throw new Error("Falha ao obter uptime");
    return resp.json();
  }
  async getUptimeByCamera(
    cameraId: string,
    from?: string,
    to?: string,
  ): Promise<UptimeResult> {
    const q = new URLSearchParams({ cameraId });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const resp = await apiFetch(`api/vision/uptime?${q.toString()}`);
    if (!resp.ok) throw new Error("Falha ao obter uptime");
    return resp.json();
  }
  async postMockEvent(data: {
    machineId: string;
    cameraId?: string;
    roiId?: string;
    status: "active" | "inactive";
    confidence?: number;
    createdAt?: string;
    id?: string;
  }): Promise<any> {
    const resp = await apiFetch("api/vision/mock-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error("Falha ao criar evento mock");
    return resp.json();
  }
}

export const visionService = new VisionService();
