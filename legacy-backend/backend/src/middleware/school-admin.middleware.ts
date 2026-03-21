import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/api.response';

/**
 * Middleware to verify that the user has school_admin role
 * and belongs to the school they're trying to access
 */
export const requireSchoolAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const user = req.user;
        
        if (!user) {
            return ApiResponse.error(res, 'Unauthorized - No user found', 401);
        }

        // Check if user has school_admin role
        if (user.role !== 'school_admin') {
            return ApiResponse.error(
                res,
                'Forbidden - Requires school_admin role',
                403
            );
        }

        // Check if user has a school assigned
        if (!user.school_id) {
            return ApiResponse.error(
                res,
                'Forbidden - User is not assigned to any school',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to verify school access for a specific schoolId parameter
 * Used when accessing another school's data (for future multi-school admin features)
 */
export const verifySchoolAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const user = req.user;
        const { schoolId } = req.params;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // School admins can only access their own school
        if (user.role === 'school_admin') {
            if (!user.school_id) {
                return ApiResponse.error(
                    res,
                    'Forbidden - User is not assigned to any school',
                    403
                );
            }

            // If trying to access a different school, deny access
            if (schoolId && user.school_id.toString() !== schoolId) {
                return ApiResponse.error(
                    res,
                    'Forbidden - You can only access your own school',
                    403
                );
            }

            // Set the school_id in params to user's school if not provided
            if (!schoolId) {
                req.params.schoolId = user.school_id.toString();
            }
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to add school_id filter to database queries
 * Ensures all queries are scoped to the user's school
 */
export const addSchoolScope = (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const user = req.user;

        if (user && user.school_id) {
            // Add school_id to request for use in controllers
            // @ts-ignore
            req.schoolId = user.school_id;
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
