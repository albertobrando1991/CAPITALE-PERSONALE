import type { Express } from "express";
import { storage } from "./storage";
import { sendWelcomeEmail } from "./services/emailService";

// Re-export isAuthenticated from Supabase Auth for compatibility with existing routes
// This ensures that all routes protected by 'isAuthenticated' now use Supabase JWT/Session verification
export { isAuthenticatedHybrid as isAuthenticated } from "./services/supabase-auth";

/**
 * setupAuth - Configura le route di autenticazione legacy
 * 
 * Questo supporta il login via email senza Supabase per scenari di fallback.
 * L'autenticazione principale è gestita da Supabase Auth.
 */
export async function setupAuth(app: Express) {
  console.log("[Auth] Setting up auth routes (Supabase primary, legacy fallback)");

  // POST /api/login - Legacy email login fallback
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log(`[LOGIN] Tentativo di login per: ${email}`);

      if (!email) {
        console.log("[LOGIN] ERRORE: Email mancante");
        return res.status(400).json({ error: "Email required" });
      }

      // Check if user exists by email
      console.log("[LOGIN] Ricerca utente per email...");
      const existingUser = await storage.getUserByEmail(email);
      console.log(`[LOGIN] Utente trovato: ${existingUser ? 'Sì' : 'No'} (ID: ${existingUser?.id})`);

      let userId = existingUser?.id;

      if (!existingUser) {
        console.log("[LOGIN] Utente non trovato. Creazione nuovo utente...");
        userId = email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        console.log(`[LOGIN] Nuovo ID generato: ${userId}`);

        const newUser = {
          id: userId,
          email: email,
          firstName: email.split('@')[0],
          lastName: "",
          profileImageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`
        };

        await storage.upsertUser(newUser);
        console.log("[LOGIN] Utente creato nel DB");

        // Send Welcome Email (async, non-blocking)
        sendWelcomeEmail(newUser.email, newUser.firstName).catch(err =>
          console.error("[LOGIN] Errore invio email benvenuto:", err)
        );
      }

      // Fetch user to get all fields
      const user = await storage.getUser(userId);
      if (!user) {
        console.error("[LOGIN] ERRORE: Utente non trovato dopo creazione/lookup");
        return res.status(500).json({ error: "User not found after login attempt" });
      }

      // Return user info (session is managed by Supabase on frontend)
      // This endpoint is mainly for legacy/fallback scenarios
      console.log("[LOGIN] Successo! Restituisco dati utente.");
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          level: user.level || 0,
          isAdmin: user.isAdmin || false,
        }
      });

    } catch (err: any) {
      console.error("[LOGIN] Exception:", err);
      return res.status(500).json({
        error: "Internal login error",
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  });

  // GET /api/login - Redirect to login page
  app.get("/api/login", (req, res) => {
    res.redirect("/login");
  });

  // POST /api/logout - Clear any server-side state (if any)
  app.post("/api/logout", (req, res) => {
    // With Supabase, logout is handled client-side
    // This endpoint exists for legacy compatibility
    console.log("[LOGOUT] Logout request received");
    res.json({ success: true });
  });

  // GET /api/logout - Redirect version
  app.get("/api/logout", (req, res) => {
    console.log("[LOGOUT] GET logout, redirecting to home");
    res.redirect("/");
  });

  console.log("[Auth] Auth routes configured");
}
