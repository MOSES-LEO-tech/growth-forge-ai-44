import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/api.response';


export const authorize = (allowedRoles: string[]) => {
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

// Alias to satisfy tests expecting requireRole
export const requireRole = (roles: string[]) => authorize(roles);

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

        // Check if user belongs to a school
        if (!userSchoolId) {
            return ApiResponse.error(res, 'Forbidden - User is not a member of any school', 403);
        }

        // If route has schoolId param, ensure user belongs to that school
        if (schoolId && userSchoolId.toString() !== schoolId) {
            return ApiResponse.error(res, 'Forbidden - Not a member of this school', 403);
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
