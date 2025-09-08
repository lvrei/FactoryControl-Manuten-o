import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { handleDemo } from "./routes/demo";
import { productionRouter } from "./routes/production";

export function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: process.env.NODE_ENV === 'development'
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Permitir scripts inline em dev
          : ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"], // Permitir WebSocket para hot reload
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] // Substituir por domínio real em produção
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP por janela
    message: {
      success: false,
      message: 'Muitas tentativas. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Production API (Neon)
  app.use('/api', productionRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "4.0.0"
    });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('❌ Server Error:', err);
    
    res.status(err.status || 500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  return app;
}
