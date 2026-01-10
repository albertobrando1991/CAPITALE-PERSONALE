import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface LoginFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  isRegister?: boolean;
}

export function LoginForm({ onLogin, isRegister = false }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Inserisci email e password");
      return;
    }

    setIsLoading(true);
    try {
      await onLogin?.(email, password);
    } catch {
      setError("Credenziali non valide");
    } finally {
      setIsLoading(false);
    }
  };

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
              placeholder={isRegister ? "Scegli una password" : "La tua password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>

          {!isRegister && (
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
