import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML characters that could be used for cross-site scripting
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    const sanitizeString = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = sanitizeString(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitizeString(req.body);
    }
    if (req.query) {
        req.query = sanitizeString(req.query);
    }

    next();
};
