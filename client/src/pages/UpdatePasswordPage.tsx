import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { updatePassword, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [location, setLocation] = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        // Check if we have a session (user clicked email link)
        const checkSession = async () => {
            const { data } = await supabase!.auth.getSession();
            if (!data.session) {
                // If no session, they might have lost the session or link expired
                // But usually the link contains the token which is handled by Supabase client auto-detect
            }
        }
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                title: "Errore",
                description: "Le password non coincidono.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Errore",
                description: "La password deve essere di almeno 6 caratteri.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await updatePassword(password);
            toast({
                title: "Password aggiornata",
                description: "Ora puoi accedere con la nuova password.",
            });
            setLocation("/login");
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile aggiornare la password.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Imposta Nuova Password</CardTitle>
                    <CardDescription>
                        Inserisci la tua nuova password sicura.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nuova Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Conferma Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Aggiornamento in corso...
                                </>
                            ) : (
                                "Aggiorna Password"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
