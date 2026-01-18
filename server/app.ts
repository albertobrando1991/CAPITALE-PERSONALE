import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import mnemotecnicheRoutes from './routes-mnemotecniche';
import benessereRoutes from './routes-benessere';
import fase3Routes from './routes-fase3';
import { serveStatic } from "./static";
import { createServer } from "http";
import { isAdmin } from './utils/auth-helpers';

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Rate Limiting Configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});

// Specific AI Rate Limiter (Stricter)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests, please try again in a minute" }
});

// Apply rate limiter to all API routes
app.use("/api", limiter);
// Apply stricter limiter to AI routes
app.use("/api/ai", aiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasReplId: !!process.env.REPL_ID,
    },
  });
});

// 🔧 MOCK AUTH per development (NON deve mai essere attivo in produzione)
if (process.env.NODE_ENV === "development") {
  app.use(async (req, res, next) => {
    // Mock user per development
    if (!(req as any).user) {
      // Simula admin per test
      const mockEmail = "albertobrando1991@gmail.com";
      
      (req as any).user = {
        id: "admin-user-123",
        email: mockEmail,
        nome: "Alberto Brando (Admin)",
        ruolo: isAdmin(mockEmail) ? "admin" : "utente",
        claims: { sub: "admin-user-123" }
      };
      
      // Assicuriamoci che l'utente esista nel DB per evitare errori FK
      try {
        const { storage } = await import("./storage");
        const existingUser = await storage.getUser("admin-user-123");
        if (!existingUser) {
           console.log("👤 Creating default admin user for development...");
           await storage.upsertUser({
             id: "admin-user-123",
             email: mockEmail,
             firstName: "Alberto",
             lastName: "Brando"
           });
        }
      } catch (err) {
        console.error("Error ensuring default user exists:", err);
      }
    }
    next();
  });
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const jsonString = JSON.stringify(capturedJsonResponse);
        if (jsonString.length > 2000) {
           logLine += ` :: ${jsonString.substring(0, 2000)}... (truncated)`;
        } else {
           logLine += ` :: ${jsonString}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

// Initialization function to be called before starting server or handling requests
let initialized = false;
export async function initializeApp() {
  if (initialized) return;
  
  await registerRoutes(httpServer, app);

  // Register Mnemotecniche Routes
  app.use('/api/mnemotecniche', mnemotecnicheRoutes);

  // Register Benessere Routes
  console.log('Mounting /api/benessere routes...');
  app.use('/api/benessere', benessereRoutes);

  // Register Fase 3 Routes
  console.log('Mounting /api/fase3 routes...');
  app.use('/api/fase3', fase3Routes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    return;
  });

  if (process.env.NODE_ENV === "production") {
    // Only serve static files if NOT in Vercel environment
    // Vercel handles static files via rewrites/output directory
    if (!process.env.VERCEL) {
      serveStatic(app);
    }
  } else {
    // Only import vite in dev
    try {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
    } catch (e) {
        console.log("Vite setup skipped (not in dev environment or module missing)");
    }
  }
  
  initialized = true;
}

export { app, httpServer };
