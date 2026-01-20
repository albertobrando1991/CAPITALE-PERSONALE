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
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      currentAccessToken = session?.access_token ?? null;
      setIsSupabaseLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      currentAccessToken = session?.access_token ?? null;

      // Invalidate user query on auth change
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Legacy session auth fallback
  const { data: legacyUser, isLoading: legacyLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !isSupabaseConfigured() || !supabaseSession, // Only fetch if no Supabase session
  });

  // Determine which auth system is active and get the user
  const isSupabaseAuth = isSupabaseConfigured() && !!supabaseSession;
  const isLoading = isSupabaseLoading || (legacyLoading && !isSupabaseAuth);

  // Transform Supabase user to app user format
  const transformedSupabaseUser: User | null = supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    firstName: supabaseUser.user_metadata?.first_name ||
      supabaseUser.user_metadata?.full_name?.split(' ')[0] ||
      supabaseUser.email?.split('@')[0] || null,
    lastName: supabaseUser.user_metadata?.last_name ||
      supabaseUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
    profileImageUrl: supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture || null,
    name: supabaseUser.user_metadata?.full_name ||
      [supabaseUser.user_metadata?.first_name, supabaseUser.user_metadata?.last_name].filter(Boolean).join(' ') ||
      supabaseUser.email?.split('@')[0] ||
      'Utente',
    level: 0,
  } : null;

  // Transform legacy user
  const transformedLegacyUser = legacyUser ? {
    ...legacyUser,
    name: [legacyUser.firstName, legacyUser.lastName].filter(Boolean).join(" ") || legacyUser.email || "Utente",
    level: 0,
  } : null;

  // Use Supabase user if available, otherwise legacy
  const user = isSupabaseAuth ? transformedSupabaseUser : transformedLegacyUser;
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
