import express from "express";
import { isDbConfigured, query } from "../db";

export const maintenanceRouter = express.Router();
maintenanceRouter.use(express.json({ limit: "2mb" }));
maintenanceRouter.use(express.urlencoded({ extended: true }));

const useDb = () => isDbConfigured();

const mem = {
  requests: [] as any[],
  alerts: [] as any[],
  downtime: [] as any[],
};

let initPromise: Promise<boolean> | null = null;
async function ensureTables(): Promise<boolean> {
  if (!useDb()) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await query(`CREATE TABLE IF NOT EXISTS maintenance_requests (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
        machine_name TEXT,
        operator_id TEXT,
        operator_name TEXT,
        urgency_level TEXT NOT NULL,
        category TEXT,
        title TEXT NOT NULL,
        description TEXT,
        reported_issues JSONB DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INT NOT NULL DEFAULT 1,
        requested_at TIMESTAMPTZ DEFAULT now(),
        assigned_to TEXT,
        assigned_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        technician_notes TEXT,
        follow_up_required BOOLEAN DEFAULT FALSE
      )`);

      await query(`CREATE TABLE IF NOT EXISTS maintenance_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
        machine_name TEXT,
        title TEXT NOT NULL,
        description TEXT,
        urgency_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        acknowledged_at TIMESTAMPTZ,
        acknowledged_by TEXT,
        resolved_at TIMESTAMPTZ,
        resolved_by TEXT,
        maintenance_request_id TEXT REFERENCES maintenance_requests(id) ON DELETE SET NULL
      )`);

      await query(`CREATE TABLE IF NOT EXISTS machine_downtime (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id) ON DELETE SET NULL,
        machine_name TEXT,
        reason TEXT,
        description TEXT,
        reported_by TEXT,
        maintenance_request_id TEXT REFERENCES maintenance_requests(id) ON DELETE SET NULL,
        impact TEXT,
        status TEXT NOT NULL DEFAULT 'ongoing',
        start_time TIMESTAMPTZ DEFAULT now(),
        end_time TIMESTAMPTZ,
        duration INT,
        affected_orders JSONB DEFAULT '[]'::jsonb,
        resolved_by TEXT
      )`);

      return true;
    } catch (e) {
      console.error("ensureTables maintenance error", e);
      return false;
    }
  })();
  const ok = await initPromise;
  if (!ok) initPromise = null;
  return ok;
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

// Requests
maintenanceRouter.get("/maintenance/requests", async (_req, res) => {
  try {
    await ensureTables();
    const { rows } = await query(`SELECT * FROM maintenance_requests ORDER BY requested_at DESC`);
    return res.json(rows.map(r => ({
      id: r.id,
      machineId: r.machine_id,
      machineName: r.machine_name,
      operatorId: r.operator_id,
      operatorName: r.operator_name,
      urgencyLevel: r.urgency_level,
      category: r.category,
      title: r.title,
      description: r.description,
      reportedIssues: r.reported_issues || [],
      status: r.status,
      priority: r.priority,
      requestedAt: r.requested_at,
      assignedTo: r.assigned_to || undefined,
      assignedAt: r.assigned_at || undefined,
      startedAt: r.started_at || undefined,
      completedAt: r.completed_at || undefined,
      technicianNotes: r.technician_notes || undefined,
      followUpRequired: !!r.follow_up_required,
    })));
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("GET /maintenance/requests error", e);
      return res.status(500).json({ error: e.message });
    }
    return res.json(mem.requests.sort((a,b)=> (a.requestedAt > b.requestedAt ? -1 : 1)));
  }
});

maintenanceRouter.post("/maintenance/requests", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("mreq");
  try {
    await ensureTables();
    await query(`INSERT INTO maintenance_requests (id, machine_id, machine_name, operator_id, operator_name, urgency_level, category, title, description, reported_issues, status, priority, requested_at, follow_up_required)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'[]'::jsonb), 'pending', COALESCE($11,1), now(), COALESCE($12,false))
      ON CONFLICT (id) DO NOTHING`, [
        id,
        d.machineId || null,
        d.machineName || null,
        d.operatorId || null,
        d.operatorName || null,
        d.urgencyLevel,
        d.category || null,
        d.title,
        d.description || null,
        d.reportedIssues ? JSON.stringify(d.reportedIssues) : '[]',
        d.priority ?? 1,
        !!d.followUpRequired,
      ]);
    return res.json({ id });
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("POST /maintenance/requests error", e);
      return res.status(500).json({ error: e.message });
    }
    mem.requests.push({
      ...d,
      id,
      status: 'pending',
      priority: d.priority ?? 1,
      requestedAt: new Date().toISOString(),
    });
    return res.json({ id });
  }
});

maintenanceRouter.post("/maintenance/requests/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status, technicianNotes } = req.body || {};
  try {
    await ensureTables();
    const ts = new Date().toISOString();
    let field: string | null = null;
    if (status === 'assigned') field = 'assigned_at';
    else if (status === 'in_progress') field = 'started_at';
    else if (status === 'completed') field = 'completed_at';

    await query(`UPDATE maintenance_requests SET status = $2, technician_notes = COALESCE($3, technician_notes), ${field ? `${field} = $4` : ''} WHERE id = $1`, [id, status, technicianNotes || null, field ? ts : undefined].filter(v=> v!==undefined));
    return res.json({ ok: true });
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("POST /maintenance/requests/:id/status error", e);
      return res.status(500).json({ error: e.message });
    }
    mem.requests = mem.requests.map(r => r.id === id ? { ...r, status, technicianNotes, assignedAt: status==='assigned'?new Date().toISOString():r.assignedAt, startedAt: status==='in_progress'?new Date().toISOString():r.startedAt, completedAt: status==='completed'?new Date().toISOString():r.completedAt } : r);
    return res.json({ ok: true });
  }
});

// Alerts
maintenanceRouter.get("/maintenance/alerts", async (_req, res) => {
  try {
    await ensureTables();
    const { rows } = await query(`SELECT * FROM maintenance_alerts ORDER BY created_at DESC`);
    return res.json(rows.map(r => ({
      id: r.id,
      type: r.type,
      machineId: r.machine_id,
      machineName: r.machine_name,
      title: r.title,
      description: r.description,
      urgencyLevel: r.urgency_level,
      status: r.status,
      createdAt: r.created_at,
      acknowledgedAt: r.acknowledged_at || undefined,
      acknowledgedBy: r.acknowledged_by || undefined,
      resolvedAt: r.resolved_at || undefined,
      resolvedBy: r.resolved_by || undefined,
      maintenanceRequestId: r.maintenance_request_id || undefined,
    })));
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("GET /maintenance/alerts error", e);
      return res.status(500).json({ error: e.message });
    }
    return res.json(mem.alerts.sort((a,b)=> (a.createdAt > b.createdAt ? -1 : 1)));
  }
});

maintenanceRouter.post("/maintenance/alerts", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("malt");
  try {
    await ensureTables();
    await query(`INSERT INTO maintenance_alerts (id, type, machine_id, machine_name, title, description, urgency_level, status, created_at, maintenance_request_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active', now(), $8)
      ON CONFLICT (id) DO NOTHING`, [
      id, d.type, d.machineId || null, d.machineName || null, d.title, d.description || null, d.urgencyLevel, d.maintenanceRequestId || null,
    ]);
    return res.json({ id });
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("POST /maintenance/alerts error", e);
      return res.status(500).json({ error: e.message });
    }
    mem.alerts.push({ ...d, id, status: 'active', createdAt: new Date().toISOString() });
    return res.json({ id });
  }
});

// Downtime
maintenanceRouter.get("/maintenance/downtime", async (_req, res) => {
  try {
    await ensureTables();
    const { rows } = await query(`SELECT * FROM machine_downtime ORDER BY start_time DESC`);
    return res.json(rows.map(r => ({
      id: r.id,
      machineId: r.machine_id,
      machineName: r.machine_name,
      reason: r.reason,
      description: r.description,
      reportedBy: r.reported_by,
      maintenanceRequestId: r.maintenance_request_id || undefined,
      impact: r.impact,
      status: r.status,
      startTime: r.start_time,
      endTime: r.end_time || undefined,
      duration: r.duration || undefined,
      affectedOrders: r.affected_orders || [],
      resolvedBy: r.resolved_by || undefined,
    })));
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("GET /maintenance/downtime error", e);
      return res.status(500).json({ error: e.message });
    }
    return res.json(mem.downtime.sort((a,b)=> (a.startTime > b.startTime ? -1 : 1)));
  }
});

maintenanceRouter.post("/maintenance/downtime", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId("mdt");
  try {
    await ensureTables();
    await query(`INSERT INTO machine_downtime (id, machine_id, machine_name, reason, description, reported_by, maintenance_request_id, impact, status, start_time, affected_orders)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ongoing', now(), COALESCE($9,'[]'::jsonb))
      ON CONFLICT (id) DO NOTHING`, [
      id, d.machineId || null, d.machineName || null, d.reason || null, d.description || null, d.reportedBy || null, d.maintenanceRequestId || null, d.impact || null, d.affectedOrders ? JSON.stringify(d.affectedOrders) : '[]',
    ]);
    return res.json({ id });
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("POST /maintenance/downtime error", e);
      return res.status(500).json({ error: e.message });
    }
    mem.downtime.push({ ...d, id, status: 'ongoing', startTime: new Date().toISOString() });
    return res.json({ id });
  }
});

maintenanceRouter.post("/maintenance/downtime/:id/end", async (req, res) => {
  const id = req.params.id;
  const { resolvedBy } = req.body || {};
  try {
    await ensureTables();
    const end = new Date();
    await query(`UPDATE machine_downtime SET status='completed', end_time=$2, duration = EXTRACT(EPOCH FROM ($2 - start_time))::int/60, resolved_by = COALESCE($3,resolved_by) WHERE id=$1`, [id, end.toISOString(), resolvedBy || null]);
    return res.json({ ok: true });
  } catch (e: any) {
    if (isDbConfigured()) {
      console.error("POST /maintenance/downtime/:id/end error", e);
      return res.status(500).json({ error: e.message });
    }
    mem.downtime = mem.downtime.map((d:any)=> d.id===id ? { ...d, status: 'completed', endTime: new Date().toISOString(), duration: Math.floor((Date.now() - new Date(d.startTime).getTime())/60000), resolvedBy } : d);
    return res.json({ ok: true });
  }
});
