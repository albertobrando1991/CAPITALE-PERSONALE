import { Express, Request, Response } from 'express';
import { requireAdminRole, requireSuperAdmin } from './middleware/adminAuth';
import { db } from './db';
import { auditLogs } from '../shared/schema';
import { eq, and, desc, gte, lte, like, or, sql } from 'drizzle-orm';
import { isAuthenticated } from './replitAuth';

export function registerAuditLogRoutes(app: Express) {

  const adminMiddleware = [isAuthenticated, requireAdminRole];
  const superAdminMiddleware = [isAuthenticated, requireAdminRole, requireSuperAdmin];

  /**
   * GET /api/admin/audit-logs
   * Recupera i log con filtri e paginazione
   */
  app.get('/api/admin/audit-logs', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.query.userId as string;
      const actionType = req.query.actionType as string;
      const actionCategory = req.query.actionCategory as string;
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;
      const status = req.query.status as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const search = req.query.search as string;

      const offset = (page - 1) * limit;

      const conditions = [];

      if (userId) conditions.push(eq(auditLogs.userId, userId));
      if (actionType) conditions.push(eq(auditLogs.actionType, actionType));
      if (actionCategory) conditions.push(eq(auditLogs.actionCategory, actionCategory));
      if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
      if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
      if (status) conditions.push(eq(auditLogs.status, status));
      if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
      if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
      if (search) {
        conditions.push(or(
          like(auditLogs.actionDescription, `%${search}%`),
          like(auditLogs.userEmail, `%${search}%`)
        ));
      }

      // Query per i dati
      const logs = await db.select()
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Query per il conteggio totale (approssimato o exact)
      // Per performance, potremmo evitare se non strettamente necessario, ma per paginazione serve.
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ success: false, error: 'Errore recupero log' });
    }
  });

  /**
   * GET /api/admin/audit-logs/stats/summary
   * Statistiche aggregate
   */
  app.get('/api/admin/audit-logs/stats/summary', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Eseguiamo le funzioni SQL create
      // Drizzle execute raw SQL
      
      // Fallback query if stored procedures don't exist
      // Instead of calling stored procedures which might be missing, use direct aggregation queries
      
      // 1. Stats by Category
      const byCategory = await db.select({
        category: auditLogs.actionCategory,
        count: sql<number>`count(*)`
      })
      .from(auditLogs)
      .where(and(
        gte(auditLogs.createdAt, startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        lte(auditLogs.createdAt, endDate || new Date())
      ))
      .groupBy(auditLogs.actionCategory);

      // 2. Stats by Day
      // PostgreSQL specific date truncation
      const byDay = await db.execute(sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
          AND created_at <= ${endDate || new Date()}
        GROUP BY 1
        ORDER BY 1 ASC
      `);

      // Query per azioni fallite
      const failures = await db.select({
        actionType: auditLogs.actionType,
        count: sql<number>`count(*)`
      })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.status, 'failure'),
        gte(auditLogs.createdAt, startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      ))
      .groupBy(auditLogs.actionType);

      res.json({
        success: true,
        data: {
          byCategory,
          byDay: byDay.rows, // Extract rows from raw execution result
          failures
        }
      });
    } catch (error) {
      console.error("Error fetching audit stats:", error);
      res.status(500).json({ success: false, error: 'Errore statistiche' });
    }
  });

  /**
   * GET /api/admin/audit-logs/:id
   * Dettaglio singolo log
   */
  app.get('/api/admin/audit-logs/:id', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, req.params.id));

      if (!log) {
        return res.status(404).json({ success: false, error: 'Log non trovato' });
      }

      res.json({ success: true, data: log });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Errore recupero log' });
    }
  });
}
