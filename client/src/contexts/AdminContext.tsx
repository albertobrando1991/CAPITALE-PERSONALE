import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAuth } from "./AuthContext";

// Definizioni di base per i ruoli e permessi (allineati con il backend)
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  USER = 'user'
}

export enum Permission {
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',
  VIEW_CONTENT = 'view_content',
  CREATE_CONTENT = 'create_content',
  EDIT_CONTENT = 'edit_content',
  DELETE_CONTENT = 'delete_content',
  PUBLISH_CONTENT = 'publish_content',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
}

// Mappa dei permessi predefiniti per ruolo (fallback client-side)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.VIEW_USERS, Permission.EDIT_USERS,
    Permission.VIEW_CONTENT, Permission.CREATE_CONTENT, Permission.EDIT_CONTENT, Permission.DELETE_CONTENT, Permission.PUBLISH_CONTENT,
    Permission.VIEW_ANALYTICS, Permission.MANAGE_SETTINGS
  ],
  [UserRole.STAFF]: [
    Permission.VIEW_USERS,
    Permission.VIEW_CONTENT, Permission.CREATE_CONTENT, Permission.EDIT_CONTENT,
    Permission.VIEW_ANALYTICS
  ],
  [UserRole.USER]: []
};

interface AdminContextType {
  role: string;
  hasPermission: (permission: string) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  // Safe use of useAuth?
  // AdminProvider is used inside AuthProvider in App.tsx
  const auth = useAuth();
  const user = auth?.user;

  const role = user?.role || UserRole.USER;

  const value = useMemo(() => {
    const permissions = ROLE_PERMISSIONS[role] || [];

    return {
      role,
      hasPermission: (permission: string) => permissions.includes(permission),
      isSuperAdmin: role === UserRole.SUPER_ADMIN,
      isAdmin: role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN,
      isStaff: role === UserRole.STAFF || role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN,
    };
  }, [role]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  // Return safe defaults when used outside AdminProvider (e.g., on public pages)
  if (context === undefined) {
    return {
      role: UserRole.USER,
      hasPermission: () => false,
      isSuperAdmin: false,
      isAdmin: false,
      isStaff: false,
    };
  }
  return context;
}
