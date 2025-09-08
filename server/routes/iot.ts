import express from "express";
import { isDbConfigured, query } from "../db";

export const iotRouter = express.Router();

// Ensure JSON parsing even if app-level middleware is altered
iotRouter.use(express.json({ limit: '2mb' }));
iotRouter.use(express.urlencoded({ extended: true }));

const useDb = () => isDbConfigured();

const mem = {
  sensors: [] as any[],
  bindings: [] as any[],
  rules: [] as any[],
  alerts: [] as any[],
};

let iotInitPromise: Promise<boolean> | null = null;

async function ensureIotTables(): Promise<boolean> {
  if (!useDb()) return false;
  if (iotInitPromise) return iotInitPromise;
  iotInitPromise = (async () => {
    try {
      // Ensure schema exists (avoid rare IF NOT EXISTS race/unique errors)
      const exists = await query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'iot') AS exists`,
      );
      if (!exists.rows[0]?.exists) {
        try {
          await query(`CREATE SCHEMA iot`);
        } catch (e: any) {
          if (e?.code !== '42P06' && e?.code !== '23505') throw e;
        }
      }

      // Sensors table
      await query(`CREATE TABLE IF NOT EXISTS iot.sensors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    protocol TEXT NOT NULL,
    address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);

      // Check if public.machines exists to avoid FK creation failures
      const machinesExists = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'machines'
         ) AS exists`
      );
      const hasMachines = !!machinesExists.rows[0]?.exists;

      // Sensor bindings (sensor -> machine + metric)
      await query(`CREATE TABLE IF NOT EXISTS iot.sensor_bindings (
    id TEXT PRIMARY KEY,
    sensor_id TEXT NOT NULL REFERENCES iot.sensors(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL${hasMachines ? ' REFERENCES public.machines(id) ON DELETE CASCADE' : ''},
    metric TEXT NOT NULL,
    unit TEXT,
    scale NUMERIC DEFAULT 1,
    offset_value NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);
      await query(
        `CREATE INDEX IF NOT EXISTS idx_iot_sensor_bindings_sensor ON iot.sensor_bindings(sensor_id)`,
      );
      await query(
        `CREATE INDEX IF NOT EXISTS idx_iot_sensor_bindings_machine ON iot.sensor_bindings(machine_id)`,
      );

      // Rules (thresholds and priorities)
      await query(`CREATE TABLE IF NOT EXISTS iot.sensor_rules (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL${hasMachines ? ' REFERENCES public.machines(id) ON DELETE CASCADE' : ''},
    sensor_id TEXT REFERENCES iot.sensors(id) ON DELETE SET NULL,
    metric TEXT NOT NULL,
    operator TEXT NOT NULL,
    min_value NUMERIC,
    max_value NUMERIC,
    threshold_value NUMERIC,
    priority TEXT NOT NULL DEFAULT 'medium',
    message TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);
      await query(
        `CREATE INDEX IF NOT EXISTS idx_iot_sensor_rules_machine ON iot.sensor_rules(machine_id)`,
      );
      await query(
        `CREATE INDEX IF NOT EXISTS idx_iot_sensor_rules_sensor ON iot.sensor_rules(sensor_id)`,
      );

      // Alerts
      await query(`CREATE TABLE IF NOT EXISTS iot.alerts (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL${hasMachines ? ' REFERENCES public.machines(id) ON DELETE CASCADE' : ''},
    rule_id TEXT REFERENCES iot.sensor_rules(id) ON DELETE SET NULL,
    sensor_id TEXT REFERENCES iot.sensors(id) ON DELETE SET NULL,
    metric TEXT NOT NULL,
    value NUMERIC,
    status TEXT NOT NULL DEFAULT 'active',
    priority TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
  )`);
      await query(`CREATE INDEX IF NOT EXISTS idx_iot_alerts_status ON iot.alerts(status)`);
      await query(
        `CREATE INDEX IF NOT EXISTS idx_iot_alerts_machine ON iot.alerts(machine_id)`,
      );

      // Ensure FK points to iot.sensor_rules only if missing or wrong
      const fk = await query<{ ref_schema: string; ref_table: string }>(
        `SELECT ccu.table_schema AS ref_schema, ccu.table_name AS ref_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.referential_constraints rc
           ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = rc.unique_constraint_name AND ccu.constraint_schema = rc.unique_constraint_schema
         WHERE tc.constraint_schema = 'iot' AND tc.table_name = 'alerts' AND tc.constraint_type = 'FOREIGN KEY' AND tc.constraint_name = 'alerts_rule_id_fkey'`
      );
      const needsFix = fk.rows.length === 0 || fk.rows[0].ref_schema !== 'iot' || fk.rows[0].ref_table !== 'sensor_rules';
      if (needsFix) {
        try {
          await query(`ALTER TABLE iot.alerts DROP CONSTRAINT IF EXISTS alerts_rule_id_fkey`);
          await query(`ALTER TABLE iot.alerts ADD CONSTRAINT alerts_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES iot.sensor_rules(id) ON DELETE SET NULL`);
        } catch (e: any) {
          if (e?.code !== '42710') throw e;
        }
      }

      // If machines table appears later, attempt to attach FKs safely
      if (hasMachines) {
        const existingConstraint = async (name: string) => {
          const r = await query<{ exists: boolean }>(
            `SELECT EXISTS (
               SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_schema = 'iot' AND constraint_name = $1
             ) AS exists`,
            [name]
          );
          return !!r.rows[0]?.exists;
        };
        if (!(await existingConstraint('sensor_rules_machine_fk'))) {
          await query(`ALTER TABLE iot.sensor_rules ADD CONSTRAINT sensor_rules_machine_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE`);
        }
        if (!(await existingConstraint('sensor_bindings_machine_fk'))) {
          await query(`ALTER TABLE iot.sensor_bindings ADD CONSTRAINT sensor_bindings_machine_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE`);
        }
        if (!(await existingConstraint('alerts_machine_fk'))) {
          await query(`ALTER TABLE iot.alerts ADD CONSTRAINT alerts_machine_fk FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE`);
        }
      }

      return true;
    } catch (e: any) {
      console.error('ensureIotTables error:', e);
      try {
        const chk = await query<{ n: number }>(
          `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='iot' AND table_name IN ('sensors','sensor_bindings','sensor_rules','alerts')`
        );
        if ((chk.rows[0]?.n || 0) >= 4) {
          console.warn('IoT tables already present; continuing without migration.');
          return true;
        }
      } catch {}
      return false;
    }
  })();
  const ok = await iotInitPromise;
  if (!ok) iotInitPromise = null;
  return ok;
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Sensors
iotRouter.get("/sensors", async (_req, res) => {
  try {
    const ok = await ensureIotTables();
    if (!ok) {
      return res.json(mem.sensors);
    }
    const { rows } = await query(
      `SELECT * FROM iot.sensors ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (e: any) {
    console.error("GET /sensors error", e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post("/sensors", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const s = req.body || {};
    if (!s || typeof s !== 'object' || !('name' in s) || !('type' in s) || !('protocol' in s)) {
      return res.status(400).json({ error: 'Dados inválidos do sensor' });
    }
    const id = (s as any).id || genId("sensor");
    if (!ok) {
      mem.sensors.unshift({ id, ...s, created_at: new Date().toISOString() });
      return res.json({ id });
    }
    await query(
      `INSERT INTO iot.sensors (id, name, type, protocol, address, metadata)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'{}'::jsonb))
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, protocol=EXCLUDED.protocol, address=EXCLUDED.address, metadata=EXCLUDED.metadata`,
      [
        id,
        s.name,
        s.type,
        s.protocol,
        s.address || null,
        s.metadata ? JSON.stringify(s.metadata) : "{}",
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /sensors error", e);
    res.status(500).json({ error: e.message });
  }
});

// Bind sensor to machine + metric
iotRouter.post("/sensors/bind", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const b = req.body;
    const id = b.id || genId("bind");
    if (!ok) {
      mem.bindings = mem.bindings.filter((x) => x.id !== id);
      mem.bindings.push({ id, sensor_id: b.sensorId, machine_id: b.machineId, metric: b.metric, unit: b.unit, scale: b.scale ?? 1, offset: b.offset ?? 0, created_at: new Date().toISOString() });
      return res.json({ id });
    }
    await query(
      `INSERT INTO iot.sensor_bindings (id, sensor_id, machine_id, metric, unit, scale, offset_value)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,1),COALESCE($7,0))
      ON CONFLICT (id) DO UPDATE SET sensor_id=EXCLUDED.sensor_id, machine_id=EXCLUDED.machine_id, metric=EXCLUDED.metric, unit=EXCLUDED.unit, scale=EXCLUDED.scale, offset_value=EXCLUDED.offset_value`,
      [
        id,
        b.sensorId,
        b.machineId,
        b.metric,
        b.unit || null,
        b.scale ?? 1,
        b.offset ?? 0,
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /sensors/bind error", e);
    res.status(500).json({ error: e.message });
  }
});

// Rules
iotRouter.get("/rules", async (_req, res) => {
  try {
    const ok = await ensureIotTables();
    if (!ok) {
      const data = mem.rules.filter((r:any) => r.enabled !== false).map((r:any) => ({
        id: r.id,
        machineId: r.machine_id,
        sensorId: r.sensor_id,
        metric: r.metric,
        operator: r.operator,
        minValue: r.min_value,
        maxValue: r.max_value,
        thresholdValue: r.threshold_value,
        priority: r.priority,
        message: r.message,
        enabled: r.enabled,
      }));
      return res.json(data);
    }
    const { rows } = await query(
      `SELECT * FROM iot.sensor_rules WHERE enabled = true ORDER BY created_at DESC`,
    );
    const data = rows.map((r:any) => ({
      id: r.id,
      machineId: r.machine_id,
      sensorId: r.sensor_id,
      metric: r.metric,
      operator: r.operator,
      minValue: r.min_value,
      maxValue: r.max_value,
      thresholdValue: r.threshold_value,
      priority: r.priority,
      message: r.message,
      enabled: r.enabled,
    }));
    res.json(data);
  } catch (e: any) {
    console.error("GET /rules error", e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post("/rules", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const r = req.body;
    const id = r.id || genId("rule");
    if (!ok) {
      const entry = { id, machine_id: r.machineId, sensor_id: r.sensorId || null, metric: r.metric, operator: r.operator, min_value: r.minValue ?? null, max_value: r.maxValue ?? null, threshold_value: r.thresholdValue ?? null, priority: r.priority || 'medium', message: r.message || 'Alerta de sensor', enabled: r.enabled !== false };
      mem.rules = mem.rules.filter((x:any) => x.id !== id);
      mem.rules.push(entry);
      return res.json({ id });
    }
    await query(
      `INSERT INTO iot.sensor_rules (id, machine_id, sensor_id, metric, operator, min_value, max_value, threshold_value, priority, message, enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,true))
      ON CONFLICT (id) DO UPDATE SET machine_id=EXCLUDED.machine_id, sensor_id=EXCLUDED.sensor_id, metric=EXCLUDED.metric, operator=EXCLUDED.operator, min_value=EXCLUDED.min_value, max_value=EXCLUDED.max_value, threshold_value=EXCLUDED.threshold_value, priority=EXCLUDED.priority, message=EXCLUDED.message, enabled=EXCLUDED.enabled`,
      [
        id,
        r.machineId,
        r.sensorId || null,
        r.metric,
        r.operator,
        r.minValue ?? null,
        r.maxValue ?? null,
        r.thresholdValue ?? null,
        r.priority || "medium",
        r.message || "Alerta de sensor",
        r.enabled,
      ],
    );
    res.json({ id });
  } catch (e: any) {
    console.error("POST /rules error", e);
    res.status(500).json({ error: e.message });
  }
});

// Alerts
iotRouter.get("/alerts", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const status = req.query.status as string | undefined;
    if (!ok) {
      const list = status ? mem.alerts.filter((a:any)=>a.status===status) : mem.alerts;
      return res.json(list.sort((a:any,b:any)=> (a.created_at > b.created_at ? -1 : 1)));
    }
    const { rows } = await query(
      `SELECT * FROM iot.alerts ${status ? `WHERE status = $1` : ""} ORDER BY created_at DESC`,
      status ? [status] : (undefined as any),
    );
    res.json(rows);
  } catch (e: any) {
    console.error("GET /alerts error", e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post("/alerts/:id/ack", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const id = req.params.id;
    if (!ok) {
      mem.alerts = mem.alerts.map((a:any)=> a.id===id ? { ...a, status: 'acknowledged' } : a);
      return res.json({ ok: true });
    }
    await query(`UPDATE iot.alerts SET status = 'acknowledged' WHERE id = $1`, [
      id,
    ]);
    res.json({ ok: true });
  } catch (e: any) {
    console.error("POST /alerts/:id/ack error", e);
    res.status(500).json({ error: e.message });
  }
});

// Ingest readings (from OPC-UA/MQTT/HTTP gateways)
iotRouter.post("/sensors/ingest", async (req, res) => {
  try {
    const ok = await ensureIotTables();
    const { sensorId, metric, value, timestamp } = req.body as {
      sensorId: string;
      metric: string;
      value: number;
      timestamp?: string;
    };

    let created = 0;
    if (!ok) {
      const binds = mem.bindings.filter((b:any)=> b.sensor_id === sensorId && b.metric === metric);
      for (const b of binds) {
        const adjusted = Number(value) * (Number(b.scale) ?? 1) + (Number(b.offset) ?? 0);
        const rules = mem.rules.filter((r:any)=> r.enabled !== false && r.machine_id === b.machine_id && r.metric === metric && (r.sensor_id == null || r.sensor_id === sensorId));
        for (const r of rules) {
          let violated = false;
          if (r.operator === 'range') {
            if (r.min_value != null && adjusted < Number(r.min_value)) violated = true;
            if (r.max_value != null && adjusted > Number(r.max_value)) violated = true;
          } else if (r.operator === 'gt') {
            violated = adjusted > Number(r.threshold_value);
          } else if (r.operator === 'lt') {
            violated = adjusted < Number(r.threshold_value);
          } else if (r.operator === 'eq') {
            violated = adjusted === Number(r.threshold_value);
          }
          if (violated) {
            const alertId = genId('alert');
            mem.alerts.unshift({ id: alertId, machine_id: b.machine_id, rule_id: r.id, sensor_id: sensorId, metric, value: adjusted, status: 'active', priority: r.priority, message: r.message, created_at: timestamp || new Date().toISOString() });
            created++;
          }
        }
      }
      return res.json({ ok: true, alertsCreated: created });
    }

    // Find bindings and related rules
    const binds = await query<{
      id: string;
      machine_id: string;
      scale: number;
      offset: number;
    }>(
      `SELECT id, machine_id, scale::float8, offset_value::float8 AS offset FROM iot.sensor_bindings WHERE sensor_id = $1 AND metric = $2`,
      [sensorId, metric],
    );

    for (const b of binds.rows) {
      const adjusted =
        Number(value) * (Number(b as any).scale ?? 1) +
        (Number((b as any).offset) ?? 0);
      const rules = await query<any>(
        `SELECT * FROM iot.sensor_rules WHERE enabled = true AND machine_id = $1 AND (sensor_id IS NULL OR sensor_id = $2) AND metric = $3`,
        [b.machine_id, sensorId, metric],
      );

      for (const r of rules.rows) {
        let violated = false;
        if (r.operator === "range") {
          if (r.min_value != null && adjusted < Number(r.min_value))
            violated = true;
          if (r.max_value != null && adjusted > Number(r.max_value))
            violated = true;
        } else if (r.operator === "gt") {
          violated = adjusted > Number(r.threshold_value);
        } else if (r.operator === "lt") {
          violated = adjusted < Number(r.threshold_value);
        } else if (r.operator === "eq") {
          violated = adjusted === Number(r.threshold_value);
        }

        if (violated) {
          const alertId = genId("alert");
          await query(
            `INSERT INTO iot.alerts (id, machine_id, rule_id, sensor_id, metric, value, status, priority, message, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,COALESCE($9, now()))`,
            [
              alertId,
              b.machine_id,
              r.id,
              sensorId,
              metric,
              adjusted,
              r.priority,
              r.message,
              timestamp || null,
            ],
          );
          created++;
        }
      }
    }

    res.json({ ok: true, alertsCreated: created });
  } catch (e: any) {
    console.error("POST /sensors/ingest error", e);
    res.status(500).json({ error: e.message });
  }
});
