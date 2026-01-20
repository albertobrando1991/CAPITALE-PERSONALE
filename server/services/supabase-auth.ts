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
    // First, try to find by supabase_auth_id
    const existingByAuthId = await storage.getUserBySupabaseAuthId(supabaseUser.id);
    if (existingByAuthId) {
        return existingByAuthId;
    }

    // Try to find by email (for migrating existing users)
    if (supabaseUser.email) {
        const existingByEmail = await storage.getUserByEmail(supabaseUser.email);
        if (existingByEmail) {
            // Link the existing user to Supabase Auth
            await storage.linkUserToSupabaseAuth(existingByEmail.id, supabaseUser.id);
            return { ...existingByEmail, supabaseAuthId: supabaseUser.id };
        }
    }

    // Create new user
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

    return newUser;
}

/**
 * Middleware to verify Supabase JWT from Authorization header
 * Falls back to existing session auth if no Bearer token present
 */
export const verifySupabaseAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Check for Bearer token
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            const supabaseUser = await verifySupabaseToken(token);
            const appUser = await getOrCreateAppUser(supabaseUser);

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
    }

    // No Bearer token - fall back to session auth (existing behavior)
    // This allows gradual migration
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

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
        return next();
    }

    return res.status(401).json({ message: "Unauthorized" });
};
