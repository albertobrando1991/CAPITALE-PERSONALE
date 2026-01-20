/**
 * AuthContext - Hybrid Authentication Provider
 * 
 * Supports both:
 * - Supabase Auth (Email/Password + Google OAuth)
 * - Legacy session auth (for gradual migration)
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut as supabaseSignOut,
  getSession,
  type Session,
  type User as SupabaseUser
} from "@/lib/supabase";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  name: string;
  level: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  tier?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store for access token (used by apiRequest)
let currentAccessToken: string | null = null;

export function getStoredAccessToken(): string | null {
  return currentAccessToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(true);

  // Initialize Supabase auth listener
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) {
      setIsSupabaseLoading(false);
      return;
    }

    // Get initial session
    getSession().then((session) => {
      console.log("[AuthProvider] Initial session load:", session ? "FOUND" : "NULL");
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      currentAccessToken = session?.access_token ?? null;
      if (session?.access_token) {
        console.log("[AuthProvider] Access token set.");
      } else {
        console.warn("[AuthProvider] No access token in initial session.");
      }
      setIsSupabaseLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AuthProvider] Auth change event: ${_event}`);
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      currentAccessToken = session?.access_token ?? null;

      // Invalidate user query on auth change
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Fetch user data from backend (Source of Truth for level, isAdmin, etc.)
  const { data: dbUser, isLoading: dbUserLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    // Fetch if legacy mode OR if we have a Supabase token
    enabled: !isSupabaseConfigured() || (!!supabaseSession && !!currentAccessToken),
  });

  // Determine which auth system is active
  const isSupabaseAuth = isSupabaseConfigured() && !!supabaseSession;

  // Loading state
  const isLoading = isSupabaseLoading || dbUserLoading;

  // Use the DB user as the primary user object (it contains level, isAdmin, etc.)
  // Fallback to Supabase metadata only if DB fetch fails but session exists (rare edge case)
  const user = dbUser || (supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    firstName: supabaseUser.user_metadata?.first_name || null,
    lastName: supabaseUser.user_metadata?.last_name || null,
    profileImageUrl: supabaseUser.user_metadata?.avatar_url || null,
    name: supabaseUser.user_metadata?.full_name || 'Utente',
    level: 0, // Fallback level
  } : null);
  const isAuthenticated = !!user;

  // Login with email/password
  const login = async (email: string, password: string) => {
    if (isSupabaseConfigured()) {
      try {
        await signInWithEmail(email, password);
        // Auth state listener will handle the rest
      } catch (error: any) {
        // If user doesn't exist in Supabase, try legacy login
        if (error.message?.includes('Invalid login credentials')) {
          console.log('[Auth] Supabase login failed, trying legacy...');
          await legacyLogin(email, password);
        } else {
          throw error;
        }
      }
    } else {
      await legacyLogin(email, password);
    }
  };

  // Legacy login for backwards compatibility
  const legacyLogin = async (email: string, password?: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let message = `Login failed (${res.status})`;
      try {
        const data = await res.json();
        message = data?.error || data?.message || message;
      } catch { }
      throw new Error(message);
    }

    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  // Register new user
  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Registration requires Supabase Auth");
    }

    await signUpWithEmail(email, password, { firstName, lastName });
    // User will receive confirmation email
  };

  // Login with Google
  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      throw new Error("Google login requires Supabase Auth");
    }

    await signInWithGoogle();
    // Redirects to Google, then back to /auth/callback
  };

  // Logout
  const logout = async () => {
    if (isSupabaseAuth) {
      await supabaseSignOut();
    }

    // Also clear legacy session
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch { }

    currentAccessToken = null;
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.href = "/";
  };

  // Get access token for API requests
  const getAccessToken = async (): Promise<string | null> => {
    if (isSupabaseAuth && supabaseSession) {
      return supabaseSession.access_token;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isSupabaseAuth,
        login,
        register,
        loginWithGoogle,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
