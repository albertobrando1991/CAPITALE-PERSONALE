import { createContext, useContext, useState, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  level: number;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // todo: remove mock functionality
  const [user, setUser] = useState<User | null>({
    id: "1",
    email: "marco.rossi@cpa.it",
    name: "Marco Rossi",
    level: 25,
    role: "user",
  });

  const login = async (email: string, password: string) => {
    console.log("Login attempt:", email, password);
    // todo: remove mock functionality
    setUser({
      id: "1",
      email,
      name: "Marco Rossi",
      level: 25,
      role: "user",
    });
  };

  const logout = () => {
    setUser(null);
    console.log("User logged out");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
