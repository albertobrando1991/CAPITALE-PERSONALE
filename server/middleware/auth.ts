import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { userRoles, userSuspensions, UserRole } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        claims?: { sub: string };
        [key: string]: any;
      };
    }
  }
}

// Environment-based admin/staff lists (fallback)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [];

const STAFF_EMAILS = process.env.STAFF_EMAILS
  ? process.env.STAFF_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [];

/**
 * Helper: Get user ID from request
 */
export function getUserId(req: Request): string | null {
  return req.user?.id || req.user?.claims?.sub || null;
}

/**
 * Helper: Get user email from request
 */
export function getUserEmail(req: Request): string | null {
  return req.user?.email?.toLowerCase() || null;
}

/**
 * Helper: Check if email is admin (env-based fallback)
 */
export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Helper: Check if email is staff (env-based fallback)
 */
export function isStaffEmail(email?: string): boolean {
  if (!email) return false;
  return STAFF_EMAILS.includes(email.toLowerCase()) || isAdminEmail(email);
}

/**
 * Middleware: Require authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  next();
};

/**
 * Middleware: Require admin or staff role
 * Checks database first, then falls back to email list
 */
export const requireAdminOrStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);
    const email = getUserEmail(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    // Check if user is suspended
    const [suspension] = await db
      .select()
      .from(userSuspensions)
      .where(and(
        eq(userSuspensions.userId, userId),
        eq(userSuspensions.isActive, true)
      ))
      .limit(1);

    if (suspension) {
      const isExpired = suspension.expiresAt && new Date(suspension.expiresAt) < new Date();
      if (!isExpired) {
        return res.status(403).json({
          error: 'Account sospeso',
          reason: suspension.reason,
          expiresAt: suspension.expiresAt
        });
      }
    }

    // Check role in database
    const [roleData] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    const dbRole = roleData?.role;
    const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, 'super_admin', 'admin', 'staff'];

    if (dbRole && allowedRoles.includes(dbRole as UserRole)) {
      req.user!.role = dbRole;
      return next();
    }

    // Fallback to email-based check
    if (isStaffEmail(email || undefined)) {
      req.user!.role = isAdminEmail(email || undefined) ? 'admin' : 'staff';
      return next();
    }

    console.warn(`[AUTH] Accesso negato per user ${userId} (${email}). Ruolo: ${dbRole || 'nessuno'}`);
    return res.status(403).json({ error: 'Accesso negato: permessi insufficienti' });

  } catch (err: any) {
    console.error('[AUTH] Errore verifica ruolo:', err);
    return res.status(500).json({ error: 'Errore verifica permessi' });
  }
};

/**
 * Middleware: Require admin role only
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);
    const email = getUserEmail(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    // Check role in database
    const [roleData] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    const dbRole = roleData?.role;
    const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, 'super_admin', 'admin'];

    if (dbRole && adminRoles.includes(dbRole as UserRole)) {
      req.user!.role = dbRole;
      return next();
    }

    // Fallback to email-based check
    if (isAdminEmail(email || undefined)) {
      req.user!.role = 'admin';
      return next();
    }

    console.warn(`[AUTH] Admin access denied for ${userId} (${email})`);
    return res.status(403).json({ error: 'Accesso negato: richiesto ruolo admin' });

  } catch (err: any) {
    console.error('[AUTH] Errore verifica admin:', err);
    return res.status(500).json({ error: 'Errore verifica permessi' });
  }
};

/**
 * Middleware: Require super admin role only
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    // Check role in database - super_admin only
    const [roleData] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    if (roleData?.role === UserRole.SUPER_ADMIN || roleData?.role === 'super_admin') {
      req.user!.role = roleData.role;
      return next();
    }

    return res.status(403).json({ error: 'Accesso negato: richiesto ruolo super_admin' });

  } catch (err: any) {
    console.error('[AUTH] Errore verifica super admin:', err);
    return res.status(500).json({ error: 'Errore verifica permessi' });
  }
};

/**
 * Helper: Check if current user has specific role
 */
export async function hasRole(userId: string, requiredRoles: string[]): Promise<boolean> {
  try {
    const [roleData] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    return roleData ? requiredRoles.includes(roleData.role) : false;
  } catch {
    return false;
  }
}
