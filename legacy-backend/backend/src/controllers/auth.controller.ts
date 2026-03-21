import { Request, Response } from 'express';
import { z } from 'zod';
import {
    AuthUser,
    AuthTokens,
    TokenPayload,
    validatePassword,
    findUserByEmail,
    findUserById,
    createUser,
    storeRefreshToken,
    deleteRefreshToken,
    deleteAllUserRefreshTokens,
    validateRefreshToken,
    storeEmailVerificationToken,
    validateEmailVerificationToken,
    deleteEmailVerificationToken,
    setEmailVerified,
    storePasswordResetToken,
    validatePasswordResetToken,
    markPasswordResetTokenUsed,
    updateUserPassword,
    recordLoginAttempt,
    getRecentFailedAttempts,
    isAccountLocked,
    incrementFailedLoginAttempts,
    lockAccount,
    resetFailedLoginAttempts,
    updateLastLogin,
    generateAccessToken,
    generateRefreshToken,
    generateEmailVerificationToken,
    generatePasswordResetToken,
    verifyPassword,
} from '../services/auth.service';
import { emailService } from '../services/email.service';
import { auditService, AuditAction, ResourceType } from '../services/audit.service';
import { ApiResponse } from '../utils/api.response';
import { AuthRequest } from '../types';

// Validation schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().optional(),
    full_name: z.string().optional(),
    role: z.enum(['student', 'parent', 'teacher', 'admin', 'school_admin']).optional(),
    schoolId: z.number().optional(),
    school_id: z.number().optional(),
});

const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Helper function to extract IP and User Agent
function getClientInfo(req: Request): { ip: string | undefined; userAgent: string | undefined } {
    return {
        ip: req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent'],
    };
}

// Helper function to generate tokens and response
async function generateAuthResponse(user: AuthUser): Promise<AuthTokens> {
    const payload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        school_id: user.school_id || undefined,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await storeRefreshToken(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken };
}

// Helper function to create user response (excluding sensitive data)
function createUserResponse(user: AuthUser) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        schoolId: user.school_id,
        emailVerified: user.email_verified,
    };
}

// Register new user
export const register = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { email, password, fullName, full_name, role, schoolId, school_id } = validation.data;

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return ApiResponse.error(res, passwordValidation.errors[0], 400);
        }

        // Check if user exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return ApiResponse.error(res, 'User with this email already exists', 400);
        }

        const name = fullName || full_name || null;
        const userRole = role || 'student';
        const userSchoolId = schoolId || school_id || null;

        // Create user (email not verified yet)
        const newUser = await createUser(email, password, name, userRole, userSchoolId);

        // Generate email verification token
        const verificationToken = generateEmailVerificationToken(newUser.id);
        await storeEmailVerificationToken(newUser.id, verificationToken);

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken, name || undefined);

        // Log registration
        const { ip, userAgent } = getClientInfo(req);
        await auditService.logRegister(newUser.id, email, userRole, ip, userAgent);

        // Auto-login after registration (optional, but matches frontend expectation)
        const tokens = await generateAuthResponse(newUser);

        return ApiResponse.success(res, {
            user: createUserResponse(newUser),
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            message: 'Registration successful. Please check your email to verify your account.',
        }, 'User registered successfully', 201);
    } catch (error) {
        console.error('Registration error:', error);
        return ApiResponse.error(res, 'Server error during registration', 500, error);
    }
};

// Login
export const login = async (req: Request, res: Response) => {
    try {
        // Validate input
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { email, password } = validation.data;
        const { ip, userAgent } = getClientInfo(req);

        // Check if account is locked
        const lockStatus = await isAccountLocked(email);
        if (lockStatus.locked) {
            const remainingMinutes = Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000);
            await auditService.logAuthFailed(email, 'Account locked', ip, userAgent);
            return ApiResponse.error(res, `Account is locked. Try again in ${remainingMinutes} minutes.`, 423);
        }

        // Check for too many failed attempts
        const failedAttempts = await getRecentFailedAttempts(email);
        if (failedAttempts >= 5) {
            await lockAccount(email, 15);
            await auditService.logAccountLocked(0, email, 'Too many failed attempts', ip, userAgent);
            return ApiResponse.error(res, 'Account locked due to too many failed attempts. Try again in 15 minutes.', 423);
        }

        // Find user
        const user = await findUserByEmail(email);
        if (!user) {
            await recordLoginAttempt(email, ip, userAgent, false);
            await auditService.logAuthFailed(email, 'User not found', ip, userAgent);
            return ApiResponse.error(res, 'Invalid email or password', 401);
        }

        // Verify password
        const isValidPassword = await verifyPassword(user.id, password);
        if (!isValidPassword) {
            await recordLoginAttempt(email, ip, userAgent, false);
            await incrementFailedLoginAttempts(email);

            // Check if should lock account now
            const newFailedCount = failedAttempts + 1;
            if (newFailedCount >= 5) {
                await lockAccount(email, 15);
                await auditService.logAccountLocked(user.id, email, 'Too many failed attempts', ip, userAgent);
                return ApiResponse.error(res, 'Account locked due to too many failed attempts. Try again in 15 minutes.', 423);
            }

            await auditService.logAuthFailed(email, 'Invalid password', ip, userAgent);
            return ApiResponse.error(res, 'Invalid email or password', 401);
        }

        // Successful login
        await recordLoginAttempt(email, ip, userAgent, true);
        await resetFailedLoginAttempts(email);
        await updateLastLogin(user.id);
        await auditService.logAuthSuccess(user.id, email, ip, userAgent);

        // Send login alert email (in production, could be async)
        if (process.env.NODE_ENV === 'production') {
            emailService.sendLoginAlertEmail(
                email,
                user.full_name || 'User',
                ip || 'Unknown',
                userAgent || 'Unknown',
                new Date()
            ).catch(console.error);
        }

        // Generate tokens
        const tokens = await generateAuthResponse(user);

        return ApiResponse.success(res, {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: createUserResponse(user),
        }, 'Login successful');
    } catch (error) {
        console.error('Login error:', error);
        return ApiResponse.error(res, 'Server error during login', 500, error);
    }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const validation = verifyEmailSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { token } = validation.data;

        const validationResult = await validateEmailVerificationToken(token);
        if (!validationResult.valid || !validationResult.userId) {
            return ApiResponse.error(res, validationResult.error || 'Invalid verification token', 400);
        }

        // Mark email as verified
        await setEmailVerified(validationResult.userId);

        // Delete used token
        await deleteEmailVerificationToken(token);

        // Get user for response
        const user = await findUserById(validationResult.userId);
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        // Log email verification
        const { ip, userAgent } = getClientInfo(req);
        await auditService.logEmailVerified(validationResult.userId, ip, userAgent);

        return ApiResponse.success(res, {
            user: createUserResponse(user),
        }, 'Email verified successfully');
    } catch (error) {
        console.error('Email verification error:', error);
        return ApiResponse.error(res, 'Server error during email verification', 500, error);
    }
};

// Resend verification email
export const resendVerificationEmail = async (req: Request, res: Response) => {
    try {
        const validation = forgotPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { email } = validation.data;

        const user = await findUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return ApiResponse.success(res, null, 'If the email exists, a verification email has been sent.');
        }

        if (user.email_verified) {
            return ApiResponse.error(res, 'Email is already verified', 400);
        }

        // Generate new verification token
        const verificationToken = generateEmailVerificationToken(user.id);
        await storeEmailVerificationToken(user.id, verificationToken);

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken, user.full_name || undefined);

        return ApiResponse.success(res, null, 'If the email exists and is unverified, a verification email has been sent.');
    } catch (error) {
        console.error('Resend verification error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const validation = forgotPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { email } = validation.data;
        const { ip, userAgent } = getClientInfo(req);

        const user = await findUserByEmail(email);

        // Always return success to prevent email enumeration
        if (user) {
            // Generate password reset token
            const resetToken = generatePasswordResetToken(user.id);
            await storePasswordResetToken(user.id, resetToken);

            // Send password reset email
            await emailService.sendPasswordResetEmail(email, resetToken, user.full_name || undefined);

            // Log password reset request
            await auditService.logPasswordResetRequested(user.id, email, ip, userAgent);
        }

        return ApiResponse.success(res, null, 'If the email exists, a password reset link has been sent.');
    } catch (error) {
        console.error('Forgot password error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const validation = resetPasswordSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { token, password } = validation.data;
        const { ip, userAgent } = getClientInfo(req);

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return ApiResponse.error(res, passwordValidation.errors[0], 400);
        }

        const validationResult = await validatePasswordResetToken(token);
        if (!validationResult.valid || !validationResult.userId) {
            return ApiResponse.error(res, validationResult.error || 'Invalid reset token', 400);
        }

        // Update password
        await updateUserPassword(validationResult.userId, password);

        // Mark token as used
        await markPasswordResetTokenUsed(token);

        // Delete all refresh tokens (logout from all devices)
        await deleteAllUserRefreshTokens(validationResult.userId);

        // Log password reset completion
        await auditService.logPasswordResetCompleted(validationResult.userId, ip, userAgent);

        // Send password change notification
        const user = await findUserById(validationResult.userId);
        if (user) {
            await emailService.sendPasswordChangeNotificationEmail(user.email, user.full_name || undefined);
        }

        return ApiResponse.success(res, null, 'Password reset successfully. Please log in with your new password.');
    } catch (error) {
        console.error('Reset password error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Change password (authenticated)
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const validation = changePasswordSchema.safeParse(req.body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Validation error';
            return ApiResponse.error(res, errorMessage, 400);
        }

        const { currentPassword, newPassword } = validation.data;
        const userId = req.user?.id;

        if (!userId) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Validate new password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return ApiResponse.error(res, passwordValidation.errors[0], 400);
        }

        // Verify current password
        const { verifyPassword } = await import('../services/auth.service');
        const isValidPassword = await verifyPassword(userId, currentPassword);
        if (!isValidPassword) {
            return ApiResponse.error(res, 'Current password is incorrect', 401);
        }

        // Update password
        await updateUserPassword(userId, newPassword);

        // Delete all refresh tokens (logout from all devices)
        await deleteAllUserRefreshTokens(userId);

        // Log password change
        const { ip, userAgent } = getClientInfo(req);
        await auditService.logPasswordChanged(userId, ip, userAgent);

        // Send password change notification
        const user = await findUserById(userId);
        if (user) {
            await emailService.sendPasswordChangeNotificationEmail(user.email, user.full_name || undefined);
        }

        return ApiResponse.success(res, null, 'Password changed successfully. Please log in again.');
    } catch (error) {
        console.error('Change password error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return ApiResponse.error(res, 'Refresh token is required', 400);
        }

        const { ip, userAgent } = getClientInfo(req);

        const validationResult = await validateRefreshToken(refreshToken);
        if (!validationResult.valid || !validationResult.userId) {
            await auditService.log({
                action: AuditAction.TOKEN_REFRESH_FAILED,
                resource_type: ResourceType.AUTH,
                ip_address: ip,
                user_agent: userAgent,
            });
            return ApiResponse.error(res, validationResult.error || 'Invalid refresh token', 401);
        }

        // Get user info
        const user = await findUserById(validationResult.userId);
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        // Delete used token (token rotation)
        await deleteRefreshToken(refreshToken);

        // Generate new tokens
        const tokens = await generateAuthResponse(user);

        // Log token refresh
        await auditService.logTokenRefresh(validationResult.userId, ip, userAgent);

        return ApiResponse.success(res, {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: createUserResponse(user),
        }, 'Token refreshed successfully');
    } catch (error) {
        console.error('Token refresh error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Logout
export const logout = async (req: AuthRequest, res: Response) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user?.id;
        const { ip, userAgent } = getClientInfo(req);

        if (refreshToken) {
            await deleteRefreshToken(refreshToken);
        }

        if (userId) {
            await auditService.logLogout(userId, ip, userAgent);
        }

        return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Logout from all devices
export const logoutAll = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { ip, userAgent } = getClientInfo(req);

        if (!userId) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        await deleteAllUserRefreshTokens(userId);
        await auditService.logLogoutAll(userId, ip, userAgent);

        return ApiResponse.success(res, null, 'Logged out from all devices successfully');
    } catch (error) {
        console.error('Logout all error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Get current user
export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        const user = await findUserById(userId);
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        // Log profile view
        const { ip, userAgent } = getClientInfo(req);
        await auditService.logProfileViewed(userId, userId, ip, userAgent);

        return ApiResponse.success(res, createUserResponse(user), 'Profile fetched successfully');
    } catch (error) {
        console.error('Get profile error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

// Update profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { fullName, avatarUrl } = req.body;
        const { ip, userAgent } = getClientInfo(req);

        if (!userId) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Get current user data for audit
        const currentUser = await findUserById(userId);
        if (!currentUser) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        // Update user
        const { pool } = await import('../config/database');
        const updatedUser = await pool.query(
            'UPDATE users SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, email, full_name, role, avatar_url, school_id, email_verified',
            [fullName, avatarUrl, userId]
        );

        const user = updatedUser.rows[0] as AuthUser;

        // Log profile update
        await auditService.logProfileUpdated(
            userId,
            { full_name: currentUser.full_name, avatar_url: currentUser.avatar_url },
            { full_name: fullName, avatar_url: avatarUrl },
            ip,
            userAgent
        );

        return ApiResponse.success(res, createUserResponse(user), 'Profile updated successfully');
    } catch (error) {
        console.error('Update profile error:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
