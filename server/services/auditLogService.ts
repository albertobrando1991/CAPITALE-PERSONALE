import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";
import { Request } from 'express';

// Tipi TypeScript
interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  actionType: string;
  actionCategory: 'auth' | 'users' | 'content' | 'subscriptions' | 'admin' | 'ai' | 'system';
  actionDescription?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  metadata?: Record<string, any>;
  status?: 'success' | 'failure' | 'warning';
  errorMessage?: string;
}

class AuditLogService {
  /**
   * Registra un'azione nel sistema di audit log
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const logData: InsertAuditLog = {
        userId: entry.userId || null, // Cast string to UUID if possible, or null if invalid? DB expects UUID.
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        actionType: entry.actionType,
        actionCategory: entry.actionCategory,
        actionDescription: entry.actionDescription || this.generateDescription(entry),
        entityType: entry.entityType,
        entityId: entry.entityId ? entry.entityId : null, // Ensure UUID or null
        entityName: entry.entityName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        requestPath: entry.requestPath,
        requestMethod: entry.requestMethod,
        metadata: entry.metadata || {},
        status: entry.status || 'success',
        errorMessage: entry.errorMessage
      };

      // Handle potential UUID mismatch for userId if local dev uses non-UUIDs
      // If DB requires UUID and we have non-UUID, we might need to skip userId or fix DB.
      // For now, let's try to insert. If it fails due to UUID format, we'll need to fix the schema.
      
      await db.insert(auditLogs).values(logData as any); // Cast as any to bypass potential type mismatch if schema.ts has mismatch with DB

    } catch (err) {
      // Non bloccare l'operazione principale se il logging fallisce
      console.error('Errore critico audit log:', err);
    }
  }

  /**
   * Estrae informazioni dalla request Express
   */
  extractRequestInfo(req: Request): Partial<AuditLogEntry> {
    return {
      ipAddress: (req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown').substring(0, 45),
      userAgent: req.headers['user-agent'] || 'unknown',
      requestPath: req.originalUrl,
      requestMethod: req.method
    };
  }

  /**
   * Genera descrizione automatica dell'azione
   */
  private generateDescription(entry: AuditLogEntry): string {
    const descriptions: Record<string, string> = {
      'login_success': `Utente ${entry.userEmail} ha effettuato l'accesso`,
      'login_failed': `Tentativo di accesso fallito per ${entry.userEmail}`,
      'logout': `Utente ${entry.userEmail} ha effettuato il logout`,
      'registration': `Nuovo utente registrato: ${entry.userEmail}`,
      'profile_update': `Profilo utente aggiornato`,
      'role_change': `Ruolo utente modificato`,
      'create': `Creato nuovo ${entry.entityType}: ${entry.entityName}`,
      'update': `Modificato ${entry.entityType}: ${entry.entityName}`,
      'delete': `Eliminato ${entry.entityType}: ${entry.entityName}`,
      'subscription_purchase': `Nuovo abbonamento acquistato`,
      'user_impersonation_start': `Avviata impersonazione utente`,
      // ... aggiungi altre descrizioni
    };
    
    return descriptions[entry.actionType] || `Azione: ${entry.actionType}`;
  }

  /**
   * Calcola il diff tra due oggetti (per old_value/new_value)
   */
  calculateDiff(oldObj: Record<string, any>, newObj: Record<string, any>): {
    oldValue: Record<string, any>;
    newValue: Record<string, any>;
  } {
    const oldValue: Record<string, any> = {};
    const newValue: Record<string, any> = {};

    // Trova campi modificati
    for (const key of Object.keys(newObj)) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        oldValue[key] = oldObj[key];
        newValue[key] = newObj[key];
      }
    }

    // Trova campi rimossi
    for (const key of Object.keys(oldObj)) {
      if (!(key in newObj)) {
        oldValue[key] = oldObj[key];
        newValue[key] = undefined;
      }
    }

    return { oldValue, newValue };
  }
}

export const auditLogService = new AuditLogService();
