import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";

// Google Icon SVG
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface LoginFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onRegister?: (email: string, password: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  isRegister?: boolean;
}

export function LoginForm({ onLogin, onRegister, onGoogleLogin, isRegister = false }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Inserisci email e password");
      return;
    }

    if (isRegister && password.length < 6) {
      setError("La password deve avere almeno 6 caratteri");
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister && onRegister) {
        await onRegister(email, password);
        setSuccess("Registrazione completata! Controlla la tua email per confermare l'account.");
      } else if (onLogin) {
        await onLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Credenziali non valide");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!onGoogleLogin) return;

    setIsGoogleLoading(true);
    setError("");
    try {
      await onGoogleLogin();
    } catch (err: any) {
      setError(err.message || "Errore durante il login con Google");
      setIsGoogleLoading(false);
    }
    // Note: Google OAuth redirects, so loading state persists
  };

  const showGoogleButton = isSupabaseConfigured() && onGoogleLogin;

  return (
    <Card className="w-full max-w-md" data-testid="login-form">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">
          {isRegister ? "Crea il tuo Account" : "Protocollo C.P.A. 2.0"}
        </CardTitle>
        <CardDescription>
          {isRegister
            ? "Inizia il tuo percorso di preparazione scientifica"
            : "Accedi per continuare la tua preparazione"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg">
              {success}
            </div>
          )}

          {/* Google Login Button */}
          {showGoogleButton && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                data-testid="button-google-login"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="ml-2">Continua con Google</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    oppure
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={isRegister ? "Scegli una password (min. 6 caratteri)" : "La tua password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>

          {!isRegister && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  data-testid="checkbox-remember"
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Ricordami
                </Label>
              </div>
              <Link href="/forgot-password">
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Password dimenticata?
                </span>
              </Link>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isRegister ? "Registrazione..." : "Accesso in corso..."}
              </>
            ) : (
              isRegister ? "Registrati" : "Accedi"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? "Hai già un account? " : "Non hai un account? "}
            <Link href={isRegister ? "/login" : "/register"}>
              <span className="text-primary font-medium cursor-pointer hover:underline">
                {isRegister ? "Accedi" : "Registrati"}
              </span>
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
