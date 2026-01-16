
import { auditLogService } from '../services/auditLogService';

export const logAdminActivity = async (
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: object,
  ipAddress?: string
) => {
  try {
    await auditLogService.log({
      userId: adminId,
      actionType: action,
      actionCategory: 'admin',
      entityType: entityType,
      entityId: entityId,
      metadata: details as Record<string, any>,
      ipAddress: ipAddress
    });
  } catch (error) {
    console.error('[ADMIN LOG] Errore nel salvataggio log:', error);
    // Non blocchiamo l'esecuzione se il log fallisce, ma lo riportiamo
  }
};
