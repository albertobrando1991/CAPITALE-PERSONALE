import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import { resetPassword } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        try {
            await resetPassword(email);
            setIsSubmitted(true);
            const redirectUrl = `${window.location.origin}/auth/reset-password`;
            toast({
                title: "Email inviata",
                description: `DEBUG: Redirect richiesto a: ${redirectUrl}`,
            });
        } catch (error: any) {
            toast({
                title: "Errore",
                description: error.message || "Impossibile inviare l'email di reset.",
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
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Recupera Password</CardTitle>
                    <CardDescription>
                        Inserisci la tua email per ricevere le istruzioni di ripristino.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSubmitted ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm">
                                Abbiamo inviato un link di reset a <strong>{email}</strong>.
                                Controlla anche nello spam.
                            </div>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/login">Torna al Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@esempio.it"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Invio in corso...
                                    </>
                                ) : (
                                    "Invia Link di Reset"
                                )}
                            </Button>

                            <div className="text-center">
                                <Link href="/login">
                                    <span className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center cursor-pointer">
                                        <ArrowLeft className="h-4 w-4 mr-1" /> Torna al Login
                                    </span>
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
