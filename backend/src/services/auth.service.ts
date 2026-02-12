import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
const JWT_EXPIRY = '1h'; // 1 hour for better security while maintaining usability
const REFRESH_TOKEN_EXPIRY = '7d';
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour

// Password validation schema
export const passwordSchema = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
};

// Types
export interface TokenPayload {
    id: number;
    email?: string;
    role: string;
    school_id?: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthUser {
    id: number;
    email: string;
    full_name: string | null;
    role: string;
    avatar_url: string | null;
    school_id: number | null;
    email_verified: boolean;
}

// Token generation functions
export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function generateRefreshToken(userId: number): string {
    return jwt.sign({ id: userId, type: 'refresh', jti: uuidv4() }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function generateEmailVerificationToken(userId: number): string {
    return uuidv4();
}

export function generatePasswordResetToken(userId: number): string {
    return uuidv4();
}

// Password validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < passwordSchema.minLength) {
        errors.push(`Password must be at least ${passwordSchema.minLength} characters`);
    }
    if (passwordSchema.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (passwordSchema.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (passwordSchema.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (passwordSchema.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
}

// Database operations for refresh tokens
export async function storeRefreshToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
}

export async function deleteRefreshToken(token: string): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

export async function deleteAllUserRefreshTokens(userId: number): Promise<void> {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

export async function validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
    try {
        const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as { id: number; type: string; jti: string };

        if (decoded.type !== 'refresh') {
            return { valid: false, error: 'Invalid token type' };
        }

        const tokenRecord = await pool.query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2',
            [token, decoded.id]
        );

        if (tokenRecord.rows.length === 0) {
            return { valid: false, error: 'Token not found' };
        }

        if (new Date(tokenRecord.rows[0].expires_at) < new Date()) {
            return { valid: false, error: 'Token expired' };
        }

        return { valid: true, userId: decoded.id };
    } catch (error) {
        return { valid: false, error: 'Invalid token' };
    }
}

// Database operations for email verification
export async function storeEmailVerificationToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);
    await pool.query(
        'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
}

export async function validateEmailVerificationToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
    try {
        const tokenRecord = await pool.query(
            'SELECT * FROM email_verification_tokens WHERE token = $1',
            [token]
        );

        if (tokenRecord.rows.length === 0) {
            return { valid: false, error: 'Token not found' };
        }

        if (new Date(tokenRecord.rows[0].expires_at) < new Date()) {
            return { valid: false, error: 'Token expired' };
        }

        return { valid: true, userId: tokenRecord.rows[0].user_id };
    } catch (error) {
        return { valid: false, error: 'Invalid token' };
    }
}

export async function deleteEmailVerificationToken(token: string): Promise<void> {
    await pool.query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
}

export async function setEmailVerified(userId: number): Promise<void> {
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
}

// Database operations for password reset
export async function storePasswordResetToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);
    await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
}

export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
    try {
        const tokenRecord = await pool.query(
            'SELECT * FROM password_reset_tokens WHERE token = $1',
            [token]
        );

        if (tokenRecord.rows.length === 0) {
            return { valid: false, error: 'Token not found' };
        }

        if (tokenRecord.rows[0].used_at) {
            return { valid: false, error: 'Token already used' };
        }

        if (new Date(tokenRecord.rows[0].expires_at) < new Date()) {
            return { valid: false, error: 'Token expired' };
        }

        return { valid: true, userId: tokenRecord.rows[0].user_id };
    } catch (error) {
        return { valid: false, error: 'Invalid token' };
    }
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);
}

// Database operations for login attempts (brute force protection)
export async function recordLoginAttempt(
    email: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
    success: boolean
): Promise<void> {
    await pool.query(
        'INSERT INTO login_attempts (email, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)',
        [email, ipAddress || null, userAgent || null, success]
    );
}

export async function getRecentFailedAttempts(email: string, windowMinutes: number = 15): Promise<number> {
    const result = await pool.query(
        `SELECT COUNT(*) as count FROM login_attempts 
         WHERE email = $1 AND success = false 
         AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
        [email]
    );
    return parseInt(result.rows[0].count, 10);
}

export async function isAccountLocked(email: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const result = await pool.query(
        'SELECT locked_until FROM users WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0) {
        return { locked: false };
    }

    const lockedUntil = result.rows[0].locked_until;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
        return { locked: true, lockedUntil: new Date(lockedUntil) };
    }

    return { locked: false };
}

export async function incrementFailedLoginAttempts(email: string): Promise<void> {
    await pool.query(
        'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE email = $1',
        [email]
    );
}

export async function lockAccount(email: string, lockDurationMinutes: number = 15): Promise<void> {
    const lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    await pool.query(
        'UPDATE users SET locked_until = $1 WHERE email = $2',
        [lockedUntil, email]
    );
}

export async function resetFailedLoginAttempts(email: string): Promise<void> {
    await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1',
        [email]
    );
}

export async function updateLastLogin(userId: number): Promise<void> {
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
}

// User operations
export async function findUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await pool.query(
        `SELECT id, email, password, full_name, role, avatar_url, school_id, email_verified 
         FROM users WHERE email = $1`,
        [email]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0] as AuthUser;
}

export async function findUserById(id: number): Promise<AuthUser | null> {
    const result = await pool.query(
        `SELECT id, email, full_name, role, avatar_url, school_id, email_verified 
         FROM users WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0] as AuthUser;
}

export async function createUser(
    email: string,
    password: string,
    fullName: string | null,
    role: string = 'student',
    schoolId: number | null = null
): Promise<AuthUser> {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
        `INSERT INTO users (email, password, full_name, role, school_id, email_verified) 
         VALUES ($1, $2, $3, $4, $5, false) 
         RETURNING id, email, full_name, role, avatar_url, school_id, email_verified`,
        [email, hashedPassword, fullName, role, schoolId]
    );

    return result.rows[0] as AuthUser;
}

export async function updateUserPassword(userId: number, password: string): Promise<void> {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
}

export async function verifyPassword(userId: number, password: string): Promise<boolean> {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
        return false;
    }

    return bcrypt.compare(password, result.rows[0].password);
}

export { JWT_SECRET, REFRESH_TOKEN_SECRET, JWT_EXPIRY, REFRESH_TOKEN_EXPIRY };
