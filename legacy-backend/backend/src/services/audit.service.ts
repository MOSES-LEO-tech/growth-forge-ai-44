import { pool } from '../config/database';

export enum AuditAction {
    // Authentication actions
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    LOGOUT_ALL = 'LOGOUT_ALL',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
    REGISTER = 'REGISTER',
    EMAIL_VERIFIED = 'EMAIL_VERIFIED',
    PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
    PASSWORD_CHANGED = 'PASSWORD_CHANGED',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

    // Profile actions
    PROFILE_VIEWED = 'PROFILE_VIEWED',
    PROFILE_UPDATED = 'PROFILE_UPDATED',

    // Resource actions
    PROJECT_CREATED = 'PROJECT_CREATED',
    PROJECT_UPDATED = 'PROJECT_UPDATED',
    PROJECT_DELETED = 'PROJECT_DELETED',
    PROJECT_VIEWED = 'PROJECT_VIEWED',

    // Admin actions
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_DELETED = 'USER_DELETED',
    USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
}

export enum ResourceType {
    USER = 'user',
    PROJECT = 'project',
    ACHIEVEMENT = 'achievement',
    AUTH = 'auth',
    PROFILE = 'profile',
    SCHOOL = 'school',
    GALLERY = 'gallery',
    EVENT = 'event',
    SCHOLARSHIP = 'scholarship',
}

export interface AuditLogEntry {
    user_id?: number;
    action: AuditAction;
    resource_type: ResourceType;
    resource_id?: number;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}

class AuditService {
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    entry.user_id || null,
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
            // Don't let audit logging failures affect the main flow
            console.error('Failed to log audit entry:', error);
        }
    }

    async logAuthSuccess(
        userId: number,
        email: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.LOGIN_SUCCESS,
            resource_type: ResourceType.AUTH,
            new_values: { email },
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logAuthFailed(
        email: string,
        reason: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            action: AuditAction.LOGIN_FAILED,
            resource_type: ResourceType.AUTH,
            new_values: { email, reason },
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logLogout(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.LOGOUT,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logLogoutAll(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.LOGOUT_ALL,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logTokenRefresh(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.TOKEN_REFRESH,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logRegister(
        userId: number,
        email: string,
        role: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.REGISTER,
            resource_type: ResourceType.AUTH,
            new_values: { email, role },
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logEmailVerified(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.EMAIL_VERIFIED,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logPasswordResetRequested(
        userId: number,
        email: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.PASSWORD_RESET_REQUESTED,
            resource_type: ResourceType.AUTH,
            new_values: { email },
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logPasswordResetCompleted(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.PASSWORD_RESET_COMPLETED,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logPasswordChanged(
        userId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.PASSWORD_CHANGED,
            resource_type: ResourceType.AUTH,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logAccountLocked(
        userId: number,
        email: string,
        reason: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.ACCOUNT_LOCKED,
            resource_type: ResourceType.AUTH,
            new_values: { email, reason },
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logProfileViewed(
        userId: number,
        targetUserId: number,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.PROFILE_VIEWED,
            resource_type: ResourceType.PROFILE,
            resource_id: targetUserId,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }

    async logProfileUpdated(
        userId: number,
        oldValues: Record<string, unknown>,
        newValues: Record<string, unknown>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.log({
            user_id: userId,
            action: AuditAction.PROFILE_UPDATED,
            resource_type: ResourceType.PROFILE,
            old_values: oldValues,
            new_values: newValues,
            ip_address: ipAddress,
            user_agent: userAgent,
        });
    }
}

export const auditService = new AuditService();
