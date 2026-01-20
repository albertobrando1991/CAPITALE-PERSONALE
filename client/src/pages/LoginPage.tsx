import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setLocation("/dashboard");
  };

  const handleRegister = async (email: string, password: string) => {
    await register(email, password);
    // User will be redirected after email confirmation
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    // OAuth redirects to Google, then back to /auth/callback
  };

  const isRegister = location === "/register";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleLogin}
        isRegister={isRegister}
      />
    </div>
  );
}
