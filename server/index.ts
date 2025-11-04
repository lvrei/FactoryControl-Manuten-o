import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
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

  // Production API (Neon) - mount routers at BOTH "/" and "/api"
  // Netlify redirects: /api/* → /.netlify/functions/api/:splat
  // serverless-http strips /.netlify/functions/api, leaving just /equipment instead of /api/equipment
  // So routers must be available at "/" to catch these requests
  try {
    console.log("Loading production routes...");
    const { productionRouter } = await import("./routes/production");
    app.use("/", productionRouter);
    app.use("/api", productionRouter);
    loaded.production = true;
    console.log("✅ Production routes mounted at / and /api");
  } catch (e) {
    console.error("Production API not loaded:", e);
  }

  try {
    const { iotRouter } = await import("./routes/iot");
    app.use("/", iotRouter);
    app.use("/api", iotRouter);
    app.use("/api/iot", iotRouter);
    loaded.iot = true;
    console.log("✅ IoT routes mounted at /, /api, and /api/iot");
  } catch (e) {
    console.warn("IoT API not loaded:", (e as any)?.message);
  }

  try {
    const { maintenanceRouter } = await import("./routes/maintenance");
    app.use("/", maintenanceRouter);
    app.use("/api", maintenanceRouter);
    loaded.maintenance = true;
    console.log("✅ Maintenance routes mounted at / and /api");
  } catch (e) {
    console.warn("Maintenance API not loaded:", (e as any)?.message);
  }

  try {
    const { employeesRouter } = await import("./routes/employees");
    app.use("/", employeesRouter);
    app.use("/api", employeesRouter);
    loaded.employees = true;
    console.log("✅ Employees routes mounted at / and /api");
  } catch (e) {
    console.warn("Employees API not loaded:", (e as any)?.message);
  }

  try {
    const { factoriesRouter } = await import("./routes/factories");
    app.use("/", factoriesRouter);
    app.use("/api", factoriesRouter);
    loaded.factories = true;
    console.log("✅ Factories routes mounted at / and /api");
  } catch (e) {
    console.warn("Factories API not loaded:", (e as any)?.message);
  }

  try {
    const { camerasRouter } = await import("./routes/cameras");
    app.use("/", camerasRouter);
    app.use("/api", camerasRouter);
    loaded.cameras = true;
    console.log("✅ Cameras routes mounted at / and /api");
  } catch (e) {
    console.warn("Cameras API not loaded:", (e as any)?.message);
  }

  try {
    const { visionRouter } = await import("./routes/vision");
    app.use("/", visionRouter);
    app.use("/api", visionRouter);
    loaded.vision = true;
    console.log("✅ Vision routes mounted at / and /api");
  } catch (e) {
    console.warn("Vision API not loaded:", (e as any)?.message);
  }

  try {
    const { agentsRouter } = await import("./routes/agents");
    app.use("/", agentsRouter);
    app.use("/api", agentsRouter);
    loaded.agents = true;
    console.log("✅ Agents routes mounted at / and /api");
  } catch (e) {
    console.warn("Agents API not loaded:", (e as any)?.message);
  }

  try {
    const { cameraOpsRouter } = await import("./routes/camera_ops");
    app.use("/", cameraOpsRouter);
    app.use("/api", cameraOpsRouter);
    loaded.cameraOps = true;
    console.log("✅ Camera Ops routes mounted at / and /api");
  } catch (e) {
    console.warn("Camera Ops API not loaded:", (e as any)?.message);
  }

  try {
    const module = await import("./routes/materials");
    app.use("/", module.default);
    app.use("/materials", module.default);
    app.use("/api", module.default);
    app.use("/api/materials", module.default);
    loaded.materials = true;
    console.log(
      "✅ Materials routes mounted at /, /materials, /api, and /api/materials",
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

  // Alias for legacy clients requesting /api/users -> returns employees
  app.get(["/api/users", "/users"], async (_req, res) => {
    try {
      if (!isDbConfigured()) return res.json([]);
      await query(`CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        shift TEXT,
        status TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`);
      const { rows } = await query(
        `SELECT id, name, position, department, shift, status, created_at FROM employees ORDER BY created_at DESC`,
      );
      return res.json(
        rows.map((r: any) => ({
          id: r.id,
          full_name: r.name,
          position: r.position || "",
          department: r.department || "",
          shift: r.shift || "",
          status: r.status || "",
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("[DIRECT] GET /users error:", e);
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
