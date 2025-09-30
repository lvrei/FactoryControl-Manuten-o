export type CameraRecord = {
  id: string;
  machineId: string | null;
  name: string;
  url: string;
  protocol?: string;
  rois?: any[];
  thresholds?: Record<string, any>;
  schedule?: Record<string, any>;
  enabled?: boolean;
  createdAt?: string;
};

class CamerasService {
  async listAll(): Promise<CameraRecord[]> {
    const resp = await fetch("/api/cameras");
    if (!resp.ok) throw new Error(`Falha ao listar câmaras (${resp.status})`);
    return resp.json();
  }

  async listByMachine(machineId: string): Promise<CameraRecord[]> {
    const resp = await fetch(
      `/api/machines/${encodeURIComponent(machineId)}/cameras`,
    );
    if (!resp.ok)
      throw new Error(
        `Falha ao listar câmaras do equipamento (${resp.status})`,
      );
    return resp.json();
  }

  async create(
    data: Omit<CameraRecord, "id" | "createdAt"> & { id?: string },
  ): Promise<CameraRecord> {
    const resp = await fetch("/api/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error(`Falha ao criar câmara (${resp.status})`);
    return resp.json();
  }

  async update(
    id: string,
    updates: Partial<Omit<CameraRecord, "id" | "createdAt">>,
  ): Promise<void> {
    const resp = await fetch(`/api/cameras/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!resp.ok) throw new Error(`Falha ao atualizar câmara (${resp.status})`);
  }

  async remove(id: string): Promise<void> {
    const resp = await fetch(`/api/cameras/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!resp.ok) throw new Error(`Falha ao remover câmara (${resp.status})`);
  }

  async checkStatus(
    id: string,
  ): Promise<{
    reachable: boolean;
    protocol: string;
    latencyMs?: number;
    message?: string;
  }> {
    const resp = await fetch(`/api/cameras/${encodeURIComponent(id)}/status`);
    if (!resp.ok) throw new Error(`Falha ao verificar status (${resp.status})`);
    return resp.json();
  }

  getSnapshotUrl(id: string): string {
    const ts = Date.now();
    return `/api/cameras/${encodeURIComponent(id)}/snapshot?ts=${ts}`;
  }

  getMjpegUrl(id: string): string {
    const ts = Date.now();
    return `/api/cameras/${encodeURIComponent(id)}/mjpeg?ts=${ts}`;
  }
}

export const camerasService = new CamerasService();
