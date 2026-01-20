
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteAccount = async () => {
        if (confirmText !== "ELIMINA") {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch("/api/auth/delete", {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("supabase.auth.token")}` // Ensure token is sent if needed for hybrid middleware
                }
            });

            if (!response.ok) {
                throw new Error("Failed to delete account");
            }

            toast({
                title: "Account eliminato",
                description: "Il tuo account e tutti i dati sono stati rimossi con successo.",
            });

            // Navigate home or refresh triggers logout in configured auth systems
            // But explicit logout clears frontend state immediately
            await logout();
            window.location.href = "/";

        } catch (error) {
            console.error("Deletion error:", error);
            toast({
                title: "Errore",
                description: "Non è stato possibile eliminare l'account. Riprova più tardi.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
            onOpenChange(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Il mio Profilo</DialogTitle>
                    <DialogDescription>
                        Gestisci le impostazioni del tuo account.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.profileImageUrl || ""} />
                            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-medium text-lg">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.isAdmin && <span className="text-xs font-bold text-primary">ADMIN</span>}
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <h4 className="text-sm font-medium mb-3 text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Zona Pericolo
                        </h4>

                        {!showDeleteConfirm ? (
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina Account
                            </Button>
                        ) : (
                            <div className="space-y-3 bg-destructive/10 p-3 rounded-md border border-destructive/20">
                                <p className="text-sm text-destructive font-semibold">
                                    Questa azione è irreversibile.
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Scrivi <strong>ELIMINA</strong> per confermare la cancellazione.
                                </p>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="ELIMINA"
                                    className="bg-background"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Annulla
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="flex-1"
                                        disabled={confirmText !== "ELIMINA" || isDeleting}
                                        onClick={handleDeleteAccount}
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
