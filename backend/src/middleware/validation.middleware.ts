import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { ApiResponse } from '../utils/api.response';

export const validate = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.parseAsync(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.issues.map((err: any) => ({
                field: Array.isArray(err.path) ? err.path.join('.') : '',
                message: String(err.message || 'Invalid'),
            }));
            return ApiResponse.error(res, 'Validation failed', 400, errors);
        }
        return ApiResponse.error(res, 'Internal server error', 500, error);
    }
};
