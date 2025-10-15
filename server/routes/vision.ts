import express from "express";
import { isDbConfigured, query } from "../db";

export const visionRouter = express.Router();

async function ensureVisionTables() {
  if (!isDbConfigured()) return;

  // Ensure cameras exists detection is not strictly required
  await query(`CREATE TABLE IF NOT EXISTS vision_camera_events (
    id TEXT PRIMARY KEY,
    camera_id TEXT REFERENCES cameras(id) ON DELETE CASCADE,
    machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
    roi_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('active','inactive')),
    confidence REAL,
    frame_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);

  // Add roi_id column to existing table if not present
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='vision_camera_events' AND column_name='roi_id') THEN
        ALTER TABLE vision_camera_events ADD COLUMN roi_id TEXT;
      END IF;
    END $$;
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_vision_events_machine_time ON vision_camera_events(machine_id, created_at)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_vision_events_camera_time ON vision_camera_events(camera_id, created_at)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_vision_events_roi_time ON vision_camera_events(roi_id, created_at)`,
  );
}

// Helper: compute uptime from events
function computeUptime(
  events: any[],
  from: Date,
  to: Date,
  initialStatus: "active" | "inactive",
) {
  // events sorted ASC by created_at
  let lastTs = from.getTime();
  let status: "active" | "inactive" = initialStatus;
  let activeMs = 0;
  for (const e of events) {
    const ts = new Date(e.created_at || e.frame_time || e.time).getTime();
    const windowEnd = Math.min(ts, to.getTime());
    if (windowEnd > lastTs && status === "active") {
      activeMs += windowEnd - lastTs;
    }
    lastTs = Math.max(lastTs, ts);
    status = e.status === "active" ? "active" : "inactive";
    if (lastTs >= to.getTime()) break;
  }
  if (to.getTime() > lastTs && status === "active") {
    activeMs += to.getTime() - lastTs;
  }
  const totalMs = Math.max(0, to.getTime() - from.getTime());
  const pct = totalMs > 0 ? Math.round((activeMs / totalMs) * 10000) / 100 : 0;
  return { activeMs, totalMs, percentActive: pct };
}

// GET /vision/status?machineId=...&cameraId=...&roiId=...
visionRouter.get("/vision/status", async (req, res) => {
  try {
    await ensureVisionTables();
    const { machineId, cameraId, roiId } = req.query as {
      machineId?: string;
      cameraId?: string;
      roiId?: string;
    };
    if (!machineId && !cameraId && !roiId) {
      return res
        .status(400)
        .json({ error: "machineId, cameraId ou roiId são obrigatórios" });
    }

    // Priority: roiId > machineId > cameraId
    if (roiId) {
      const { rows } = await query<any>(
        `SELECT status, confidence, roi_id, created_at FROM vision_camera_events WHERE roi_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [roiId],
      );
      const last = rows[0];
      return res.json({
        scope: "roi",
        id: roiId,
        status: last?.status || "inactive",
        confidence: last?.confidence || 0,
        updatedAt: last?.created_at || null,
      });
    }

    if (machineId) {
      const { rows } = await query<any>(
        `SELECT status, confidence, roi_id, created_at FROM vision_camera_events WHERE machine_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [machineId],
      );
      const last = rows[0];
      return res.json({
        scope: "machine",
        id: machineId,
        roiId: last?.roi_id || null,
        status: last?.status || "inactive",
        confidence: last?.confidence || 0,
        updatedAt: last?.created_at || null,
      });
    }
    if (cameraId) {
      const { rows } = await query<any>(
        `SELECT status, confidence, roi_id, created_at FROM vision_camera_events WHERE camera_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [cameraId],
      );
      const last = rows[0];
      return res.json({
        scope: "camera",
        id: cameraId,
        roiId: last?.roi_id || null,
        status: last?.status || "inactive",
        confidence: last?.confidence || 0,
        updatedAt: last?.created_at || null,
      });
    }
  } catch (e: any) {
    console.error("GET /vision/status error", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /vision/uptime?machineId=...&cameraId=...&from=iso&to=iso
visionRouter.get("/vision/uptime", async (req, res) => {
  try {
    await ensureVisionTables();
    const { machineId, cameraId, from, to } = req.query as any;
    const toDate = to ? new Date(String(to)) : new Date();
    const fromDate = from
      ? new Date(String(from))
      : new Date(toDate.getTime() - 24 * 60 * 60 * 1000);

    if (!machineId && !cameraId) {
      return res
        .status(400)
        .json({ error: "machineId ou cameraId são obrigatórios" });
    }

    if (machineId) {
      const past = await query<any>(
        `SELECT status, created_at FROM vision_camera_events WHERE machine_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT 1`,
        [machineId, fromDate.toISOString()],
      );
      const { rows } = await query<any>(
        `SELECT status, created_at FROM vision_camera_events WHERE machine_id = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at ASC`,
        [machineId, fromDate.toISOString(), toDate.toISOString()],
      );
      const initialStatus =
        past.rows[0]?.status === "active" ? "active" : "inactive";
      const agg = computeUptime(rows, fromDate, toDate, initialStatus);
      return res.json({
        scope: "machine",
        id: machineId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        ...agg,
      });
    }

    if (cameraId) {
      const past = await query<any>(
        `SELECT status, created_at FROM vision_camera_events WHERE camera_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT 1`,
        [cameraId, fromDate.toISOString()],
      );
      const { rows } = await query<any>(
        `SELECT status, created_at FROM vision_camera_events WHERE camera_id = $1 AND created_at >= $2 AND created_at <= $3 ORDER BY created_at ASC`,
        [cameraId, fromDate.toISOString(), toDate.toISOString()],
      );
      const initialStatus =
        past.rows[0]?.status === "active" ? "active" : "inactive";
      const agg = computeUptime(rows, fromDate, toDate, initialStatus);
      return res.json({
        scope: "camera",
        id: cameraId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        ...agg,
      });
    }
  } catch (e: any) {
    console.error("GET /vision/uptime error", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /vision/mock-event { machineId, cameraId?, roiId?, status, confidence?, createdAt? }
visionRouter.post("/vision/mock-event", async (req, res) => {
  try {
    await ensureVisionTables();
    const d = req.body || {};
    const id: string = d.id || `vis-${Date.now()}`;
    const machineId: string = (d.machineId || "").trim();
    const cameraId: string | null = (d.cameraId || "").trim() || null;
    const roiId: string | null = (d.roiId || "").trim() || null;
    const status: "active" | "inactive" =
      d.status === "active" ? "active" : "inactive";
    const confidence: number | null =
      typeof d.confidence === "number" ? d.confidence : null;
    const when = d.createdAt ? new Date(d.createdAt) : new Date();

    if (!machineId)
      return res.status(400).json({ error: "machineId é obrigatório" });

    await query(
      `INSERT INTO vision_camera_events (id, camera_id, machine_id, roi_id, status, confidence, frame_time, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        id,
        cameraId,
        machineId,
        roiId,
        status,
        confidence,
        when.toISOString(),
        when.toISOString(),
      ],
    );

    res.json({
      id,
      machineId,
      cameraId,
      roiId,
      status,
      confidence,
      createdAt: when.toISOString(),
    });
  } catch (e: any) {
    console.error("POST /vision/mock-event error", e);
    res.status(500).json({ error: e.message });
  }
});
