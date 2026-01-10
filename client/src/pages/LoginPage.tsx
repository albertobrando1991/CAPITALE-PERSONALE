import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function LoginPage() {
  const { login } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    setLocation("/dashboard");
  };

  const isRegister = location === "/register";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm onLogin={handleLogin} isRegister={isRegister} />
    </div>
  );
}
