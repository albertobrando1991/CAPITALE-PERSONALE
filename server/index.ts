import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

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

import { isAdmin } from './utils/auth-helpers';

// 🔧 MOCK AUTH per development (RIMUOVERE IN PRODUCTION)
// if (process.env.NODE_ENV !== 'production') {
//   app.use(async (req, res, next) => {
//     // Mock user per development
//     if (!(req as any).user) {
//       // Simula admin per test
//       const mockEmail = 'albertobrando1991@gmail.com'; // Admin
//       // const mockEmail = 'test-free@trae-ai.com'; // Free User Test
//       
//       (req as any).user = {
//         id: 'admin-user-123',
//         email: mockEmail,
//         nome: 'Alberto Brando (Admin)',
//         ruolo: isAdmin(mockEmail) ? 'admin' : 'utente',
//         claims: { sub: 'admin-user-123' }
//       };
//       
//       // Assicuriamoci che l'utente esista nel DB per evitare errori FK
//       try {
//         const { storage } = await import("./storage");
//         const existingUser = await storage.getUser('admin-user-123');
//         if (!existingUser) {
//            console.log('👤 Creating default admin user for development...');
//            await storage.upsertUser({
//              id: 'admin-user-123',
//              email: mockEmail,
//              firstName: 'Alberto',
//              lastName: 'Brando'
//            });
//         }
//       } catch (err) {
//         console.error('Error ensuring default user exists:', err);
//       }
//     }
//     next();
//   });
//   console.log('🔓 Mock authentication enabled (development mode)');
//   console.log('👤 Mock user:', 'albertobrando1991@gmail.com (ADMIN)');
// }

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
        // Evita di loggare JSON troppo grandi (es. PDF base64)
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

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Force restart log
  log("Server restarting...");
  
  httpServer.listen(
    {
      port,
      host: process.env.HOST || "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
