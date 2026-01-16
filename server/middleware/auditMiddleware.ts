import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/auditLogService';

/**
 * Middleware che logga automaticamente le richieste API
 */
export const auditMiddleware = (
  actionCategory: string,
  actionType: string,
  options?: {
    entityType?: string;
    getEntityId?: (req: Request) => string;
    getEntityName?: (req: Request) => string;
    getMetadata?: (req: Request) => Record<string, any>;
  }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Salva il metodo originale di res.json per intercettare la risposta
    const originalJson = res.json.bind(res);
    
    // Override res.json to capture the response body and log
    res.json = (body: any) => {
      // Log dopo che la risposta è stata generata
      const status = res.statusCode >= 400 ? 'failure' : 'success';
      
      const user = (req as any).user;
      
      auditLogService.log({
        userId: user?.id || user?.claims?.sub,
        userEmail: user?.email,
        userRole: user?.role,
        actionType,
        actionCategory: actionCategory as any,
        entityType: options?.entityType,
        entityId: options?.getEntityId?.(req),
        entityName: options?.getEntityName?.(req),
        metadata: options?.getMetadata?.(req),
        status,
        errorMessage: status === 'failure' ? body?.error : undefined,
        ...auditLogService.extractRequestInfo(req)
      });

      return originalJson(body);
    };

    next();
  };
};

/**
 * Helper per loggare azioni di autenticazione
 */
export const logAuthAction = async (
  actionType: string,
  userEmail: string,
  req: Request,
  status: 'success' | 'failure' = 'success',
  metadata?: Record<string, any>
) => {
  await auditLogService.log({
    userEmail,
    actionType,
    actionCategory: 'auth',
    status,
    metadata,
    ...auditLogService.extractRequestInfo(req)
  });
};
