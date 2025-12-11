import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
// Lazy loaded below to avoid ESM/CJS interop issues
import { isDbConfigured, query } from "./db";
import { Sentry, initSentryNode } from "./sentry";

export async function createServer() {
  const app = express();
  const loaded = {
    production: false,
    iot: false,
    maintenance: false,
    employees: false,
    factories: false,
    cameras: false,
    vision: false,
    agents: false,
    cameraOps: false,
    materials: false,
  };

  // serverless-http with basePath handles path stripping for Netlify Functions
  // No additional normalization needed here

  // Initialize Sentry (Node)
  initSentryNode();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc:
            process.env.NODE_ENV === "development"
              ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Permitir scripts inline em dev
              : ["'self'"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc:
            process.env.NODE_ENV === "development"
              ? ["'self'", "ws:", "wss:", "http:", "https:"] // Permitir conexões HTTP/HTTPS em dev
              : ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }),
  );

  // CORS configuration
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? true // reflete a origem do pedido (ex.: *.netlify.app)
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
      optionsSuccessStatus: 200,
    }),
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 3000 : 100000,
    message: {
      success: false,
      message: "Muitas tentativas. Tente novamente mais tarde.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  if (process.env.NODE_ENV === "production") {
    app.use(limiter);
  }

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // API routes - DEFINE EARLY so they match before routers
  app.get(["/api/ping", "/ping"], (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", async (req, res, next) => {
    try {
      const { handleDemo } = await import("./routes/demo");
      return handleDemo(req, res);
    } catch (e) {
      next(e);
    }
  });

  // DB status endpoint
  app.get(["/api/db-status", "/db-status"], async (_req, res) => {
    if (!isDbConfigured())
      return res.json({ configured: false, connected: false });
    try {
      await query("SELECT 1");
      res.json({ configured: true, connected: true });
    } catch (e: any) {
      res
        .status(500)
        .json({ configured: true, connected: false, error: e.message });
    }
  });

  // Health check endpoint - EARLY in middleware chain
  app.get(["/api/health", "/health"], async (_req, res) => {
    console.log("🏥 Health check endpoint hit");
    try {
      let db = { configured: isDbConfigured(), connected: false } as any;
      if (db.configured) {
        try {
          await query("SELECT 1");
          db.connected = true;
        } catch (e: any) {
          db.connected = false;
          db.error = e.message;
        }
      }
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: "4.1.0",
        routers: loaded,
        db,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Root responders
  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "factory-control", ts: Date.now() });
  });

  app.get("/api", (_req, res) => {
    res.json({ ok: true, service: "factory-control", ts: Date.now() });
  });

  // Equipment Maintenance Schedules endpoints (MUST be before router mounts!)
  app.get(
    ["/api/equipment-schedules", "/equipment-schedules"],
    async (req, res) => {
      try {
        if (!isDbConfigured()) return res.json([]);

        await query(`CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL,
        last_scheduled_date TIMESTAMPTZ,
        next_due_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

        const equipmentId = req.query.equipment_id as string;
        let sql = `SELECT * FROM equipment_maintenance_schedules`;
        const params: any[] = [];

        if (equipmentId) {
          sql += ` WHERE equipment_id = $1`;
          params.push(equipmentId);
        }

        sql += ` ORDER BY next_due_date ASC`;

        const { rows } = await query(sql, params);
        return res.json(
          rows.map((r: any) => ({
            id: r.id,
            equipment_id: r.equipment_id,
            maintenance_type: r.maintenance_type,
            description: r.description,
            interval_days: r.interval_days,
            last_scheduled_date: r.last_scheduled_date,
            next_due_date: r.next_due_date,
            is_active: r.is_active,
            created_at: r.created_at,
            updated_at: r.updated_at,
          })),
        );
      } catch (e: any) {
        console.error("[DIRECT] GET /equipment-schedules error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  app.post(
    ["/api/equipment-schedules", "/equipment-schedules"],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const d = req.body || {};
        const id =
          d.id ||
          `sched-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

        await query(`CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL,
        last_scheduled_date TIMESTAMPTZ,
        next_due_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

        const now = new Date();
        const nextDueDate = new Date(
          now.getTime() + d.interval_days * 24 * 60 * 60 * 1000,
        );

        await query(
          `INSERT INTO equipment_maintenance_schedules (id, equipment_id, maintenance_type, description, interval_days, last_scheduled_date, next_due_date, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
          [
            id,
            d.equipment_id || "",
            d.maintenance_type || "",
            d.description || null,
            d.interval_days || 0,
            now.toISOString(),
            nextDueDate.toISOString(),
            d.is_active !== false,
          ],
        );

        return res.json({ id });
      } catch (e: any) {
        console.error("[DIRECT] POST /equipment-schedules error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  app.put(
    ["/api/equipment-schedules/:id", "/equipment-schedules/:id"],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const id = req.params.id;
        const d = req.body || {};

        await query(`CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL,
        last_scheduled_date TIMESTAMPTZ,
        next_due_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

        await query(
          `UPDATE equipment_maintenance_schedules SET
         maintenance_type = COALESCE($2, maintenance_type),
         description = COALESCE($3, description),
         interval_days = COALESCE($4, interval_days),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
         WHERE id = $1`,
          [id, d.maintenance_type, d.description, d.interval_days, d.is_active],
        );

        return res.json({ ok: true });
      } catch (e: any) {
        console.error("[DIRECT] PUT /equipment-schedules/:id error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  app.delete(
    ["/api/equipment-schedules/:id", "/equipment-schedules/:id"],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const id = req.params.id;

        await query(`CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL,
        last_scheduled_date TIMESTAMPTZ,
        next_due_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

        await query(
          `DELETE FROM equipment_maintenance_schedules WHERE id = $1`,
          [id],
        );
        return res.json({ ok: true });
      } catch (e: any) {
        console.error("[DIRECT] DELETE /equipment-schedules/:id error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  app.post(
    [
      "/api/equipment-schedules/:id/reschedule",
      "/equipment-schedules/:id/reschedule",
    ],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const id = req.params.id;

        await query(`CREATE TABLE IF NOT EXISTS equipment_maintenance_schedules (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        description TEXT,
        interval_days INTEGER NOT NULL,
        last_scheduled_date TIMESTAMPTZ,
        next_due_date TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

        const scheduleResult = await query(
          `SELECT interval_days FROM equipment_maintenance_schedules WHERE id = $1`,
          [id],
        );

        if (scheduleResult.rows.length === 0) {
          return res.status(404).json({ error: "Schedule not found" });
        }

        const schedule = scheduleResult.rows[0];
        const now = new Date();
        const nextDueDate = new Date(
          now.getTime() + schedule.interval_days * 24 * 60 * 60 * 1000,
        );

        await query(
          `UPDATE equipment_maintenance_schedules SET
         last_scheduled_date = NOW(),
         next_due_date = $2,
         updated_at = NOW()
         WHERE id = $1`,
          [id, nextDueDate.toISOString()],
        );

        return res.json({ ok: true, next_due_date: nextDueDate });
      } catch (e: any) {
        console.error(
          "[DIRECT] POST /equipment-schedules/:id/reschedule error:",
          e,
        );
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // Users endpoints (MUST be before router mounts!)
  // GET /api/users - fetch all users from users table
  app.get(["/api/users", "/users"], async (_req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);
      await query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT DEFAULT 'active',
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        has_system_access BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      const { rows } = await query(
        `SELECT * FROM users ORDER BY created_at DESC LIMIT 1000`,
      );
      return res.json(
        rows.map((r: any) => ({
          id: r.id,
          full_name: r.full_name || r.name || "",
          username: r.username || "",
          email: r.email || "",
          role: r.role || "operator",
          position: r.position || "",
          department: r.department || "",
          shift: r.shift || "",
          status: r.status || "active",
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("[DIRECT] GET /users error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/users - create a new user
  app.post(["/api/users", "/users"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const d = req.body || {};
      const id =
        d.id ||
        `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      // Validate required fields
      if (!d.full_name || !d.username) {
        return res.status(400).json({
          error: "full_name and username are required",
        });
      }

      // Validate password for new users
      if (!d.password) {
        return res.status(400).json({
          error: "password is required",
        });
      }

      await query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT DEFAULT 'active',
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        has_system_access BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Hash password
      const hashedPassword = await bcrypt.hash(d.password, 10);

      try {
        await query(
          `INSERT INTO users (id, full_name, username, email, password, role, position, department, shift, status, has_system_access, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            id,
            d.full_name || "",
            d.username || "",
            d.email || null,
            hashedPassword,
            d.role || "operator",
            d.position || null,
            d.department || null,
            d.shift || null,
            d.status || "active",
            true,
          ],
        );
      } catch (dbError: any) {
        if (dbError.code === "23505") {
          return res.status(400).json({
            error: "Username already exists",
          });
        }
        throw dbError;
      }

      return res.json({ id });
    } catch (e: any) {
      console.error("[DIRECT] POST /users error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // PUT /api/users/:id - update a user
  app.put(["/api/users/:id", "/users/:id"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const id = req.params.id;
      const d = req.body || {};

      await query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT DEFAULT 'active',
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        has_system_access BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Build update query - if password is provided, hash it
      let hashedPassword = null;
      if (d.password) {
        hashedPassword = await bcrypt.hash(d.password, 10);
      }

      await query(
        `UPDATE users SET
         full_name = COALESCE($2, full_name),
         email = COALESCE($3, email),
         role = COALESCE($4, role),
         position = COALESCE($5, position),
         department = COALESCE($6, department),
         shift = COALESCE($7, shift),
         status = COALESCE($8, status),
         password = COALESCE($9, password),
         updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          d.full_name,
          d.email,
          d.role,
          d.position,
          d.department,
          d.shift,
          d.status,
          hashedPassword,
        ],
      );

      // Clear user cache
      const { clearUserCache } = await import("../middleware/auth");
      clearUserCache(undefined, id);

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[DIRECT] PUT /users/:id error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/users/:id - delete/deactivate a user
  app.delete(["/api/users/:id", "/users/:id"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const id = req.params.id;

      await query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT DEFAULT 'active',
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        has_system_access BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Soft delete - mark as inactive
      await query(
        `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      // Clear user cache
      const { clearUserCache } = await import("../middleware/auth");
      clearUserCache(undefined, id);

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[DIRECT] DELETE /users/:id error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Production API (Neon)
  // Netlify redirects: /api/* → /.netlify/functions/api/:splat
  // serverless-http strips /.netlify/functions/api, leaving requests as /equipment instead of /api/equipment
  // Solution: mount at specific paths (/equipment, /maintenance) AND at /api to handle both cases
  try {
    console.log("Loading production routes...");
    const { productionRouter } = await import("./routes/production");
    app.use("/equipment", productionRouter);
    app.use("/api/equipment", productionRouter);
    app.use("/api", productionRouter);
    loaded.production = true;
    console.log(
      "✅ Production routes mounted at /equipment, /api/equipment, and /api",
    );
  } catch (e) {
    console.error("Production API not loaded:", e);
  }

  try {
    const { iotRouter } = await import("./routes/iot");
    app.use("/iot", iotRouter);
    app.use("/api/iot", iotRouter);
    app.use("/api", iotRouter);
    loaded.iot = true;
    console.log("✅ IoT routes mounted at /iot, /api/iot, and /api");
  } catch (e) {
    console.warn("IoT API not loaded:", (e as any)?.message);
  }

  try {
    const { maintenanceRouter } = await import("./routes/maintenance");
    app.use("/maintenance", maintenanceRouter);
    app.use("/api/maintenance", maintenanceRouter);
    app.use("/api", maintenanceRouter);
    loaded.maintenance = true;
    console.log(
      "✅ Maintenance routes mounted at /maintenance, /api/maintenance, and /api",
    );
  } catch (e) {
    console.warn("Maintenance API not loaded:", (e as any)?.message);
  }

  try {
    const { employeesRouter } = await import("./routes/employees");
    app.use("/employees", employeesRouter);
    app.use("/api/employees", employeesRouter);
    app.use("/api", employeesRouter);
    loaded.employees = true;
    console.log(
      "✅ Employees routes mounted at /employees, /api/employees, and /api",
    );
  } catch (e) {
    console.warn("Employees API not loaded:", (e as any)?.message);
  }

  try {
    const { factoriesRouter } = await import("./routes/factories");
    app.use("/factories", factoriesRouter);
    app.use("/api/factories", factoriesRouter);
    app.use("/api", factoriesRouter);
    loaded.factories = true;
    console.log(
      "✅ Factories routes mounted at /factories, /api/factories, and /api",
    );
  } catch (e) {
    console.warn("Factories API not loaded:", (e as any)?.message);
  }

  try {
    const { camerasRouter } = await import("./routes/cameras");
    app.use("/cameras", camerasRouter);
    app.use("/api/cameras", camerasRouter);
    app.use("/api", camerasRouter);
    loaded.cameras = true;
    console.log(
      "✅ Cameras routes mounted at /cameras, /api/cameras, and /api",
    );
  } catch (e) {
    console.warn("Cameras API not loaded:", (e as any)?.message);
  }

  try {
    const { visionRouter } = await import("./routes/vision");
    app.use("/vision", visionRouter);
    app.use("/api/vision", visionRouter);
    app.use("/api", visionRouter);
    loaded.vision = true;
    console.log("✅ Vision routes mounted at /vision, /api/vision, and /api");
  } catch (e) {
    console.warn("Vision API not loaded:", (e as any)?.message);
  }

  try {
    const { agentsRouter } = await import("./routes/agents");
    app.use("/agents", agentsRouter);
    app.use("/api/agents", agentsRouter);
    app.use("/api", agentsRouter);
    loaded.agents = true;
    console.log("✅ Agents routes mounted at /agents, /api/agents, and /api");
  } catch (e) {
    console.warn("Agents API not loaded:", (e as any)?.message);
  }

  try {
    const { cameraOpsRouter } = await import("./routes/camera_ops");
    app.use("/camera-ops", cameraOpsRouter);
    app.use("/api/camera-ops", cameraOpsRouter);
    app.use("/api", cameraOpsRouter);
    loaded.cameraOps = true;
    console.log(
      "✅ Camera Ops routes mounted at /camera-ops, /api/camera-ops, and /api",
    );
  } catch (e) {
    console.warn("Camera Ops API not loaded:", (e as any)?.message);
  }

  try {
    const module = await import("./routes/materials");
    app.use("/materials", module.default);
    app.use("/api/materials", module.default);
    app.use("/api", module.default);
    loaded.materials = true;
    console.log(
      "✅ Materials routes mounted at /materials, /api/materials, and /api",
    );
  } catch (e) {
    console.warn("Materials API not loaded:", (e as any)?.message);
  }

  // Robust Equipment endpoints (direct) to avoid any router/basePath issues
  app.get(["/api/equipment", "/equipment"], async (_req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);
      await query(`CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT,
        max_length_mm INTEGER,
        max_width_mm INTEGER,
        max_height_mm INTEGER,
        cutting_precision NUMERIC,
        current_operator TEXT,
        last_maintenance TIMESTAMPTZ,
        operating_hours INTEGER,
        specifications TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      const { rows } = await query(`SELECT
        id, name, type as equipment_type, '' as manufacturer, '' as model,
        '' as serial_number, created_at as installation_date, '' as location,
        status, '' as notes, created_at
        FROM machines ORDER BY name`);
      return res.json(
        rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          equipment_type: r.equipment_type || "",
          manufacturer: r.manufacturer || "",
          model: r.model || "",
          serial_number: r.serial_number || "",
          installation_date: r.installation_date,
          location: r.location || "",
          status: r.status,
          notes: r.notes || "",
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("[DIRECT] GET /equipment error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // POST endpoint for creating/updating equipment
  app.post(["/api/equipment", "/equipment"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const d = req.body || {};
      const id =
        d.id ||
        `eq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      await query(`CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT,
        max_length_mm INTEGER,
        max_width_mm INTEGER,
        max_height_mm INTEGER,
        cutting_precision NUMERIC,
        current_operator TEXT,
        last_maintenance TIMESTAMPTZ,
        operating_hours INTEGER,
        specifications TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);

      await query(
        `INSERT INTO machines (id, name, type, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          d.name || "",
          d.equipment_type || d.type || "",
          d.status || "active",
        ],
      );

      return res.json({ id });
    } catch (e: any) {
      console.error("[DIRECT] POST /equipment error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // PUT endpoint for updating equipment
  app.put(["/api/equipment/:id", "/equipment/:id"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const id = req.params.id;
      const d = req.body || {};

      await query(`CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT,
        max_length_mm INTEGER,
        max_width_mm INTEGER,
        max_height_mm INTEGER,
        cutting_precision NUMERIC,
        current_operator TEXT,
        last_maintenance TIMESTAMPTZ,
        operating_hours INTEGER,
        specifications TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);

      await query(
        `UPDATE machines SET
         name = COALESCE($2, name),
         type = COALESCE($3, type),
         status = COALESCE($4, status)
         WHERE id = $1`,
        [id, d.name, d.equipment_type || d.type, d.status],
      );

      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[DIRECT] PUT /equipment/:id error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE endpoint for equipment
  app.delete(["/api/equipment/:id", "/equipment/:id"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const id = req.params.id;

      await query(`CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT,
        max_length_mm INTEGER,
        max_width_mm INTEGER,
        max_height_mm INTEGER,
        cutting_precision NUMERIC,
        current_operator TEXT,
        last_maintenance TIMESTAMPTZ,
        operating_hours INTEGER,
        specifications TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);

      await query(`DELETE FROM machines WHERE id = $1`, [id]);
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[DIRECT] DELETE /equipment/:id error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Equipment Files endpoints
  // Create equipment_files table
  async function ensureEquipmentFilesTable() {
    if (!isDbConfigured()) return;
    await query(`CREATE TABLE IF NOT EXISTS equipment_files (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      file_data BYTEA,
      mime_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT fk_equipment FOREIGN KEY(equipment_id) REFERENCES machines(id) ON DELETE CASCADE
    )`);
  }

  // GET equipment files
  app.get(
    ["/api/equipment/:id/files", "/equipment/:id/files"],
    async (req, res) => {
      try {
        if (!isDbConfigured()) return res.json([]);
        await ensureEquipmentFilesTable();

        const equipmentId = req.params.id;
        const { rows } = await query(
          `SELECT id, equipment_id, file_name, file_type, file_size, mime_type, created_at
         FROM equipment_files
         WHERE equipment_id = $1
         ORDER BY created_at DESC`,
          [equipmentId],
        );

        return res.json(
          rows.map((r: any) => ({
            id: r.id,
            equipment_id: r.equipment_id,
            file_name: r.file_name,
            file_type: r.file_type,
            file_size: r.file_size,
            mime_type: r.mime_type,
            created_at: r.created_at,
          })),
        );
      } catch (e: any) {
        console.error("[DIRECT] GET /equipment/:id/files error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // POST equipment file (upload)
  app.post(
    ["/api/equipment/:id/files", "/equipment/:id/files"],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        await ensureEquipmentFilesTable();

        const equipmentId = req.params.id;
        const { fileName, fileType, fileData, mimeType } = req.body;

        if (!fileName || !fileData) {
          return res
            .status(400)
            .json({ error: "fileName and fileData are required" });
        }

        const fileId = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const buffer = Buffer.from(fileData, "base64");

        await query(
          `INSERT INTO equipment_files (id, equipment_id, file_name, file_type, file_size, file_data, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            fileId,
            equipmentId,
            fileName,
            fileType || "",
            buffer.length,
            buffer,
            mimeType || "application/octet-stream",
          ],
        );

        return res.json({ id: fileId, file_name: fileName });
      } catch (e: any) {
        console.error("[DIRECT] POST /equipment/:id/files error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // GET equipment file (download)
  app.get(
    [
      "/api/equipment/:equipment_id/files/:file_id/download",
      "/equipment/:equipment_id/files/:file_id/download",
    ],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const { equipment_id, file_id } = req.params;

        const { rows } = await query(
          `SELECT file_name, file_data, mime_type FROM equipment_files WHERE id = $1 AND equipment_id = $2`,
          [file_id, equipment_id],
        );

        if (rows.length === 0) {
          return res.status(404).json({ error: "File not found" });
        }

        const file = rows[0];
        res.setHeader(
          "Content-Type",
          file.mime_type || "application/octet-stream",
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${file.file_name}"`,
        );
        res.setHeader("Content-Length", file.file_data.length);
        res.send(file.file_data);
      } catch (e: any) {
        console.error(
          "[DIRECT] GET /equipment/:id/files/:file_id/download error:",
          e,
        );
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // DELETE equipment file
  app.delete(
    [
      "/api/equipment/:equipment_id/files/:file_id",
      "/equipment/:equipment_id/files/:file_id",
    ],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const { equipment_id, file_id } = req.params;

        await query(
          `DELETE FROM equipment_files WHERE id = $1 AND equipment_id = $2`,
          [file_id, equipment_id],
        );

        return res.json({ ok: true });
      } catch (e: any) {
        console.error(
          "[DIRECT] DELETE /equipment/:id/files/:file_id error:",
          e,
        );
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // Direct machines list (read-only) to avoid 404 if router mount fails
  app.get(["/api/machines", "/machines"], async (_req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);
      await query(`CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        status TEXT,
        max_length_mm INTEGER,
        max_width_mm INTEGER,
        max_height_mm INTEGER,
        cutting_precision NUMERIC,
        current_operator TEXT,
        last_maintenance TIMESTAMPTZ,
        operating_hours INTEGER,
        specifications TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      const { rows } = await query(`SELECT id, name, type, status,
        max_length_mm, max_width_mm, max_height_mm, cutting_precision,
        current_operator, last_maintenance, operating_hours, specifications
        FROM machines ORDER BY name`);
      return res.json(
        rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          status: r.status,
          maxDimensions: {
            length: r.max_length_mm,
            width: r.max_width_mm,
            height: r.max_height_mm,
          },
          cuttingPrecision: Number(r.cutting_precision) || 0,
          currentOperator: r.current_operator,
          lastMaintenance: r.last_maintenance,
          operatingHours: r.operating_hours,
          specifications: r.specifications || "",
        })),
      );
    } catch (e: any) {
      console.error("[DIRECT] GET /machines error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Direct IoT alerts (read-only) to avoid 404 if router mount fails
  app.get(["/api/iot/alerts", "/iot/alerts"], async (req, res) => {
    const status = req.query.status as string | undefined;
    try {
      if (!isDbConfigured()) return res.json([]);
      await query(`CREATE SCHEMA IF NOT EXISTS iot`);
      await query(`CREATE TABLE IF NOT EXISTS iot.alerts (
        id TEXT PRIMARY KEY,
        machine_id TEXT,
        rule_id TEXT,
        sensor_id TEXT,
        metric TEXT,
        value DOUBLE PRECISION,
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      const { rows } = await query(
        `SELECT * FROM iot.alerts ${status ? `WHERE status = $1` : ""} ORDER BY created_at DESC`,
        status ? [status] : (undefined as any),
      );
      return res.json(rows);
    } catch (e: any) {
      console.error("[DIRECT] GET /iot/alerts error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Direct materials list
  app.get(["/api/materials", "/materials"], async (_req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);

      // Create materials table
      await query(`CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        category TEXT,
        unit TEXT,
        min_stock NUMERIC DEFAULT 0,
        current_stock NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        supplier TEXT,
        equipment_id TEXT,
        is_general_stock BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Create maintenance_parts_used table
      await query(`CREATE TABLE IF NOT EXISTS maintenance_parts_used (
        id TEXT PRIMARY KEY,
        maintenance_id TEXT,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        material_name TEXT,
        quantity_used NUMERIC,
        unit TEXT,
        cost_per_unit NUMERIC,
        total_cost NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

      const { rows } = await query(`SELECT
        id, name, code, category, unit, min_stock, current_stock,
        cost_per_unit, supplier, equipment_id, is_general_stock, notes, created_at
        FROM materials ORDER BY name`);

      return res.json(
        rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          category: r.category,
          unit: r.unit,
          min_stock: Number(r.min_stock || 0),
          current_stock: Number(r.current_stock || 0),
          cost_per_unit: Number(r.cost_per_unit || 0),
          supplier: r.supplier,
          equipment_id: r.equipment_id,
          is_general_stock: r.is_general_stock,
          notes: r.notes,
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("[DIRECT] GET /materials error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // POST endpoint for creating materials
  app.post(["/api/materials", "/materials"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const d = req.body || {};
      const id =
        d.id ||
        `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      await query(`CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        category TEXT,
        unit TEXT,
        min_stock NUMERIC DEFAULT 0,
        current_stock NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        supplier TEXT,
        equipment_id TEXT,
        is_general_stock BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      await query(
        `INSERT INTO materials (id, name, code, category, unit, min_stock, current_stock, cost_per_unit, supplier, equipment_id, is_general_stock, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          d.name || "",
          d.code || null,
          d.category || null,
          d.unit || null,
          d.min_stock || 0,
          d.current_stock || 0,
          d.cost_per_unit || 0,
          d.supplier || null,
          d.equipment_id || null,
          d.is_general_stock !== false,
          d.notes || null,
        ],
      );

      return res.json({ id });
    } catch (e: any) {
      console.error("[DIRECT] POST /materials error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // PATCH endpoint for updating material stock
  app.patch(
    ["/api/materials/:id/stock", "/materials/:id/stock"],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const { id } = req.params;
        const { quantity, operation } = req.body;

        await query(`CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        category TEXT,
        unit TEXT,
        min_stock NUMERIC DEFAULT 0,
        current_stock NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        supplier TEXT,
        equipment_id TEXT,
        is_general_stock BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

        const currentResult = await query(
          "SELECT current_stock FROM materials WHERE id = $1",
          [id],
        );

        if (currentResult.rows.length === 0) {
          return res.status(404).json({ error: "Material not found" });
        }

        const currentStock = Number(currentResult.rows[0].current_stock || 0);
        const newStock =
          operation === "subtract"
            ? Math.max(0, currentStock - quantity)
            : currentStock + quantity;

        await query(
          `UPDATE materials
         SET current_stock = $1, updated_at = now()
         WHERE id = $2`,
          [newStock, id],
        );

        return res.json({
          ok: true,
          currentStock: currentStock,
          newStock: newStock,
        });
      } catch (e: any) {
        console.error("[DIRECT] PATCH /materials/:id/stock error:", e);
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // POST endpoint for recording parts used in maintenance
  app.post(
    [
      "/api/maintenance/:maintenanceId/parts",
      "/maintenance/:maintenanceId/parts",
    ],
    async (req, res) => {
      try {
        if (!isDbConfigured())
          return res.status(400).json({ error: "Database not configured" });

        const { maintenanceId } = req.params;
        const parts = req.body || [];

        await query(`CREATE TABLE IF NOT EXISTS maintenance_parts_used (
        id TEXT PRIMARY KEY,
        maintenance_id TEXT,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        material_name TEXT,
        quantity_used NUMERIC,
        unit TEXT,
        cost_per_unit NUMERIC,
        total_cost NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

        await query(`CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        category TEXT,
        unit TEXT,
        min_stock NUMERIC DEFAULT 0,
        current_stock NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        supplier TEXT,
        equipment_id TEXT,
        is_general_stock BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

        const results = [];

        for (const part of parts) {
          const partId = `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

          await query(
            `INSERT INTO maintenance_parts_used (id, maintenance_id, material_id, material_name, quantity_used, unit, cost_per_unit, total_cost, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
            [
              partId,
              maintenanceId,
              part.material_id || null,
              part.material_name || part.name || "",
              part.quantity_used || part.quantity || 0,
              part.unit || null,
              part.cost_per_unit || 0,
              (part.quantity_used || part.quantity || 0) *
                (part.cost_per_unit || 0),
            ],
          );

          // Deduct from stock if material_id is provided
          if (part.material_id) {
            await query(
              `UPDATE materials
             SET current_stock = GREATEST(0, current_stock - $1), updated_at = now()
             WHERE id = $2`,
              [part.quantity_used || part.quantity || 0, part.material_id],
            );
          }

          results.push(partId);
        }

        return res.json({ ok: true, parts: results });
      } catch (e: any) {
        console.error(
          "[DIRECT] POST /maintenance/:maintenanceId/parts error:",
          e,
        );
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // GET endpoint for parts used in a maintenance
  app.get(
    [
      "/api/maintenance/:maintenanceId/parts",
      "/maintenance/:maintenanceId/parts",
    ],
    async (req, res) => {
      try {
        if (!isDbConfigured()) return res.json([]);

        const { maintenanceId } = req.params;

        await query(`CREATE TABLE IF NOT EXISTS maintenance_parts_used (
        id TEXT PRIMARY KEY,
        maintenance_id TEXT,
        material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,
        material_name TEXT,
        quantity_used NUMERIC,
        unit TEXT,
        cost_per_unit NUMERIC,
        total_cost NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);

        const { rows } = await query(
          `SELECT id, maintenance_id, material_id, material_name, quantity_used, unit, cost_per_unit, total_cost, created_at
         FROM maintenance_parts_used
         WHERE maintenance_id = $1
         ORDER BY created_at DESC`,
          [maintenanceId],
        );

        return res.json(
          rows.map((r: any) => ({
            id: r.id,
            maintenance_id: r.maintenance_id,
            material_id: r.material_id,
            material_name: r.material_name,
            quantity_used: Number(r.quantity_used || 0),
            unit: r.unit,
            cost_per_unit: Number(r.cost_per_unit || 0),
            total_cost: Number(r.total_cost || 0),
            created_at: r.created_at,
          })),
        );
      } catch (e: any) {
        console.error(
          "[DIRECT] GET /maintenance/:maintenanceId/parts error:",
          e,
        );
        return res.status(500).json({ error: e.message });
      }
    },
  );

  // Migration endpoint: sync employees without credentials to users table as read-only employees
  app.post(["/api/migrate-users", "/migrate-users"], async (_req, res) => {
    try {
      if (!isDbConfigured()) {
        return res.json({ migrated: 0, message: "Database not configured" });
      }

      // Ensure users table exists
      await query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT DEFAULT 'active',
        phone TEXT,
        hire_date DATE,
        skills JSONB DEFAULT '[]'::jsonb,
        certifications JSONB DEFAULT '[]'::jsonb,
        has_system_access BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )`);

      // Check if employees table exists
      const tableExists = await query(
        `SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_name = 'employees')`,
      );

      if (!tableExists.rows[0]?.exists) {
        return res.json({
          migrated: 0,
          message: "Employees table does not exist",
        });
      }

      // Get employees without system access
      const { rows: employees } = await query(
        `SELECT id, name, email, username, role, position, department, shift, status, created_at
         FROM employees
         WHERE has_system_access = false OR username IS NULL
         LIMIT 100`,
      );

      let migratedCount = 0;

      for (const emp of employees) {
        try {
          // Skip if already in users table
          const existing = await query(
            `SELECT id FROM users WHERE username = $1`,
            [emp.username || emp.id],
          );

          if (existing.rows.length > 0) {
            continue;
          }

          const username = emp.username || emp.id;
          const fullName = emp.name || "Employee";
          const defaultPassword = "ChangeMe123!";
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          await query(
            `INSERT INTO users (id, full_name, username, email, password, role, position, department, shift, status, has_system_access, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO NOTHING`,
            [
              emp.id,
              fullName,
              username,
              emp.email || null,
              hashedPassword,
              emp.role || "operator",
              emp.position || null,
              emp.department || null,
              emp.shift || null,
              emp.status || "active",
              false,
              emp.created_at || new Date().toISOString(),
              new Date().toISOString(),
            ],
          );

          migratedCount++;
        } catch (e) {
          console.error(`Error migrating employee ${emp.id}:`, e);
        }
      }

      return res.json({
        migrated: migratedCount,
        message: "Migration completed",
      });
    } catch (e: any) {
      console.error("[DIRECT] POST /migrate-users error:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Chat API endpoints
  // Initialize chat tables (idempotent)
  let chatTablesInitialized = false;

  async function ensureChatTables() {
    if (!isDbConfigured()) return;

    // Only try once per server instance
    if (chatTablesInitialized) return;

    try {
      console.log("[CHAT] Ensuring chat tables exist...");

      // Drop and recreate to ensure clean schema
      try {
        await query(`DROP TABLE IF EXISTS chat_messages CASCADE`);
        await query(`DROP TABLE IF EXISTS chat_participants CASCADE`);
        await query(`DROP TABLE IF EXISTS chat_conversations CASCADE`);
        console.log("[CHAT] Old tables dropped");
      } catch (e) {
        console.log("[CHAT] No old tables to drop");
      }

      // Create fresh tables
      await query(`CREATE TABLE chat_conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      console.log("[CHAT] chat_conversations table created");

      await query(`CREATE TABLE chat_participants (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      )`);
      console.log("[CHAT] chat_participants table created");

      await query(`CREATE TABLE chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        message TEXT,
        message_type TEXT DEFAULT 'text',
        file_data BYTEA,
        file_name TEXT,
        file_type TEXT,
        file_size INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
      console.log("[CHAT] chat_messages table created");

      chatTablesInitialized = true;
      console.log("[CHAT] All chat tables initialized successfully");
    } catch (e: any) {
      console.error("[CHAT] Error initializing tables:", e.message, e.stack);
      // Don't throw - let the app continue even if chat setup fails
      chatTablesInitialized = true;
    }
  }

  // GET /api/chat/conversations - get all conversations for the current user
  app.get(["/api/chat/conversations", "/chat/conversations"], async (req, res) => {
    try {
      if (!isDbConfigured()) {
        console.warn("[CHAT] Database not configured");
        return res.json([]);
      }

      console.log("[CHAT] GET /chat/conversations - userId:", req.query.user_id);
      await ensureChatTables();

      const userId = String(req.query.user_id || "");
      if (!userId) {
        console.warn("[CHAT] user_id is required");
        return res.status(400).json({ error: "user_id is required" });
      }

      const { rows } = await query(`
        SELECT DISTINCT
          c.id,
          c.title,
          c.created_by,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM chat_messages WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT)) as message_count,
          (SELECT message FROM chat_messages WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT) ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM chat_messages WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT) ORDER BY created_at DESC LIMIT 1) as last_message_time
        FROM chat_conversations c
        INNER JOIN chat_participants p ON CAST(c.id AS TEXT) = CAST(p.conversation_id AS TEXT)
        WHERE CAST(p.user_id AS TEXT) = $1
        ORDER BY c.updated_at DESC
      `, [userId]);

      console.log("[CHAT] Found", rows.length, "conversations for user", userId);
      return res.json(rows.map((r: any) => ({
        id: r.id,
        title: r.title || 'Conversation',
        created_by: r.created_by,
        created_at: r.created_at,
        updated_at: r.updated_at,
        message_count: Number(r.message_count || 0),
        last_message: r.last_message,
        last_message_time: r.last_message_time
      })));
    } catch (e: any) {
      console.error("[CHAT] GET /chat/conversations error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/chat/conversation/:id - get messages in a conversation
  app.get(["/api/chat/conversation/:id", "/chat/conversation/:id"], async (req, res) => {
    try {
      if (!isDbConfigured()) {
        console.warn("[CHAT] Database not configured");
        return res.json({ messages: [] });
      }

      await ensureChatTables();

      const conversationId = String(req.params.id);
      console.log("[CHAT] GET /chat/conversation/:id - conversationId:", conversationId);

      const { rows } = await query(`
        SELECT
          m.id,
          m.conversation_id,
          m.sender_id,
          m.message,
          m.message_type,
          m.file_name,
          m.file_type,
          m.file_size,
          m.created_at,
          COALESCE(u.full_name, 'Anónimo') as sender_name
        FROM chat_messages m
        LEFT JOIN users u ON CAST(m.sender_id AS TEXT) = CAST(u.id AS TEXT)
        WHERE CAST(m.conversation_id AS TEXT) = $1
        ORDER BY m.created_at ASC
      `, [conversationId]);

      console.log("[CHAT] Found", rows.length, "messages in conversation", conversationId);
      return res.json({
        conversation_id: conversationId,
        messages: rows.map((r: any) => ({
          id: r.id,
          conversation_id: r.conversation_id,
          sender_id: r.sender_id,
          sender_name: r.sender_name,
          message: r.message,
          message_type: r.message_type,
          file_name: r.file_name,
          file_type: r.file_type,
          file_size: r.file_size,
          created_at: r.created_at
        }))
      });
    } catch (e: any) {
      console.error("[CHAT] GET /chat/conversation/:id error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/chat/conversation - create or find existing conversation
  app.post(["/api/chat/conversation", "/chat/conversation"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      await ensureChatTables();

      const { title, user_id, participant_ids } = req.body;
      const userId = String(user_id || "");
      const participantIdsList = Array.isArray(participant_ids)
        ? participant_ids.map(id => String(id))
        : [];

      console.log("[CHAT] POST /chat/conversation - finding or creating conversation", {
        user_id: userId,
        participant_ids: participantIdsList
      });

      if (!userId) {
        return res.status(400).json({ error: "user_id is required" });
      }

      // For 1-on-1 conversations, check if one already exists with this pair of users
      if (participantIdsList.length === 1) {
        const otherUserId = participantIdsList[0];

        // Find existing conversation between these two users (exactly 2 participants)
        const { rows: existingConvs } = await query(`
          SELECT c.id, c.title, c.created_by, c.created_at, c.updated_at
          FROM chat_conversations c
          WHERE (
            SELECT COUNT(DISTINCT CAST(user_id AS TEXT))
            FROM chat_participants
            WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT)
          ) = 2
          AND EXISTS (
            SELECT 1 FROM chat_participants
            WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT)
            AND CAST(user_id AS TEXT) = $1
          )
          AND EXISTS (
            SELECT 1 FROM chat_participants
            WHERE CAST(conversation_id AS TEXT) = CAST(c.id AS TEXT)
            AND CAST(user_id AS TEXT) = $2
          )
          LIMIT 1
        `, [userId, otherUserId]);

        console.log("[CHAT] Checked for existing 1-on-1 conversation between", userId, "and", otherUserId, "- Found:", existingConvs.length);

        if (existingConvs.length > 0) {
          console.log("[CHAT] Found existing conversation:", existingConvs[0].id);
          return res.json({
            id: existingConvs[0].id,
            title: existingConvs[0].title || 'Conversation',
            created_by: existingConvs[0].created_by
          });
        }
      }

      // No existing conversation, create a new one
      const conversationId = `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      await query(`
        INSERT INTO chat_conversations (id, title, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [conversationId, title || 'Conversation', userId]);

      // Add creator as participant
      const participantId1 = `part-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await query(`
        INSERT INTO chat_participants (id, conversation_id, user_id, joined_at)
        VALUES ($1, $2, $3, NOW())
      `, [participantId1, conversationId, userId]);

      // Add other participants
      for (const participantUserId of participantIdsList) {
        if (participantUserId !== userId) {
          const participantId = `part-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          try {
            await query(`
              INSERT INTO chat_participants (id, conversation_id, user_id, joined_at)
              VALUES ($1, $2, $3, NOW())
            `, [participantId, conversationId, participantUserId]);
          } catch (e) {
            console.warn(`[CHAT] Could not add participant ${participantUserId}:`, e);
          }
        }
      }

      console.log("[CHAT] Conversation created:", conversationId);
      return res.json({
        id: conversationId,
        title: title || 'Conversation',
        created_by: userId
      });
    } catch (e: any) {
      console.error("[CHAT] POST /chat/conversation error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // POST /api/chat/message - send a message
  app.post(["/api/chat/message", "/chat/message"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      await ensureChatTables();

      const { conversation_id, sender_id, message, message_type, file_name, file_type, file_size, file_data } = req.body;
      const conversationId = String(conversation_id || "");
      const senderId = String(sender_id || "");

      if (!conversationId || !senderId) {
        return res.status(400).json({ error: "conversation_id and sender_id are required" });
      }

      console.log("[CHAT] POST /chat/message - sending", message_type || 'text', "message");

      const messageId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const buffer = file_data ? Buffer.from(file_data, "base64") : null;

      await query(`
        INSERT INTO chat_messages (id, conversation_id, sender_id, message, message_type, file_data, file_name, file_type, file_size, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        messageId,
        conversationId,
        senderId,
        message || null,
        message_type || 'text',
        buffer,
        file_name || null,
        file_type || null,
        file_size || null
      ]);

      // Update conversation updated_at
      await query(`
        UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1
      `, [conversationId]);

      console.log("[CHAT] Message created:", messageId);
      return res.json({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        message,
        message_type: message_type || 'text',
        file_name,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      console.error("[CHAT] POST /chat/message error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/chat/message/:id/file - download a message file
  app.get(["/api/chat/message/:id/file", "/chat/message/:id/file"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      const messageId = String(req.params.id);
      console.log("[CHAT] GET /chat/message/:id/file - messageId:", messageId);

      const { rows } = await query(`
        SELECT file_data, file_name, file_type FROM chat_messages WHERE id = $1
      `, [messageId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: "Message not found" });
      }

      const { file_data, file_name, file_type } = rows[0];

      if (!file_data) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", file_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${file_name || 'file'}"`);
      res.setHeader("Content-Length", file_data.length);
      res.send(file_data);
    } catch (e: any) {
      console.error("[CHAT] GET /chat/message/:id/file error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/chat/conversation/:id/participants - get participants in a conversation
  app.get(["/api/chat/conversation/:id/participants", "/chat/conversation/:id/participants"], async (req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);

      await ensureChatTables();

      const conversationId = String(req.params.id);
      console.log("[CHAT] GET /chat/conversation/:id/participants - conversationId:", conversationId);

      const { rows } = await query(`
        SELECT
          p.id,
          p.user_id,
          p.joined_at,
          COALESCE(u.full_name, 'Anónimo') as full_name,
          COALESCE(u.username, p.user_id) as username,
          u.email
        FROM chat_participants p
        LEFT JOIN users u ON CAST(p.user_id AS TEXT) = CAST(u.id AS TEXT)
        WHERE CAST(p.conversation_id AS TEXT) = $1
        ORDER BY p.joined_at ASC
      `, [conversationId]);

      console.log("[CHAT] Found", rows.length, "participants in conversation", conversationId);
      return res.json(rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        full_name: r.full_name,
        username: r.username,
        email: r.email,
        joined_at: r.joined_at
      })));
    } catch (e: any) {
      console.error("[CHAT] GET /chat/conversation/:id/participants error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // Cleanup: Merge duplicate conversations (same pair of participants)
  app.post(["/api/chat/cleanup", "/chat/cleanup"], async (req, res) => {
    try {
      if (!isDbConfigured())
        return res.status(400).json({ error: "Database not configured" });

      await ensureChatTables();

      console.log("[CHAT] Starting cleanup of duplicate conversations...");

      // Find groups of conversations with the same pair of participants (1-on-1 conversations only)
      const { rows: duplicateGroups } = await query(`
        WITH conversation_participants AS (
          SELECT
            c.id as conversation_id,
            STRING_AGG(DISTINCT CAST(p.user_id AS TEXT), ',' ORDER BY CAST(p.user_id AS TEXT)) as participant_list,
            COUNT(DISTINCT CAST(p.user_id AS TEXT)) as participant_count
          FROM chat_conversations c
          INNER JOIN chat_participants p ON CAST(c.id AS TEXT) = CAST(p.conversation_id AS TEXT)
          GROUP BY c.id
        )
        SELECT
          participant_list,
          ARRAY_AGG(conversation_id ORDER BY conversation_id) as conversation_ids,
          COUNT(*) as count,
          participant_count
        FROM conversation_participants
        WHERE participant_count = 2
        GROUP BY participant_list, participant_count
        HAVING COUNT(*) > 1
      `);

      let mergedCount = 0;
      for (const group of duplicateGroups) {
        const convIds = group.conversation_ids;
        if (convIds.length > 1) {
          const keepConvId = convIds[0]; // Keep the first one
          const mergeConvIds = convIds.slice(1); // Merge others into it

          // Move all messages from other conversations to the first one
          for (const mergeConvId of mergeConvIds) {
            await query(`
              UPDATE chat_messages
              SET conversation_id = $1
              WHERE CAST(conversation_id AS TEXT) = CAST($2 AS TEXT)
            `, [keepConvId, mergeConvId]);

            // Delete the duplicate conversation and its participants
            await query(`
              DELETE FROM chat_participants
              WHERE CAST(conversation_id AS TEXT) = CAST($1 AS TEXT)
            `, [mergeConvId]);

            await query(`
              DELETE FROM chat_conversations
              WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)
            `, [mergeConvId]);

            mergedCount++;
            console.log(`[CHAT] Merged conversation ${mergeConvId} into ${keepConvId}`);
          }
        }
      }

      console.log(`[CHAT] Cleanup complete. Merged ${mergedCount} duplicate conversations.`);
      return res.json({
        success: true,
        merged_count: mergedCount,
        message: `Merged ${mergedCount} duplicate conversations`
      });
    } catch (e: any) {
      console.error("[CHAT] POST /chat/cleanup error:", e.message, e.stack);
      return res.status(500).json({ error: e.message });
    }
  });

  // Debug: list registered routes
  app.get(["/api/_routes", "/_routes"], (_req, res) => {
    try {
      const routes: Array<{ method: string; path: string }> = [];
      (app as any)._router?.stack?.forEach((layer: any) => {
        if (layer.route && layer.route.path) {
          const methods = Object.keys(layer.route.methods)
            .filter((m) => layer.route.methods[m])
            .map((m) => m.toUpperCase());
          methods.forEach((method) =>
            routes.push({ method, path: layer.route.path }),
          );
        } else if (layer.name === "router" && layer.handle?.stack) {
          layer.handle.stack.forEach((s: any) => {
            if (s.route && s.route.path) {
              const methods = Object.keys(s.route.methods)
                .filter((m) => s.route.methods[m])
                .map((m) => m.toUpperCase());
              methods.forEach((method) =>
                routes.push({ method, path: s.route.path }),
              );
            }
          });
        }
      });
      res.json({ routes });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Catch-all for undefined API routes - return JSON 404 instead of HTML
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Sentry Express error/request handlers (must be after routes, before our error handler)
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Error handling middleware
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("❌ Server Error:", err);

      res.status(err.status || 500).json({
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "Erro interno do servidor"
            : err.message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
      });
    },
  );

  return app;
}
