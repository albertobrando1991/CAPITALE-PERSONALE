import { Express, Request, Response } from 'express';
import { requireSuperAdmin, requireAdminRole } from './middleware/adminAuth';
import { isAuthenticated } from './replitAuth';
import { auditLogService } from './services/auditLogService';
import { db } from './db';
import { users, userRoles } from '../shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Store per sessioni di impersonazione attive
const impersonationSessions = new Map<string, {
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  startedAt: Date;
}>();

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET non configurato in produzione");
}
const JWT_SECRET = rawJwtSecret || "local_dev_secret_jwt";

export function registerImpersonationRoutes(app: Express) {
  
  // Middleware chain
  const superAdminMiddleware = [isAuthenticated, requireAdminRole, requireSuperAdmin];

  /**
   * POST /api/admin/impersonate/:userId
   * Inizia impersonazione utente
   */
  app.post('/api/admin/impersonate/:userId', superAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).user;
      const targetUserId = req.params.userId;

      // Recupera info utente target
      const [targetUser] = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, targetUserId));

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      // Recupera ruolo target
      const [roleData] = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .where(eq(userRoles.userId, targetUserId));
      
      const targetRole = roleData?.role || 'user';

      // Non permettere impersonazione di altri super_admin
      if (targetRole === 'super_admin') {
        return res.status(403).json({ error: 'Non puoi impersonare un super admin' });
      }

      // Genera token di impersonazione
      const impersonationToken = jwt.sign(
        {
          userId: targetUser.id,
          email: targetUser.email,
          role: targetRole,
          isImpersonation: true,
          impersonatedBy: adminUser.id || adminUser.claims?.sub
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Salva sessione
      const sessionId = `imp_${Date.now()}`;
      impersonationSessions.set(sessionId, {
        adminId: adminUser.id || adminUser.claims?.sub,
        adminEmail: adminUser.email,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email || '',
        startedAt: new Date()
      });

      // Log dell'azione
      await auditLogService.log({
        userId: adminUser.id || adminUser.claims?.sub,
        userEmail: adminUser.email,
        userRole: 'super_admin',
        actionType: 'user_impersonation_start',
        actionCategory: 'admin',
        entityType: 'user',
        entityId: targetUser.id,
        entityName: targetUser.email || '',
        metadata: {
          sessionId,
          targetRole
        },
        ...auditLogService.extractRequestInfo(req)
      });

      res.json({
        success: true,
        token: impersonationToken,
        sessionId,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetRole
        }
      });
    } catch (error) {
      console.error('Error impersonating user:', error);
      res.status(500).json({ error: 'Errore avvio impersonazione' });
    }
  });

  /**
   * POST /api/admin/impersonate/end/:sessionId
   * Termina impersonazione
   */
  app.post('/api/admin/impersonate/end/:sessionId', superAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const session = impersonationSessions.get(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Sessione non trovata' });
      }

      const duration = Math.round((Date.now() - session.startedAt.getTime()) / 1000);

      // Log fine impersonazione
      await auditLogService.log({
        userId: session.adminId,
        userEmail: session.adminEmail,
        userRole: 'super_admin',
        actionType: 'user_impersonation_end',
        actionCategory: 'admin',
        entityType: 'user',
        entityId: session.targetUserId,
        entityName: session.targetEmail,
        metadata: {
          sessionId: req.params.sessionId,
          durationSeconds: duration
        },
        ...auditLogService.extractRequestInfo(req)
      });

      // Rimuovi sessione
      impersonationSessions.delete(req.params.sessionId);

      res.json({
        success: true,
        duration
      });
    } catch (error) {
      res.status(500).json({ error: 'Errore termine impersonazione' });
    }
  });
}
