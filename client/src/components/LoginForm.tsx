import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Loader2 } from "lucide-react";

interface LoginFormProps {
  onLogin?: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onLogin }: LoginFormProps) {
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
        <CardTitle className="text-2xl">Protocollo C.P.A. 2.0</CardTitle>
        <CardDescription>
          Accedi per continuare la tua preparazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
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
              placeholder="La tua password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>

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

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              "Accedi"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Non hai un account?{" "}
            <button
              type="button"
              className="text-primary font-medium"
              onClick={() => console.log("Register clicked")}
              data-testid="link-register"
            >
              Registrati
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
