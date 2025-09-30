import express from "express";
import net from "node:net";
import { spawn } from "node:child_process";
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

// GET /cameras/:id/snapshot - proxy a single JPEG frame if available, or grab from RTSP via ffmpeg
cameraOpsRouter.get("/cameras/:id/snapshot", async (req, res) => {
  try {
    const id = req.params.id;
    const cam = await getCameraById(id);
    if (!cam) return res.status(404).end();

    // If HTTP snapshot is configured, proxy it
    const httpSnapshotUrl =
      cam.thresholds?.snapshotUrl || (cam.url.startsWith("http") ? cam.url : null);
    if (httpSnapshotUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const resp = await fetch(httpSnapshotUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) return res.status(resp.status).end();
        res.setHeader("Content-Type", resp.headers.get("content-type") || "image/jpeg");
        if (resp.body) {
          (resp.body as any).pipe(res);
        } else {
          const buf = Buffer.from(await resp.arrayBuffer());
          res.end(buf);
        }
        return;
      } catch (err) {
        clearTimeout(timeout);
        // Will fallback to RTSP grab if available below
      }
    }

    // Fallback: if RTSP, use ffmpeg to grab a single frame
    if (cam.url.startsWith("rtsp")) {
      const args = [
        "-rtsp_transport",
        "tcp",
        "-i",
        cam.url,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-f",
        "image2",
        "pipe:1",
      ];
      const ff = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

      const killTimer = setTimeout(() => {
        try {
          ff.kill("SIGKILL");
        } catch {}
      }, 8000);

      res.setHeader("Content-Type", "image/jpeg");
      ff.stdout.pipe(res);
      ff.stderr.on("data", () => {});
      ff.on("close", (code) => {
        clearTimeout(killTimer);
        if (code !== 0 && !res.headersSent) {
          res.status(500).json({ error: "ffmpeg falhou ao gerar snapshot" });
        }
      });
      ff.on("error", () => {
        clearTimeout(killTimer);
        if (!res.headersSent) res.status(500).json({ error: "ffmpeg não encontrado" });
      });
      return;
    }

    return res.status(400).json({ error: "Snapshot não configurado" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
