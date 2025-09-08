import { Router } from 'express';
import { query } from '../db';

export const productionRouter = Router();

// Machines CRUD
productionRouter.get('/machines', async (_req, res) => {
  try {
    const { rows } = await query(`SELECT id, name, type, status,
      max_length_mm, max_width_mm, max_height_mm, cutting_precision,
      current_operator, last_maintenance, operating_hours, specifications
      FROM machines ORDER BY name`);
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      maxDimensions: { length: r.max_length_mm, width: r.max_width_mm, height: r.max_height_mm },
      cuttingPrecision: Number(r.cutting_precision ?? 0),
      currentOperator: r.current_operator,
      lastMaintenance: r.last_maintenance,
      operatingHours: r.operating_hours,
      specifications: r.specifications
    })));
  } catch (e:any) {
    console.error('GET /machines error', e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.post('/machines', async (req, res) => {
  try {
    const m = req.body;
    const id = m.id || `${(m.type||'machine').toLowerCase()}-${Date.now()}`;
    await query(`INSERT INTO machines (id, name, type, status, max_length_mm, max_width_mm, max_height_mm, cutting_precision, current_operator, last_maintenance, operating_hours, specifications)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING`, [
      id, m.name, m.type, m.status, m.maxDimensions?.length, m.maxDimensions?.width, m.maxDimensions?.height,
      m.cuttingPrecision, m.currentOperator || null, m.lastMaintenance || new Date().toISOString(), m.operatingHours || 0, m.specifications || ''
    ]);
    res.json({ id });
  } catch (e:any) {
    console.error('POST /machines error', e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.patch('/machines/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const m = req.body;
    await query(`UPDATE machines SET 
      name = COALESCE($2,name), type = COALESCE($3,type), status = COALESCE($4,status),
      max_length_mm = COALESCE($5,max_length_mm), max_width_mm = COALESCE($6,max_width_mm), max_height_mm = COALESCE($7,max_height_mm),
      cutting_precision = COALESCE($8,cutting_precision), current_operator = COALESCE($9,current_operator),
      last_maintenance = COALESCE($10,last_maintenance), operating_hours = COALESCE($11,operating_hours), specifications = COALESCE($12,specifications)
      WHERE id = $1`, [
      id, m.name, m.type, m.status, m.maxDimensions?.length, m.maxDimensions?.width, m.maxDimensions?.height,
      m.cuttingPrecision, m.currentOperator || null, m.lastMaintenance || null, m.operatingHours, m.specifications
    ]);
    res.json({ ok: true });
  } catch (e:any) {
    console.error('PATCH /machines/:id error', e);
    res.status(500).json({ error: e.message });
  }
});

productionRouter.delete('/machines/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM machines WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e:any) {
    console.error('DELETE /machines/:id error', e);
    res.status(500).json({ error: e.message });
  }
});
