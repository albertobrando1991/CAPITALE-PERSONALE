
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { userRoles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Estendiamo l'interfaccia Request per includere l'utente
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAdminRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // L'utente dovrebbe essere già autenticato dal middleware isAuthenticated in replitAuth.ts
    // che popola req.user
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }

    // Verifica ruolo nel database
    // req.user.id viene da replitAuth che usa claims.sub o id
    const userId = user.id || user.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'ID utente non valido' });
    }

    const [roleData] = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .limit(1);

    // Se non ha un ruolo o non è tra quelli ammessi
    if (!roleData || !['super_admin', 'admin', 'staff'].includes(roleData.role)) {
      console.warn(`[ADMIN AUTH] Accesso negato per user ${userId}. Ruolo: ${roleData?.role || 'nessuno'}`);
      return res.status(403).json({ error: 'Accesso negato: permessi insufficienti' });
    }

    // Aggiungi info ruolo alla request
    req.user.role = roleData.role;
    
    // Log accesso (opzionale, per debug)
    // console.log(`[ADMIN AUTH] Accesso autorizzato per ${userId} come ${roleData.role}`);
    
    next();
  } catch (err: any) {
    console.error('[ADMIN AUTH] Errore verifica ruolo:', err);
    return res.status(500).json({ error: 'Errore interno del server durante la verifica dei permessi' });
  }
};

export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Assume che requireAdminRole sia già stato eseguito
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Richiesto ruolo super_admin' });
  }
  next();
};
