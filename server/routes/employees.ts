import express from "express";
import { isDbConfigured, query } from "../db";

export const employeesRouter = express.Router();
employeesRouter.use(express.json({ limit: "2mb" }));
employeesRouter.use(express.urlencoded({ extended: true }));

let initPromise: Promise<boolean> | null = null;
async function ensureEmployeesTables(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await query(`CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        department TEXT NOT NULL,
        shift TEXT NOT NULL,
        status TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        machine_operating_license JSONB DEFAULT '[]'::jsonb,
        current_assignment TEXT,
        supervisor TEXT,
        productivity_score INT DEFAULT 0,
        attendance_rate INT DEFAULT 0,
        training_hours INT DEFAULT 0,
        last_presence_update TIMESTAMPTZ,
        username TEXT,
        role TEXT,
        access_level TEXT,
        has_system_access BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
      return true;
    } catch (e) {
      console.error("ensureEmployeesTables error", e);
      return false;
    }
  })();
  const ok = await initPromise; if (!ok) initPromise = null; return ok;
}

function genId() { return `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

employeesRouter.get("/employees", async (_req, res) => {
  try {
    await ensureEmployeesTables();
    const { rows } = await query(`SELECT * FROM employees ORDER BY created_at DESC`);
    return res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      position: r.position,
      department: r.department,
      shift: r.shift,
      status: r.status,
      email: r.email,
      phone: r.phone,
      hireDate: r.hire_date,
      skills: r.skills || [],
      certifications: r.certifications || [],
      machineOperatingLicense: r.machine_operating_license || [],
      currentAssignment: r.current_assignment,
      supervisor: r.supervisor,
      productivityScore: r.productivity_score || 0,
      attendanceRate: r.attendance_rate || 0,
      trainingHours: r.training_hours || 0,
      lastPresenceUpdate: r.last_presence_update || undefined,
      username: r.username || undefined,
      role: r.role || undefined,
      accessLevel: r.access_level || undefined,
      hasSystemAccess: !!r.has_system_access,
      createdAt: r.created_at
    })));
  } catch (e: any) {
    if (isDbConfigured()) return res.status(500).json({ error: e.message });
    return res.json([]);
  }
});

employeesRouter.post("/employees", async (req, res) => {
  const d = req.body || {};
  const id = d.id || genId();
  try {
    await ensureEmployeesTables();
    await query(`INSERT INTO employees (
      id, name, position, department, shift, status, email, phone, hire_date, skills, certifications, machine_operating_license,
      current_assignment, supervisor, productivity_score, attendance_rate, training_hours, last_presence_update,
      username, role, access_level, has_system_access
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'[]'::jsonb),COALESCE($11,'[]'::jsonb),COALESCE($12,'[]'::jsonb),
      $13,$14,COALESCE($15,0),COALESCE($16,0),COALESCE($17,0),$18,$19,$20,$21,COALESCE($22,false)
    ) ON CONFLICT (id) DO NOTHING`, [
      id, d.name, d.position, d.department, d.shift, d.status || 'absent', d.email || null, d.phone || null, d.hireDate || null,
      d.skills ? JSON.stringify(d.skills) : '[]', d.certifications ? JSON.stringify(d.certifications) : '[]', d.machineOperatingLicense ? JSON.stringify(d.machineOperatingLicense) : '[]',
      d.currentAssignment || null, d.supervisor || null, d.productivityScore ?? 0, d.attendanceRate ?? 0, d.trainingHours ?? 0,
      d.lastPresenceUpdate || null, d.username || null, d.role || null, d.accessLevel || null, !!d.hasSystemAccess
    ]);
    return res.json({ id });
  } catch (e: any) {
    if (isDbConfigured()) return res.status(500).json({ error: e.message });
    return res.json({ id });
  }
});

employeesRouter.patch("/employees/:id", async (req, res) => {
  const id = req.params.id; const d = req.body || {};
  try {
    await ensureEmployeesTables();
    await query(`UPDATE employees SET
      name=COALESCE($2,name), position=COALESCE($3,position), department=COALESCE($4,department), shift=COALESCE($5,shift), status=COALESCE($6,status),
      email=COALESCE($7,email), phone=COALESCE($8,phone), hire_date=COALESCE($9,hire_date), skills=COALESCE($10,skills), certifications=COALESCE($11,certifications),
      machine_operating_license=COALESCE($12,machine_operating_license), current_assignment=COALESCE($13,current_assignment), supervisor=COALESCE($14,supervisor),
      productivity_score=COALESCE($15,productivity_score), attendance_rate=COALESCE($16,attendance_rate), training_hours=COALESCE($17,training_hours),
      last_presence_update=COALESCE($18,last_presence_update), username=COALESCE($19,username), role=COALESCE($20,role), access_level=COALESCE($21,access_level), has_system_access=COALESCE($22,has_system_access)
      WHERE id=$1`, [
      id, d.name, d.position, d.department, d.shift, d.status, d.email, d.phone, d.hireDate,
      d.skills ? JSON.stringify(d.skills) : undefined, d.certifications ? JSON.stringify(d.certifications) : undefined,
      d.machineOperatingLicense ? JSON.stringify(d.machineOperatingLicense) : undefined, d.currentAssignment, d.supervisor,
      d.productivityScore, d.attendanceRate, d.trainingHours, d.lastPresenceUpdate, d.username, d.role, d.accessLevel, d.hasSystemAccess
    ]);
    return res.json({ ok: true });
  } catch (e: any) {
    if (isDbConfigured()) return res.status(500).json({ error: e.message });
    return res.json({ ok: true });
  }
});

employeesRouter.delete("/employees/:id", async (req, res) => {
  const id = req.params.id;
  try { await ensureEmployeesTables(); await query(`DELETE FROM employees WHERE id=$1`, [id]); return res.json({ ok: true }); }
  catch (e: any) { if (isDbConfigured()) return res.status(500).json({ error: e.message }); return res.json({ ok: true }); }
});
