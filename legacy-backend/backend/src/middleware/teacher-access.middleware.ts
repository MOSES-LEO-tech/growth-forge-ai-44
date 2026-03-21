import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';
import { AuthRequest } from '../types';

/**
 * Middleware to ensure the user is a teacher or admin
 * This is an additional check beyond the authorize middleware
 */
export const requireTeacherOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        
        if (!user) {
            return ApiResponse.error(res, 'Unauthorized - No user found', 401);
        }

        if (user.role !== 'teacher' && user.role !== 'admin') {
            return ApiResponse.error(
                res,
                'Forbidden - Teacher or Admin access required',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to verify teacher has access to a specific class
 * Checks if the class belongs to the teacher
 */
export const requireTeacherClassAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        const { classId } = req.params;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins have access to all classes
        if (user.role === 'admin') {
            return next();
        }

        // Verify it's a teacher
        if (user.role !== 'teacher') {
            return ApiResponse.error(res, 'Forbidden - Teacher access required', 403);
        }

        // If no classId provided, skip this check
        if (!classId) {
            return next();
        }

        // Check if class belongs to this teacher
        const classCheck = await pool.query(
            'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2 AND deleted_at IS NULL',
            [classId, user.id]
        );

        if (classCheck.rows.length === 0) {
            return ApiResponse.error(
                res,
                'Forbidden - You do not have access to this class',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to verify teacher has access to a specific student
 * Checks if the student is enrolled in one of the teacher's classes
 */
export const requireTeacherStudentAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        const { studentId } = req.params;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins have access to all students
        if (user.role === 'admin') {
            return next();
        }

        // Verify it's a teacher
        if (user.role !== 'teacher') {
            return ApiResponse.error(res, 'Forbidden - Teacher access required', 403);
        }

        // If no studentId provided, skip this check
        if (!studentId) {
            return next();
        }

        // Check if student is in one of teacher's classes
        const studentCheck = await pool.query(
            `SELECT cs.id 
             FROM class_students cs
             JOIN classes c ON c.id = cs.class_id
             WHERE cs.student_id = $1 AND c.teacher_id = $2 AND c.deleted_at IS NULL`,
            [studentId, user.id]
        );

        if (studentCheck.rows.length === 0) {
            return ApiResponse.error(
                res,
                'Forbidden - You do not have access to this student',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to verify teacher has access to a specific project
 * Checks if the project owner is a student in one of the teacher's classes
 */
export const requireTeacherProjectAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        const { projectId } = req.params;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins have access to all projects
        if (user.role === 'admin') {
            return next();
        }

        // Verify it's a teacher
        if (user.role !== 'teacher') {
            return ApiResponse.error(res, 'Forbidden - Teacher access required', 403);
        }

        // If no projectId provided, skip this check
        if (!projectId) {
            return next();
        }

        // Check if project owner is in one of teacher's classes
        const projectCheck = await pool.query(
            `SELECT p.id 
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             JOIN classes c ON c.id = cs.class_id
             WHERE p.id = $1 AND c.teacher_id = $2 AND p.deleted_at IS NULL`,
            [projectId, user.id]
        );

        if (projectCheck.rows.length === 0) {
            return ApiResponse.error(
                res,
                'Forbidden - You do not have access to this project',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to verify teacher has access to a specific achievement
 * Checks if the achievement owner is a student in one of the teacher's classes
 */
export const requireTeacherAchievementAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;
        const { achievementId } = req.params;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins have access to all achievements
        if (user.role === 'admin') {
            return next();
        }

        // Verify it's a teacher
        if (user.role !== 'teacher') {
            return ApiResponse.error(res, 'Forbidden - Teacher access required', 403);
        }

        // If no achievementId provided, skip this check
        if (!achievementId) {
            return next();
        }

        // Check if achievement owner is in one of teacher's classes
        const achievementCheck = await pool.query(
            `SELECT a.id 
             FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             JOIN classes c ON c.id = cs.class_id
             WHERE a.id = $1 AND c.teacher_id = $2 AND a.deleted_at IS NULL`,
            [achievementId, user.id]
        );

        if (achievementCheck.rows.length === 0) {
            return ApiResponse.error(
                res,
                'Forbidden - You do not have access to this achievement',
                403
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

/**
 * Middleware to check if teacher has any assigned classes
 * Returns 404 if teacher has no classes
 */
export const requireTeacherHasClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as AuthRequest).user;

        if (!user) {
            return ApiResponse.error(res, 'Unauthorized', 401);
        }

        // Admins don't need classes
        if (user.role === 'admin') {
            return next();
        }

        // Check if teacher has any classes
        const classesCheck = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL LIMIT 1',
            [user.id]
        );

        if (classesCheck.rows.length === 0) {
            return ApiResponse.error(
                res,
                'No classes assigned - Please contact your school administrator',
                404
            );
        }

        next();
    } catch (error) {
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
