import express from "express";
import { isDbConfigured, query } from "../db";

export const camerasRouter = express.Router();

// Ensure cameras table exists (idempotent)
async function ensureCamerasTable() {
  if (!isDbConfigured()) return false;

  try {
    // Create cameras table without FK first
    await query(`CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      machine_id TEXT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      protocol TEXT DEFAULT 'rtsp',
      rois JSONB DEFAULT '[]'::jsonb,
      thresholds JSONB DEFAULT '{}'::jsonb,
      schedule JSONB DEFAULT '{}'::jsonb,
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    await query(
      `CREATE INDEX IF NOT EXISTS idx_cameras_machine ON cameras(machine_id)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_cameras_created_at ON cameras(created_at)`,
    );

    // Try to add FK constraint to machines if table exists, but don't fail if it doesn't
    try {
      const { rows } = await query<any>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'machines'
         ) AS exists`,
      );
      const hasMachines = !!rows[0]?.exists;

      if (hasMachines) {
        const constraintCheck = await query<any>(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_name = 'cameras' AND constraint_name = 'cameras_machine_fk'
          ) AS exists`,
        );
        const hasConstraint = !!constraintCheck.rows[0]?.exists;

        if (!hasConstraint) {
          try {
            await query(
              `ALTER TABLE cameras ADD CONSTRAINT cameras_machine_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE`,
            );
          } catch (e) {
            console.warn("Could not add FK constraint to machines:", (e as any)?.message);
          }
        }
      }
    } catch (e) {
      console.warn("Could not check/add machines FK:", (e as any)?.message);
    }

    return true;
  } catch (e) {
    console.error("ensureCamerasTable error:", (e as any)?.message);
    throw e;
  }
}

camerasRouter.get("/", async (_req, res) => {
  try {
    if (!isDbConfigured()) {
      return res.json([]);
    }
    await ensureCamerasTable();
    const { rows } = await query<any>(
      `SELECT id, machine_id, name, url, protocol, rois, thresholds, schedule, enabled, created_at
       FROM cameras ORDER BY created_at DESC`,
    );
    const list = rows.map((r) => ({
      id: r.id,
      machineId: r.machine_id,
      name: r.name,
      url: r.url,
      protocol: r.protocol,
      rois: r.rois || [],
      thresholds: r.thresholds || {},
      schedule: r.schedule || {},
      enabled: r.enabled !== false,
      createdAt: r.created_at,
    }));
    res.json(list);
  } catch (e: any) {
    console.error("GET /cameras error", e);
    res.status(500).json({ error: e.message });
  }
});

camerasRouter.get("/machines/:id/cameras", async (req, res) => {
  try {
    await ensureCamerasTable();
    const id = req.params.id;
    const { rows } = await query<any>(
      `SELECT id, machine_id, name, url, protocol, rois, thresholds, schedule, enabled, created_at
       FROM cameras WHERE machine_id = $1 ORDER BY created_at DESC`,
      [id],
    );
    const list = rows.map((r) => ({
      id: r.id,
      machineId: r.machine_id,
      name: r.name,
      url: r.url,
      protocol: r.protocol,
      rois: r.rois || [],
      thresholds: r.thresholds || {},
      schedule: r.schedule || {},
      enabled: r.enabled !== false,
      createdAt: r.created_at,
    }));
    res.json(list);
  } catch (e: any) {
    console.error("GET /machines/:id/cameras error", e);
    res.status(500).json({ error: e.message });
  }
});

camerasRouter.post("/", async (req, res) => {
  try {
    await ensureCamerasTable();
    const d = req.body || {};
    const id: string = d.id || `cam-${Date.now()}`;
    const machineId: string | null = d.machineId || null;
    const name: string = (d.name || "").trim();
    const url: string = (d.url || "").trim();
    const protocol: string = (d.protocol || "rtsp").trim();
    const rois = Array.isArray(d.rois) ? d.rois : [];
    const thresholds =
      d.thresholds && typeof d.thresholds === "object" ? d.thresholds : {};
    const schedule =
      d.schedule && typeof d.schedule === "object" ? d.schedule : {};
    const enabled = d.enabled !== false;

    if (!name || !url) {
      return res.status(400).json({ error: "Nome e URL são obrigatórios" });
    }

    await query(
      `INSERT INTO cameras (id, machine_id, name, url, protocol, rois, thresholds, schedule, enabled)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,'[]'::jsonb),COALESCE($7,'{}'::jsonb),COALESCE($8,'{}'::jsonb),$9)`,
      [
        id,
        machineId,
        name,
        url,
        protocol,
        JSON.stringify(rois),
        JSON.stringify(thresholds),
        JSON.stringify(schedule),
        enabled,
      ],
    );

    res.json({
      id,
      machineId,
      name,
      url,
      protocol,
      rois,
      thresholds,
      schedule,
      enabled,
    });
  } catch (e: any) {
    console.error("POST /cameras error", e);
    res.status(500).json({ error: e.message });
  }
});

camerasRouter.patch("/cameras/:id", async (req, res) => {
  try {
    await ensureCamerasTable();
    const id = req.params.id;
    const d = req.body || {};

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const set = (col: string, val: any) => {
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    if (d.machineId !== undefined) set("machine_id", d.machineId || null);
    if (d.name !== undefined) set("name", (d.name || "").trim());
    if (d.url !== undefined) set("url", (d.url || "").trim());
    if (d.protocol !== undefined)
      set("protocol", (d.protocol || "rtsp").trim());
    if (d.rois !== undefined)
      set("rois", JSON.stringify(Array.isArray(d.rois) ? d.rois : []));
    if (d.thresholds !== undefined)
      set(
        "thresholds",
        JSON.stringify(
          d.thresholds && typeof d.thresholds === "object" ? d.thresholds : {},
        ),
      );
    if (d.schedule !== undefined)
      set(
        "schedule",
        JSON.stringify(
          d.schedule && typeof d.schedule === "object" ? d.schedule : {},
        ),
      );
    if (d.enabled !== undefined) set("enabled", d.enabled !== false);

    if (fields.length === 0) return res.json({ ok: true });

    values.push(id);

    const sql = `UPDATE cameras SET ${fields.join(", ")} WHERE id = $${idx}`;
    await query(sql, values);

    res.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH /cameras/:id error", e);
    res.status(500).json({ error: e.message });
  }
});

camerasRouter.delete("/:id", async (req, res) => {
  try {
    await ensureCamerasTable();
    const id = req.params.id;
    await query(`DELETE FROM cameras WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /cameras/:id error", e);
    res.status(500).json({ error: e.message });
  }
});
