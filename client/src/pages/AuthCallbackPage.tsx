/**
 * OAuth Callback Page
 * 
 * Handles the redirect from OAuth providers (Google).
 * Supabase automatically handles the token exchange.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const [, setLocation] = useLocation();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            if (!supabase || !isSupabaseConfigured()) {
                setError("Supabase non configurato");
                return;
            }

            // Get the session from the URL hash (Supabase puts tokens there after OAuth)
            const { error } = await supabase.auth.getSession();

            if (error) {
                console.error("[AuthCallback] Error:", error);
                setError(error.message);
                return;
            }

            // Success - redirect to dashboard
            setLocation("/dashboard");
        };

        handleCallback();
    }, [setLocation]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <a href="/login" className="text-primary hover:underline">
                        Torna al login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Autenticazione in corso...</p>
            </div>
        </div>
    );
}
