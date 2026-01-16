import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, UserRole } from '@/contexts/AdminContext';
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from '@tanstack/react-query';

interface AdminRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AdminRoute({ children, requiredRole = UserRole.STAFF }: AdminRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { role } = useAdmin();
  const queryClient = useQueryClient();

  // Hierarchy check
  const roleHierarchy = [UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN];
  const userRoleIndex = roleHierarchy.indexOf(role || UserRole.USER);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  console.log("AdminRoute Debug:", {
    isAuthenticated,
    userRole: role,
    userRoleIndex,
    requiredRole,
    requiredRoleIndex,
    hasAccess: userRoleIndex >= requiredRoleIndex
  });

  // Force re-check permissions on mount if denied
  useEffect(() => {
    if (isAuthenticated && userRoleIndex < requiredRoleIndex) {
      console.log("Re-checking permissions...");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [isAuthenticated, userRoleIndex, requiredRoleIndex, queryClient]);

  if (authLoading || (isAuthenticated && userRoleIndex < requiredRoleIndex && queryClient.getQueryState(["/api/auth/user"])?.isFetching)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifica permessi in corso...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // userRoleIndex already calculated above

  if (userRoleIndex < requiredRoleIndex) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold text-destructive">Accesso Negato</h1>
        <p className="text-muted-foreground">
          Non hai i permessi necessari per accedere a questa pagina.
        </p>
        <div className="text-sm bg-muted p-4 rounded-md font-mono text-left">
          <p>Tuo ruolo: {role || 'Nessuno'}</p>
          <p>Ruolo richiesto: {requiredRole}</p>
          <p className="mt-2 text-xs text-muted-foreground">User Index: {userRoleIndex} vs Required Index: {requiredRoleIndex}</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }).then(() => window.location.reload())}>
          Riprova Accesso
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Torna alla Dashboard
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
