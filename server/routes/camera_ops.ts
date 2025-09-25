import express from "express";
import net from "node:net";
import { query } from "../db";

export const cameraOpsRouter = express.Router();

async function getCameraById(id: string) {
  const { rows } = await query<any>(
    `SELECT id, machine_id, name, url, protocol, thresholds FROM cameras WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    machineId: r.machine_id as string | null,
    name: r.name as string,
    url: r.url as string,
    protocol: (r.protocol as string) || "rtsp",
    thresholds: (r.thresholds as any) || {},
  };
}

// GET /cameras/:id/status -> { reachable, protocol, latencyMs?, message? }
cameraOpsRouter.get("/cameras/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const cam = await getCameraById(id);
    if (!cam) return res.status(404).json({ error: "Câmara não encontrada" });

    const started = Date.now();

    // HTTP/MJPEG simple fetch check
    if (cam.protocol === "http" || cam.url.startsWith("http")) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const resp = await fetch(cam.url, {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok || (resp.status >= 200 && resp.status < 400)) {
          return res.json({
            reachable: true,
            protocol: "http",
            latencyMs: Date.now() - started,
          });
        }
        return res.json({
          reachable: false,
          protocol: "http",
          message: `HTTP ${resp.status}`,
        });
      } catch (e: any) {
        clearTimeout(timeout);
        return res.json({
          reachable: false,
          protocol: "http",
          message: e.message || "Falha HTTP",
        });
      }
    }

    // RTSP/TCP reachability check (socket connect)
    if (cam.protocol === "rtsp" || cam.url.startsWith("rtsp")) {
      try {
        const u = new URL(cam.url);
        const port = Number(u.port) || 554;
        const host = u.hostname;
        await new Promise<void>((resolve, reject) => {
          const socket = net.connect({ host, port });
          const tm = setTimeout(() => {
            try {
              socket.destroy();
            } catch {}
            reject(new Error("Timeout"));
          }, 3000);
          socket.once("connect", () => {
            clearTimeout(tm);
            try {
              socket.end();
            } catch {}
            resolve();
          });
          socket.once("error", (err) => {
            clearTimeout(tm);
            reject(err);
          });
        });
        return res.json({
          reachable: true,
          protocol: "rtsp",
          latencyMs: Date.now() - started,
        });
      } catch (e: any) {
        return res.json({
          reachable: false,
          protocol: "rtsp",
          message: e.message || "Falha RTSP",
        });
      }
    }

    // Fallback
    return res.json({
      reachable: false,
      protocol: cam.protocol || "unknown",
      message: "Protocolo não suportado para teste",
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /cameras/:id/snapshot - proxy a single JPEG frame if available
cameraOpsRouter.get("/cameras/:id/snapshot", async (req, res) => {
  try {
    const id = req.params.id;
    const cam = await getCameraById(id);
    if (!cam) return res.status(404).end();

    // Determine snapshot URL: thresholds.snapshotUrl overrides; otherwise if HTTP use main url
    const snapshotUrl =
      cam.thresholds?.snapshotUrl ||
      (cam.url.startsWith("http") ? cam.url : null);
    if (!snapshotUrl)
      return res.status(400).json({ error: "Snapshot não configurado" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(snapshotUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return res.status(resp.status).end();

    // Stream the body to client
    res.setHeader(
      "Content-Type",
      resp.headers.get("content-type") || "image/jpeg",
    );
    if (resp.body) {
      (resp.body as any).pipe(res);
    } else {
      const buf = Buffer.from(await resp.arrayBuffer());
      res.end(buf);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
