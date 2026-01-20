/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for frontend use.
 * It handles authentication, session management, and provides
 * access to Supabase Auth features.
 */

import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[Supabase] Missing environment variables. Auth features will be disabled.',
        'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
}

// Create Supabase client
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true, // For OAuth redirects
        },
    })
    : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return supabase !== null;
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Get the access token for API requests
 */
export async function getAccessToken(): Promise<string | null> {
    const session = await getSession();
    return session?.access_token ?? null;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, metadata?: { firstName?: string; lastName?: string }) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: metadata?.firstName,
                last_name: metadata?.lastName,
            },
        },
    });

    if (error) throw error;
    return data;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    if (error) throw error;
    return data;
}

/**
 * Sign out
 */
export async function signOut() {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Request password reset email
 */
export async function resetPassword(email: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
}

/**
 * Update password (after reset)
 */
export async function updatePassword(newPassword: string) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) throw error;
}

export type { Session, User };
