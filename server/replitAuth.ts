import type { Express } from "express";

// Re-export isAuthenticated from Supabase Auth for compatibility with existing routes
// This ensures that all routes protected by 'isAuthenticated' now use Supabase JWT/Session verification
export { isAuthenticatedHybrid as isAuthenticated } from "./services/supabase-auth";

/**
 * Legacy setupAuth function.
 * Previously configured Passport/Express-Session.
 * Now a no-op since Supabase Auth interacts directly via middleware.
 */
export async function setupAuth(app: Express) {
  // No-op: Auth is now handled by Supabase
  console.log("[Auth] Legacy setupAuth called - skipping (Supabase Auth active)");
}
