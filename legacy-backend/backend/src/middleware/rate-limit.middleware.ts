import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Memory store for rate limiting (in production, use Redis)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function getKey(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path;
    return `${ip}:${path}`;
}

function checkRateLimit(key: string, windowMs: number): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return { limited: false, remaining: windowMs, resetTime: now + windowMs };
    }

    const remaining = record.resetTime - now;
    if (record.count >= 100) {
        return { limited: true, remaining: 0, resetTime: record.resetTime };
    }

    record.count++;
    return { limited: false, remaining: remaining, resetTime: record.resetTime };
}

// Login rate limiter: 5 attempts per 15 minutes per IP
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: 15 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting in test environment
        return process.env.NODE_ENV === 'test';
    },
});

// Register rate limiter: 10 attempts per hour per IP
export const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts
    message: {
        success: false,
        error: 'Too many registration attempts. Please try again in an hour.',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});

// Forgot password rate limiter: 3 attempts per hour per IP
export const forgotPasswordRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: {
        success: false,
        error: 'Too many password reset requests. Please try again in an hour.',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});

// Token refresh rate limiter: 100 attempts per hour per user
export const refreshTokenRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 attempts
    message: {
        success: false,
        error: 'Too many token refresh attempts. Please try again later.',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});

// General API rate limiter for authenticated routes
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});

// Stricter rate limiter for sensitive operations
export const sensitiveOperationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 operations per hour
    message: {
        success: false,
        error: 'Too many operations. Please try again later.',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});

// Custom middleware to add rate limit headers
export function rateLimitHeaders(req: Request, res: Response, next: NextFunction): void {
    const key = getKey(req);
    // Headers will be added by express-rate-limit
    next();
}

// Email verification resend rate limiter: 3 per hour
export const resendVerificationRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: {
        success: false,
        error: 'Too many verification email requests. Please try again in an hour.',
        retryAfter: 60 * 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
});
