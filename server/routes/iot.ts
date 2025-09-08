import { Router } from 'express';
import { query } from '../db';

export const iotRouter = Router();

async function ensureIotTables() {
  // Sensors table
  await query(`CREATE TABLE IF NOT EXISTS sensors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    protocol TEXT NOT NULL,
    address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);

  // Sensor bindings (sensor -> machine + metric)
  await query(`CREATE TABLE IF NOT EXISTS sensor_bindings (
    id TEXT PRIMARY KEY,
    sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    unit TEXT,
    scale NUMERIC DEFAULT 1,
    offset NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sensor_bindings_sensor ON sensor_bindings(sensor_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sensor_bindings_machine ON sensor_bindings(machine_id)`);

  // Rules (thresholds and priorities)
  await query(`CREATE TABLE IF NOT EXISTS sensor_rules (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    sensor_id TEXT REFERENCES sensors(id) ON DELETE SET NULL,
    metric TEXT NOT NULL,
    operator TEXT NOT NULL, -- range | gt | lt | eq
    min_value NUMERIC,
    max_value NUMERIC,
    threshold_value NUMERIC,
    priority TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | critical
    message TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  )`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sensor_rules_machine ON sensor_rules(machine_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sensor_rules_sensor ON sensor_rules(sensor_id)`);

  // Alerts
  await query(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    rule_id TEXT REFERENCES sensor_rules(id) ON DELETE SET NULL,
    sensor_id TEXT REFERENCES sensors(id) ON DELETE SET NULL,
    metric TEXT NOT NULL,
    value NUMERIC,
    status TEXT NOT NULL DEFAULT 'active', -- active | acknowledged | resolved
    priority TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
  )`);
  await query(`CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_alerts_machine ON alerts(machine_id)`);
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Sensors
iotRouter.get('/sensors', async (_req, res) => {
  try {
    await ensureIotTables();
    const { rows } = await query(`SELECT * FROM sensors ORDER BY created_at DESC`);
    res.json(rows);
  } catch (e: any) {
    console.error('GET /sensors error', e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post('/sensors', async (req, res) => {
  try {
    await ensureIotTables();
    const s = req.body;
    const id = s.id || genId('sensor');
    await query(`INSERT INTO sensors (id, name, type, protocol, address, metadata)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'{}'::jsonb))
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, type=EXCLUDED.type, protocol=EXCLUDED.protocol, address=EXCLUDED.address, metadata=EXCLUDED.metadata`,
      [id, s.name, s.type, s.protocol, s.address || null, s.metadata ? JSON.stringify(s.metadata) : '{}']
    );
    res.json({ id });
  } catch (e: any) {
    console.error('POST /sensors error', e);
    res.status(500).json({ error: e.message });
  }
});

// Bind sensor to machine + metric
iotRouter.post('/sensors/bind', async (req, res) => {
  try {
    await ensureIotTables();
    const b = req.body;
    const id = b.id || genId('bind');
    await query(`INSERT INTO sensor_bindings (id, sensor_id, machine_id, metric, unit, scale, offset)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,1),COALESCE($7,0))
      ON CONFLICT (id) DO UPDATE SET sensor_id=EXCLUDED.sensor_id, machine_id=EXCLUDED.machine_id, metric=EXCLUDED.metric, unit=EXCLUDED.unit, scale=EXCLUDED.scale, offset=EXCLUDED.offset`,
      [id, b.sensorId, b.machineId, b.metric, b.unit || null, b.scale ?? 1, b.offset ?? 0]
    );
    res.json({ id });
  } catch (e: any) {
    console.error('POST /sensors/bind error', e);
    res.status(500).json({ error: e.message });
  }
});

// Rules
iotRouter.get('/rules', async (_req, res) => {
  try {
    await ensureIotTables();
    const { rows } = await query(`SELECT * FROM sensor_rules WHERE enabled = true ORDER BY created_at DESC`);
    res.json(rows);
  } catch (e: any) {
    console.error('GET /rules error', e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post('/rules', async (req, res) => {
  try {
    await ensureIotTables();
    const r = req.body;
    const id = r.id || genId('rule');
    await query(`INSERT INTO sensor_rules (id, machine_id, sensor_id, metric, operator, min_value, max_value, threshold_value, priority, message, enabled)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,true))
      ON CONFLICT (id) DO UPDATE SET machine_id=EXCLUDED.machine_id, sensor_id=EXCLUDED.sensor_id, metric=EXCLUDED.metric, operator=EXCLUDED.operator, min_value=EXCLUDED.min_value, max_value=EXCLUDED.max_value, threshold_value=EXCLUDED.threshold_value, priority=EXCLUDED.priority, message=EXCLUDED.message, enabled=EXCLUDED.enabled`,
      [id, r.machineId, r.sensorId || null, r.metric, r.operator, r.minValue ?? null, r.maxValue ?? null, r.thresholdValue ?? null, r.priority || 'medium', r.message || 'Alerta de sensor', r.enabled]
    );
    res.json({ id });
  } catch (e: any) {
    console.error('POST /rules error', e);
    res.status(500).json({ error: e.message });
  }
});

// Alerts
iotRouter.get('/alerts', async (req, res) => {
  try {
    await ensureIotTables();
    const status = req.query.status as string | undefined;
    const { rows } = await query(`SELECT * FROM alerts ${status ? `WHERE status = $1` : ''} ORDER BY created_at DESC`, status ? [status] : undefined as any);
    res.json(rows);
  } catch (e: any) {
    console.error('GET /alerts error', e);
    res.status(500).json({ error: e.message });
  }
});

iotRouter.post('/alerts/:id/ack', async (req, res) => {
  try {
    await ensureIotTables();
    const id = req.params.id;
    await query(`UPDATE alerts SET status = 'acknowledged' WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e:any) {
    console.error('POST /alerts/:id/ack error', e);
    res.status(500).json({ error: e.message });
  }
});

// Ingest readings (from OPC-UA/MQTT/HTTP gateways)
iotRouter.post('/sensors/ingest', async (req, res) => {
  try {
    await ensureIotTables();
    const { sensorId, metric, value, timestamp } = req.body as { sensorId: string; metric: string; value: number; timestamp?: string };

    // Find bindings and related rules
    const binds = await query<{ id: string; machine_id: string; scale: number; offset: number }>(
      `SELECT id, machine_id, scale::float8, offset::float8 FROM sensor_bindings WHERE sensor_id = $1 AND metric = $2`,
      [sensorId, metric]
    );

    let created = 0;
    for (const b of binds.rows) {
      const adjusted = (Number(value) * (Number(b as any).scale ?? 1)) + (Number((b as any).offset) ?? 0);
      const rules = await query<any>(
        `SELECT * FROM sensor_rules WHERE enabled = true AND machine_id = $1 AND (sensor_id IS NULL OR sensor_id = $2) AND metric = $3`,
        [b.machine_id, sensorId, metric]
      );

      for (const r of rules.rows) {
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
          await query(`INSERT INTO alerts (id, machine_id, rule_id, sensor_id, metric, value, status, priority, message, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,COALESCE($9, now()))`,
            [alertId, b.machine_id, r.id, sensorId, metric, adjusted, r.priority, r.message, timestamp || null]
          );
          created++;
        }
      }
    }

    res.json({ ok: true, alertsCreated: created });
  } catch (e: any) {
    console.error('POST /sensors/ingest error', e);
    res.status(500).json({ error: e.message });
  }
});
