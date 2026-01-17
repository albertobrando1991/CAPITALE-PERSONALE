import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { storage } from "./storage";

const MemoryStore = createMemoryStore(session);

const getOidcConfig = memoize(
  async () => {
    if (!process.env.REPL_ID) {
      return null;
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  let store;
  // FORCE MEMORY STORE FOR STABILITY
  // The connect-pg-simple store is causing crashes.
  // if (process.env.DATABASE_URL) {
  //   const pgStore = connectPg(session);
  //   store = new pgStore({
  //     conString: process.env.DATABASE_URL,
  //     createTableIfMissing: true, // changed to true for local convenience
  //     ttl: sessionTtl,
  //     tableName: "sessions",
  //   });
  // } else {
    store = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  // }

  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn("⚠️ WARNING: SESSION_SECRET is not set. Using default insecure secret. This is dangerous for production!");
  }

  return session({
    secret: process.env.SESSION_SECRET || "local_dev_secret",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // false for local dev usually
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
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
        return res.status(500).json({ 
            error: "Internal login error",
            details: err.message,
            stack: err.stack 
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
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config: config!,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
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

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    if (!config) return next(); // Should not happen if REPL_ID is set
    
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
