import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const transformedUser = user ? {
    ...user,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Utente",
    level: 0,
  } : null;

  const login = async (email?: string, password?: string) => {
    // If running locally with the new POST endpoint
    if (email) {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        
        if (!res.ok) {
          let message = `Login failed (${res.status})`;
          try {
            const data = await res.json();
            message = data?.error || data?.message || message;
          } catch {
            try {
              const text = await res.text();
              if (text) message = text;
            } catch {}
          }
          throw new Error(message);
        }
        
        // Invalidate query to refetch user
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // Optional: reload if needed, but react-query should handle it
        // window.location.href = "/dashboard"; 
      } catch (e) {
        console.error("Login error:", e);
        throw e;
      }
    } else {
      // Fallback for OAuth redirect if no credentials provided
      window.location.href = "/api/login";
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    } catch (e) {
       // Fallback
       window.location.href = "/api/logout";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: transformedUser,
        isAuthenticated: !!user && !error,
        isLoading,
        login,
        logout,
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
