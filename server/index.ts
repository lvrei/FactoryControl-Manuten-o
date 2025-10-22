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

  // API routes
  app.get("/api/ping", (_req, res) => {
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
  app.get("/api/db-status", async (_req, res) => {
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

  // Equipment routes - DIRECT IMPLEMENTATION BEFORE ROUTERS
  app.get("/api/equipment", async (_req, res) => {
    console.log("[DIRECT] GET /api/equipment called");
    try {
      if (!isDbConfigured()) {
        console.log("[DIRECT] DB not configured, returning empty array");
        return res.json([]);
      }
      const { rows } = await query(`SELECT id, name, type as equipment_type, status, created_at FROM machines ORDER BY name`);
      console.log(`[DIRECT] Found ${rows.length} equipment items`);
      res.json(rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        equipment_type: r.equipment_type || "",
        status: r.status,
        created_at: r.created_at,
      })));
    } catch (e: any) {
      console.error("[DIRECT] GET /api/equipment error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    console.log("[DIRECT] POST /api/equipment called");
    try {
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const data = req.body;
      const id = `equip-${Date.now()}`;
      await query(
        `INSERT INTO machines (id, name, type, status, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [id, data.name, data.equipment_type || "generic", data.status || "active"]
      );
      console.log(`[DIRECT] Created equipment: ${id}`);
      res.status(201).json({ id, ...data });
    } catch (e: any) {
      console.error("[DIRECT] POST /api/equipment error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Users routes - DIRECT IMPLEMENTATION BEFORE ROUTERS
  app.get("/api/users", async (_req, res) => {
    console.log("[DIRECT] GET /api/users called");
    try {
      if (!isDbConfigured()) {
        console.log("[DIRECT] DB not configured, returning empty array");
        return res.json([]);
      }
      const tableCheck = await query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS exists`);
      if (!tableCheck.rows[0]?.exists) {
        console.log("[DIRECT] Users table does not exist, returning empty array");
        return res.json([]);
      }
      const { rows } = await query(`SELECT id, username, full_name, email, role, created_at FROM users ORDER BY full_name`);
      console.log(`[DIRECT] Found ${rows.length} users`);
      res.json(rows);
    } catch (e: any) {
      console.error("[DIRECT] GET /api/users error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    console.log("[DIRECT] POST /api/users called");
    try {
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const { username, full_name, email, role, password } = req.body;
      const id = `user-${Date.now()}`;
      await query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, email TEXT, role TEXT NOT NULL, password_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
      const passwordHash = password ? `hash_${password}` : null;
      await query(`INSERT INTO users (id, username, full_name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)`, [id, username, full_name, email || null, role, passwordHash]);
      console.log(`[DIRECT] Created user: ${id}`);
      res.status(201).json({ id, username, full_name, email, role });
    } catch (e: any) {
      console.error("[DIRECT] POST /api/users error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Test routes without /api prefix (theory: Netlify strips /api)
  app.get("/equipment", async (_req, res) => {
    try {
      console.log("GET /equipment called (without /api prefix)");
      if (!isDbConfigured()) {
        return res.json([]);
      }
      const { rows } = await query(
        `SELECT id, name, type as equipment_type, status, created_at FROM machines ORDER BY name`,
      );
      res.json(
        rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          equipment_type: r.equipment_type || "",
          status: r.status,
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("GET /equipment error", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/equipment", async (req, res) => {
    try {
      console.log("POST /equipment called (without /api prefix)");
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const data = req.body;
      const id = `equip-${Date.now()}`;
      await query(
        `INSERT INTO machines (id, name, type, status, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [
          id,
          data.name,
          data.equipment_type || "generic",
          data.status || "active",
        ],
      );
      res.status(201).json({ id, ...data });
    } catch (e: any) {
      console.error("POST /equipment error", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/users", async (_req, res) => {
    try {
      console.log("GET /users called (without /api prefix)");
      if (!isDbConfigured()) {
        return res.json([]);
      }
      const tableCheck = await query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS exists`,
      );
      if (!tableCheck.rows[0]?.exists) {
        return res.json([]);
      }
      const { rows } = await query(
        `SELECT id, username, full_name, email, role, created_at FROM users ORDER BY full_name`,
      );
      res.json(rows);
    } catch (e: any) {
      console.error("GET /users error", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/users", async (req, res) => {
    try {
      console.log("POST /users called (without /api prefix)");
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const { username, full_name, email, role, password } = req.body;
      const id = `user-${Date.now()}`;
      await query(
        `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, email TEXT, role TEXT NOT NULL, password_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      );
      const passwordHash = password ? `hash_${password}` : null;
      await query(
        `INSERT INTO users (id, username, full_name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, username, full_name, email || null, role, passwordHash],
      );
      res.status(201).json({ id, username, full_name, email, role });
    } catch (e: any) {
      console.error("POST /users error", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Direct equipment endpoint (for testing)
  app.get("/api/equipment", async (_req, res) => {
    try {
      console.log("Direct /api/equipment route called");
      if (!isDbConfigured()) {
        return res.json([]);
      }
      const { rows } = await query(
        `SELECT id, name, type as equipment_type, status, created_at FROM machines ORDER BY name`,
      );
      res.json(
        rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          equipment_type: r.equipment_type || "",
          status: r.status,
          created_at: r.created_at,
        })),
      );
    } catch (e: any) {
      console.error("GET /api/equipment error", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      console.log("Direct POST /api/equipment route called");
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const data = req.body;
      const id = `equip-${Date.now()}`;
      await query(
        `INSERT INTO machines (id, name, type, status, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [
          id,
          data.name,
          data.equipment_type || "generic",
          data.status || "active",
        ],
      );
      res.status(201).json({ id, ...data });
    } catch (e: any) {
      console.error("POST /api/equipment error", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Direct users endpoint (for testing)
  app.get("/api/users", async (_req, res) => {
    try {
      console.log("Direct /api/users route called");
      if (!isDbConfigured()) {
        return res.json([]);
      }
      const tableCheck = await query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS exists`,
      );
      if (!tableCheck.rows[0]?.exists) {
        return res.json([]);
      }
      const { rows } = await query(
        `SELECT id, username, full_name, email, role, created_at FROM users ORDER BY full_name`,
      );
      res.json(rows);
    } catch (e: any) {
      console.error("GET /api/users error", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      console.log("Direct POST /api/users route called");
      if (!isDbConfigured()) {
        return res.status(503).json({ error: "Database not configured" });
      }
      const { username, full_name, email, role, password } = req.body;
      const id = `user-${Date.now()}`;
      await query(
        `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL, email TEXT, role TEXT NOT NULL, password_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
      );
      const passwordHash = password ? `hash_${password}` : null;
      await query(
        `INSERT INTO users (id, username, full_name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, username, full_name, email || null, role, passwordHash],
      );
      res.status(201).json({ id, username, full_name, email, role });
    } catch (e: any) {
      console.error("POST /api/users error", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Production API (Neon) - load synchronously for serverless - MUST BE FIRST
  try {
    console.log("Loading production routes...");
    const { productionRouter } = await import("./routes/production");

    // Log all routes in productionRouter
    console.log("ProductionRouter stack:");
    (productionRouter as any).stack?.forEach((layer: any) => {
      if (layer.route) {
        console.log(`  ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
      }
    });

    app.use("/api", productionRouter);
    console.log("Production routes loaded successfully and mounted at /api");

    // Log all app routes after mounting
    console.log("All app routes:");
    (app as any)._router?.stack?.forEach((layer: any) => {
      if (layer.route) {
        console.log(`  ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
      } else if (layer.name === 'router') {
        console.log(`  Router mounted at: ${layer.regexp}`);
      }
    });
  } catch (e) {
    console.error("Production API not loaded:", e);
  }

  try {
    const { iotRouter } = await import("./routes/iot");
    app.use("/api", iotRouter);
  } catch (e) {
    console.warn("IoT API not loaded:", (e as any)?.message);
  }

  try {
    const { maintenanceRouter } = await import("./routes/maintenance");
    app.use("/api", maintenanceRouter);
  } catch (e) {
    console.warn("Maintenance API not loaded:", (e as any)?.message);
  }

  try {
    const { employeesRouter } = await import("./routes/employees");
    app.use("/api", employeesRouter);
  } catch (e) {
    console.warn("Employees API not loaded:", (e as any)?.message);
  }

  try {
    const { factoriesRouter } = await import("./routes/factories");
    app.use("/api", factoriesRouter);
  } catch (e) {
    console.warn("Factories API not loaded:", (e as any)?.message);
  }

  try {
    const { camerasRouter } = await import("./routes/cameras");
    app.use("/api", camerasRouter);
  } catch (e) {
    console.warn("Cameras API not loaded:", (e as any)?.message);
  }

  try {
    const { visionRouter } = await import("./routes/vision");
    app.use("/api", visionRouter);
  } catch (e) {
    console.warn("Vision API not loaded:", (e as any)?.message);
  }

  try {
    const { agentsRouter } = await import("./routes/agents");
    app.use("/api", agentsRouter);
  } catch (e) {
    console.warn("Agents API not loaded:", (e as any)?.message);
  }

  try {
    const { cameraOpsRouter } = await import("./routes/camera_ops");
    app.use("/api", cameraOpsRouter);
  } catch (e) {
    console.warn("Camera Ops API not loaded:", (e as any)?.message);
  }

  try {
    const module = await import("./routes/materials");
    app.use("/api/materials", module.default);
  } catch (e) {
    console.warn("Materials API not loaded:", (e as any)?.message);
  }

  // Catch-all for undefined API routes - return JSON 404 instead of HTML
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "4.0.0",
    });
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
