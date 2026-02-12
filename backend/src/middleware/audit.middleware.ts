import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';

export type AuditAction =
    | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
    | 'LOGIN' | 'LOGOUT' | 'REGISTER'
    | 'UPLOAD' | 'DOWNLOAD'
    | 'VERIFY' | 'UNVERIFY'
    | 'REFRESH_TOKEN';

interface AuditLogEntry {
    user_id?: number;
    action: AuditAction;
    resource_type: string;
    resource_id?: number;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    request_body?: Record<string, unknown>;
}

/**
 * Create audit log entry
 */
async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                entry.user_id,
                entry.action,
                entry.resource_type,
                entry.resource_id || null,
                entry.old_values ? JSON.stringify(entry.old_values) : null,
                entry.new_values ? JSON.stringify(entry.new_values) : null,
                entry.ip_address || null,
                entry.user_agent || null,
            ]
        );
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break the application
    }
}

/**
 * Extract resource ID from request params
 */
function extractResourceId(req: Request): number | null {
    const idParam = req.params.id || req.params.projectId || req.params.eventId || req.params.galleryId;
    if (idParam) {
        const parsed = parseInt(idParam, 10);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!body) return undefined;

    const sensitiveFields = ['password', 'refreshToken', 'accessToken', 'token', 'googleId'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body)) {
        if (sensitiveFields.includes(key)) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeBody(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Audit logging middleware factory
 * Logs successful operations after response is sent
 */
export const auditLog = (
    action: AuditAction,
    resourceType: string
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        const startTime = Date.now();

        // Store the request body before it might be modified
        const requestBody = sanitizeBody(req.body as Record<string, unknown>);

        res.send = function (body) {
            // Log only successful operations (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const authReq = req as AuthRequest;

                createAuditLog({
                    user_id: authReq.user?.id,
                    action,
                    resource_type: resourceType,
                    resource_id: extractResourceId(req) || undefined,
                    new_values: requestBody,
                    ip_address: req.ip || req.socket.remoteAddress,
                    user_agent: req.get('user-agent'),
                }).catch(console.error);
            }

            return originalSend.call(this, body);
        };

        next();
    };
};

/**
 * Manual audit log function for specific actions
 */
export const logAuditEvent = async (
    req: AuthRequest,
    action: AuditAction,
    resourceType: string,
    resourceId?: number,
    details?: {
        old_values?: Record<string, unknown>;
        new_values?: Record<string, unknown>;
    }
): Promise<void> => {
    await createAuditLog({
        user_id: req.user?.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: details?.old_values,
        new_values: details?.new_values,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.get('user-agent'),
    });
};

/**
 * Get audit logs for a specific user (admin only)
 */
export const getUserAuditLogs = async (userId: number, limit = 100): Promise<unknown[]> => {
    const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
};

/**
 * Get audit logs for a specific resource
 */
export const getResourceAuditLogs = async (
    resourceType: string,
    resourceId: number,
    limit = 100
): Promise<unknown[]> => {
    const result = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE resource_type = $1 AND resource_id = $2 
         ORDER BY created_at DESC 
         LIMIT $3`,
        [resourceType, resourceId, limit]
    );
    return result.rows;
};

/**
 * Cleanup old audit logs (retention policy)
 */
export const cleanupOldAuditLogs = async (daysToKeep: number = 90): Promise<number> => {
    const result = await pool.query(
        `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '%1 days'`,
        [daysToKeep]
    );
    return result.rowCount || 0;
};
