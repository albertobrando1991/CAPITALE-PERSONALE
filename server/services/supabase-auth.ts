/**
 * Supabase Auth Service
 * 
 * Handles JWT verification and user lookup for Supabase Auth integration.
 * This service works alongside the existing auth system for gradual migration.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";

// Initialize Supabase Admin Client (for server-side operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.warn("[SupabaseAuth] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured");
        return null;
    }

    if (!supabaseAdmin) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    return supabaseAdmin;
}

export function isSupabaseAuthConfigured(): boolean {
    return !!(supabaseUrl && supabaseServiceKey);
}

/**
 * Verify a Supabase JWT and get the user
 */
export async function verifySupabaseToken(token: string) {
    const admin = getSupabaseAdmin();
    if (!admin) {
        throw new Error("Supabase not configured");
    }

    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user) {
        throw new Error(error?.message || "Invalid token");
    }

    return user;
}

/**
 * Get or create app user from Supabase Auth user
 * This links Supabase Auth users to our existing users table
 */
export async function getOrCreateAppUser(supabaseUser: { id: string; email?: string; user_metadata?: any }) {
    console.log(`[getOrCreateAppUser] Looking up user for Supabase ID: ${supabaseUser.id}, Email: ${supabaseUser.email}`);

    // First, try to find by supabase_auth_id
    const existingByAuthId = await storage.getUserBySupabaseAuthId(supabaseUser.id);
    console.log(`[getOrCreateAppUser] getUserBySupabaseAuthId result:`, existingByAuthId ? `Found user ${existingByAuthId.id} (${existingByAuthId.email})` : 'NOT FOUND');

    if (existingByAuthId) {
        console.log(`[getOrCreateAppUser] Returning existing user by AuthId: ${existingByAuthId.id}`);
        return existingByAuthId;
    }

    // Try to find by email (for migrating existing users)
    if (supabaseUser.email) {
        const existingByEmail = await storage.getUserByEmail(supabaseUser.email);
        console.log(`[getOrCreateAppUser] getUserByEmail result:`, existingByEmail ? `Found user ${existingByEmail.id}` : 'NOT FOUND');

        if (existingByEmail) {
            // Link the existing user to Supabase Auth
            console.log(`[getOrCreateAppUser] Linking user ${existingByEmail.id} to Supabase Auth ID ${supabaseUser.id}`);
            await storage.linkUserToSupabaseAuth(existingByEmail.id, supabaseUser.id);
            return { ...existingByEmail, supabaseAuthId: supabaseUser.id };
        }
    }

    // Create new user
    console.log(`[getOrCreateAppUser] Creating NEW user with Supabase ID as primary ID`);
    const newUser = await storage.upsertUser({
        id: supabaseUser.id, // Use Supabase Auth ID as primary ID for new users
        email: supabaseUser.email || null,
        firstName: supabaseUser.user_metadata?.full_name?.split(' ')[0] ||
            supabaseUser.user_metadata?.first_name ||
            supabaseUser.email?.split('@')[0] || 'User',
        lastName: supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
            supabaseUser.user_metadata?.last_name || '',
        profileImageUrl: supabaseUser.user_metadata?.avatar_url ||
            supabaseUser.user_metadata?.picture ||
            `https://ui-avatars.com/api/?name=${supabaseUser.email}&background=random`,
        supabaseAuthId: supabaseUser.id,
    });
    console.log(`[getOrCreateAppUser] Created new user: ${newUser.id}`);

    return newUser;
}

/**
 * Middleware to verify Supabase JWT from Authorization header
 * Falls back to existing session auth if no Bearer token present
 */
export const verifySupabaseAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    console.log(`[SupabaseAuth] Verifying request: ${req.method} ${req.path}`);

    // Check for Bearer token
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log("[SupabaseAuth] Bearer token found (length:", token.length, ")");

        try {
            const supabaseUser = await verifySupabaseToken(token);
            console.log("[SupabaseAuth] Token verified for user:", supabaseUser.email);
            const appUser = await getOrCreateAppUser(supabaseUser);
            console.log("[SupabaseAuth] App user found/created:", appUser.id);

            // Set user on request for downstream handlers
            (req as any).user = {
                id: appUser.id,
                email: appUser.email,
                claims: {
                    sub: appUser.id,
                    email: appUser.email,
                    first_name: appUser.firstName,
                    last_name: appUser.lastName,
                    profile_image_url: appUser.profileImageUrl,
                },
                supabaseAuthId: appUser.supabaseAuthId,
            };

            return next();
        } catch (error: any) {
            console.error("[SupabaseAuth] Token verification failed:", error.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    } else {
        console.log("[SupabaseAuth] No/Invalid Auth Header:", authHeader ? "Present but not Bearer" : "Missing");
    }

    // No Bearer token - fall back to session auth (existing behavior)
    // This allows gradual migration
    if (req.isAuthenticated && req.isAuthenticated()) {
        console.log("[SupabaseAuth] Session auth active for user:", (req.user as any)?.id);
        return next();
    }

    console.warn("[SupabaseAuth] Request unauthorized - No valid token or session");
    return res.status(401).json({ message: "Unauthorized" });
};

/**
 * Combined auth middleware that accepts both Supabase JWT and session auth
 * Use this during the migration period
 */
export const isAuthenticatedHybrid: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Try Supabase JWT first
    if (authHeader?.startsWith('Bearer ')) {
        return verifySupabaseAuth(req, res, next);
    }

    // Fall back to existing session auth
    if (req.isAuthenticated && req.isAuthenticated()) {
        // console.log(`[AuthHybrid] Session authenticated: ${(req.user as any)?.id}`);
        return next();
    }

    console.warn(`[AuthHybrid] Unauthorized request to ${req.path}`);
    return res.status(401).json({ message: "Unauthorized" });
};
