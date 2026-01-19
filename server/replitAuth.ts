import type * as OpenIDClient from "openid-client";
import type { Strategy as OIDCStrategy, VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { Pool } from "pg";
import { storage } from "./storage";
import { sendWelcomeEmail } from "./services/emailService";

const MemoryStore = createMemoryStore(session);

let openIdClientModule: typeof OpenIDClient | null = null;
let PassportStrategyCtor: any = null;

async function getOpenIdClient() {
  if (!openIdClientModule) {
    openIdClientModule = (await import("openid-client")) as typeof OpenIDClient;
  }
  return openIdClientModule;
}

async function getPassportStrategyCtor(): Promise<OIDCStrategy> {
  if (!PassportStrategyCtor) {
    const mod = await import("openid-client/passport");
    PassportStrategyCtor = mod;
  }
  return (PassportStrategyCtor as any).Strategy as OIDCStrategy;
}

const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) {
      return null;
    }
    const client = await getOpenIdClient();
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;

  let store: session.Store;
  if (process.env.DATABASE_URL) {
    const PgStore = connectPg(session);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
    store = new PgStore({
      pool,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    store = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error("SESSION_SECRET non configurato in produzione");
  }

  return session({
    secret: process.env.SESSION_SECRET || "local_dev_secret",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: any
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  const config = await getOidcConfig();

  if (!config) {
    // Local Dev Mode (or Vercel environment)
    console.log("REPL_ID not found, using local auth mode");

    app.post("/api/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        console.log(`[LOGIN] Tentativo di login per: ${email}`);

        if (!email) {
          console.log("[LOGIN] ERRORE: Email mancante");
          return res.status(400).json({ error: "Email required" });
        }

        // Check if user exists by email to reuse ID
        // This prevents unique constraint violation on email
        console.log("[LOGIN] Ricerca utente per email...");
        const existingUser = await storage.getUserByEmail(email);
        console.log(`[LOGIN] Utente trovato: ${existingUser ? 'Sì' : 'No'}`);

        const userId = existingUser?.id ?? email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        if (!existingUser) {
          console.log("[LOGIN] Creazione nuovo utente mock...");

          const mockUser = {
            id: userId,
            email: email,
            firstName: email.split('@')[0],
            lastName: "Dev",
            profileImageUrl: `https://ui-avatars.com/api/?name=${email}&background=random`
          };

          await storage.upsertUser(mockUser);
          console.log("[LOGIN] Utente creato");

          // Send Welcome Email
          sendWelcomeEmail(mockUser.email, mockUser.firstName).catch(err =>
            console.error("[LOGIN] Errore invio email benvenuto:", err)
          );
        }

        // Re-fetch user to get all fields
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(500).json({ error: "User not found after login" });
        }

        const sessionUser = {
          claims: {
            sub: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            profile_image_url: user.profileImageUrl
          },
          id: user.id,
          email: user.email,
          expires_at: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
        };

        console.log("[LOGIN] Inizio creazione sessione...");
        req.login(sessionUser, (err) => {
          if (err) {
            console.error("Login Error:", err);
            return res.status(500).json({ error: "Login failed" });
          }
          console.log("[LOGIN] Successo!");
          return res.json({ success: true, user: sessionUser });
        });
      } catch (err: any) {
        console.error("Login exception:", err);
        const details = process.env.NODE_ENV === "production" ? undefined : err.message;
        return res.status(500).json({
          error: "Internal login error",
          ...(details ? { details } : {}),
        });
      }
    });

    app.get("/api/login", (req, res) => {
      // If accessed via GET (e.g. browser bar), redirect to login page or just 404
      // But since we want to support 'AuthContext' which might still redirect, let's keep it?
      // No, we want to force form usage.
      res.redirect("/login");
    });

    app.post("/api/logout", (req, res) => {
      req.logout(() => {
        res.json({ success: true });
      });
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

    return;
  }

  // Replit Auth Mode
  const verify: VerifyFunction = async (
    tokens: any,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user: any = {};
      const claims = tokens.claims();

      updateUserSession(user, tokens);

      // Check if new user
      const existingUser = await storage.getUser(claims.sub);

      await upsertUser(claims);
      verified(null, user);

      // Send welcome email if new
      if (!existingUser && claims.email) {
        console.log(`[AUTH] Nuovo utente registrato: ${claims.email}. Invio email benvenuto.`);
        sendWelcomeEmail(claims.email, claims.given_name || claims.first_name || "Utente").catch(console.error);
      }
    } catch (error) {
      console.error("[AUTH] Verify error:", error);
      verified(error as Error, undefined);
    }
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = async (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const Strategy = await getPassportStrategyCtor();
      const strategy = new Strategy(
        {
          name: strategyName,
          config: config!,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy as any);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", async (req, res, next) => {
    await ensureStrategy(req.hostname);
    return passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    await ensureStrategy(req.hostname);
    return passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    const client = await getOpenIdClient();
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config!, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // If local dev (no config), just check authentication
  if (!process.env.REPL_ID) {
    return next();
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};
