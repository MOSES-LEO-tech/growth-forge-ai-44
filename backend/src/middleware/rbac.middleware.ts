import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/api.response';

export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // @ts-ignore
        const userRole = req.user?.role;

        if (!userRole) {
            return ApiResponse.error(res, 'Unauthorized - No role found', 401);
        }

        if (!allowedRoles.includes(userRole)) {
            return ApiResponse.error(
                res,
                `Forbidden - Requires one of: ${allowedRoles.join(', ')}`,
                403
            );
        }

        next();
    };
};

export const requireSchoolMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        // @ts-ignore
        const userSchoolId = req.user?.school_id;
        const { schoolId } = req.params;

        if (!userId) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins can access any school
        // @ts-ignore
        if (req.user?.role === 'admin') {
            return next();
        }

        // Check if user belongs to the school
        if (!userSchoolId || userSchoolId.toString() !== schoolId) {
            return ApiResponse.error(res, 'Forbidden - Not a member of this school', 403);
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
