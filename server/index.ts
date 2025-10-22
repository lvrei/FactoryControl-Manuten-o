import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
// Lazy loaded below to avoid ESM/CJS interop issues
import { isDbConfigured, query } from "./db";
import { Sentry, initSentryNode } from "./sentry";

export function createServer() {
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

  // Production API (Neon) - dynamic and optional
  if (isDbConfigured()) {
    try {
      import("./routes/production")
        .then(({ productionRouter }) => {
          app.use("/api", productionRouter);
        })
        .catch((e) =>
          console.warn("Production API not loaded:", (e as any)?.message),
        );

      import("./routes/iot")
        .then(({ iotRouter }) => {
          app.use("/api", iotRouter);
        })
        .catch((e) => console.warn("IoT API not loaded:", (e as any)?.message));

      import("./routes/maintenance")
        .then(({ maintenanceRouter }) => {
          app.use("/api", maintenanceRouter);
        })
        .catch((e) =>
          console.warn("Maintenance API not loaded:", (e as any)?.message),
        );

      import("./routes/employees")
        .then(({ employeesRouter }) => {
          app.use("/api", employeesRouter);
        })
        .catch((e) =>
          console.warn("Employees API not loaded:", (e as any)?.message),
        );

      import("./routes/factories")
        .then(({ factoriesRouter }) => {
          app.use("/api", factoriesRouter);
        })
        .catch((e) =>
          console.warn("Factories API not loaded:", (e as any)?.message),
        );

      import("./routes/cameras")
        .then(({ camerasRouter }) => {
          app.use("/api", camerasRouter);
        })
        .catch((e) =>
          console.warn("Cameras API not loaded:", (e as any)?.message),
        );

      import("./routes/vision")
        .then(({ visionRouter }) => {
          app.use("/api", visionRouter);
        })
        .catch((e) =>
          console.warn("Vision API not loaded:", (e as any)?.message),
        );

      import("./routes/agents")
        .then(({ agentsRouter }) => {
          app.use("/api", agentsRouter);
        })
        .catch((e) =>
          console.warn("Agents API not loaded:", (e as any)?.message),
        );

      import("./routes/camera_ops")
        .then(({ cameraOpsRouter }) => {
          app.use("/api", cameraOpsRouter);
        })
        .catch((e) =>
          console.warn("Camera Ops API not loaded:", (e as any)?.message),
        );

      import("./routes/materials")
        .then((module) => {
          app.use("/api/materials", module.default);
        })
        .catch((e) =>
          console.warn("Materials API not loaded:", (e as any)?.message),
        );
    } catch (e) {
      console.warn("APIs not loaded:", (e as any)?.message);
    }
  } else {
    console.warn("DATABASE_URL não definido. API de produção desativada.");
    import("./routes/iot")
      .then(({ iotRouter }) => {
        app.use("/api", iotRouter);
      })
      .catch((e) => console.warn("IoT API not loaded:", (e as any)?.message));
    import("./routes/maintenance")
      .then(({ maintenanceRouter }) => {
        app.use("/api", maintenanceRouter);
      })
      .catch((e) =>
        console.warn("Maintenance API not loaded:", (e as any)?.message),
      );
    import("./routes/employees")
      .then(({ employeesRouter }) => {
        app.use("/api", employeesRouter);
      })
      .catch((e) =>
        console.warn("Employees API not loaded:", (e as any)?.message),
      );
    import("./routes/factories")
      .then(({ factoriesRouter }) => {
        app.use("/api", factoriesRouter);
      })
      .catch((e) =>
        console.warn("Factories API not loaded:", (e as any)?.message),
      );
    import("./routes/cameras")
      .then(({ camerasRouter }) => {
        app.use("/api", camerasRouter);
      })
      .catch((e) =>
        console.warn("Cameras API not loaded:", (e as any)?.message),
      );
    import("./routes/vision")
      .then(({ visionRouter }) => {
        app.use("/api", visionRouter);
      })
      .catch((e) =>
        console.warn("Vision API not loaded:", (e as any)?.message),
      );
    import("./routes/agents")
      .then(({ agentsRouter }) => {
        app.use("/api", agentsRouter);
      })
      .catch((e) =>
        console.warn("Agents API not loaded:", (e as any)?.message),
      );
    import("./routes/camera_ops")
      .then(({ cameraOpsRouter }) => {
        app.use("/api", cameraOpsRouter);
      })
      .catch((e) =>
        console.warn("Camera Ops API not loaded:", (e as any)?.message),
      );
  }

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
