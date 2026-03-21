import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}

// Re-export types for backward compatibility
export type { AuthRequest, AuthUser } from '../types';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: Error | null, decoded: unknown) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        // Type assertion for decoded token
        req.user = decoded as AuthUser;
        next();
    });
};
