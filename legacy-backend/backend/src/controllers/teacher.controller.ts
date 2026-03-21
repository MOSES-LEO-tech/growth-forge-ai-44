import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';
import { AuthRequest } from '../types';

// Get all classes for the authenticated teacher
export const getTeacherClasses = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        
        const result = await pool.query(
            `SELECT c.id, c.name, c.grade, c.subject, c.school_id,
                    (SELECT COUNT(*) FROM class_students WHERE class_id = c.id)::int AS student_count
             FROM classes c
             WHERE c.teacher_id = $1 AND c.deleted_at IS NULL
             ORDER BY c.name`,
            [teacherId]
        );

        return ApiResponse.success(res, result.rows, 'Classes fetched successfully');
    } catch (error: any) {
        console.error('Get teacher classes error:', error);
        return ApiResponse.error(res, 'Failed to fetch classes', 500, error);
    }
};

// Get a specific class by ID
export const getClassById = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;

        // First verify teacher owns this class
        const classCheck = await pool.query(
            'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2 AND deleted_at IS NULL',
            [id, teacherId]
        );

        if (classCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Class not found or unauthorized', 404);
        }

        const classData = classCheck.rows[0];

        // Get student count
        const countResult = await pool.query(
            'SELECT COUNT(*)::int as count FROM class_students WHERE class_id = $1',
            [id]
        );

        return ApiResponse.success(res, {
            ...classData,
            student_count: countResult.rows[0].count
        }, 'Class fetched successfully');
    } catch (error: any) {
        console.error('Get class by ID error:', error);
        return ApiResponse.error(res, 'Failed to fetch class', 500, error);
    }
};

// Get students in a specific class
export const getClassStudents = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;
        const { search, grade } = req.query;

        // Verify teacher owns this class
        const classCheck = await pool.query(
            'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2 AND deleted_at IS NULL',
            [id, teacherId]
        );

        if (classCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Class not found or unauthorized', 403);
        }

        // Build query with filters
        let query = `
            SELECT u.id, u.full_name, u.email, u.grade, u.avatar_url, u.created_at,
                   cs.enrolled_at,
                   (SELECT COUNT(*)::int FROM projects WHERE owner_id = u.id AND deleted_at IS NULL) AS project_count,
                   (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND verified = true AND deleted_at IS NULL) AS achievement_count
            FROM class_students cs
            JOIN users u ON u.id = cs.student_id
            WHERE cs.class_id = $1
        `;
        const params: any[] = [id];

        if (search) {
            query += ` AND (u.full_name ILIKE $2 OR u.email ILIKE $2)`;
            params.push(`%${search}%`);
        }

        if (grade) {
            query += params.length === 2 
                ? ` AND u.grade = $3` 
                : ` AND u.grade = $2`;
            params.push(grade);
        }

        query += ` ORDER BY u.full_name`;

        const result = await pool.query(query, params);

        return ApiResponse.success(res, result.rows, 'Students fetched successfully');
    } catch (error: any) {
        console.error('Get class students error:', error);
        return ApiResponse.error(res, 'Failed to fetch students', 500, error);
    }
};

// Get all students across all teacher's classes
export const getAllTeacherStudents = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { search, grade, classId } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.success(res, { students: [], total: 0, page, limit }, 'No classes assigned');
        }

        // Build query
        let query = `
            SELECT u.id, u.full_name, u.email, u.grade, u.avatar_url, u.created_at,
                   cs.class_id, c.name as class_name,
                   (SELECT COUNT(*)::int FROM projects WHERE owner_id = u.id AND deleted_at IS NULL) AS project_count,
                   (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND verified = true AND deleted_at IS NULL) AS achievement_count
            FROM class_students cs
            JOIN users u ON u.id = cs.student_id
            JOIN classes c ON c.id = cs.class_id
            WHERE cs.class_id = ANY($1)
        `;
        const params: any[] = [classIds];

        if (search) {
            query += ` AND (u.full_name ILIKE $2 OR u.email ILIKE $2)`;
            params.push(`%${search}%`);
        }

        if (grade) {
            query += params.length === 2 ? ` AND u.grade = $3` : ` AND u.grade = $2`;
            params.push(grade);
        }

        if (classId) {
            query += params.length === 2 ? ` AND cs.class_id = $3` : ` AND cs.class_id = $2`;
            params.push(classId);
        }

        // Get total count
        const countQuery = query.replace(/SELECT u\.id.*FROM/, 'SELECT COUNT(*)::int as total FROM');
        const countResult = await pool.query(countQuery, params);
        const total = countResult.rows[0]?.total || 0;

        // Add pagination
        query += ` ORDER BY u.full_name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        return ApiResponse.success(res, {
            students: result.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }, 'Students fetched successfully');
    } catch (error: any) {
        console.error('Get all teacher students error:', error);
        return ApiResponse.error(res, 'Failed to fetch students', 500, error);
    }
};

// Get a specific student (must be in teacher's class)
export const getTeacherStudent = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;

        // Verify student is in teacher's class
        const studentCheck = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.grade, u.avatar_url, u.bio, u.created_at,
                    cs.class_id, c.name as class_name
             FROM class_students cs
             JOIN users u ON u.id = cs.student_id
             JOIN classes c ON c.id = cs.class_id
             WHERE cs.student_id = $1 AND c.teacher_id = $2 AND c.deleted_at IS NULL`,
            [id, teacherId]
        );

        if (studentCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Student not found or unauthorized', 403);
        }

        const student = studentCheck.rows[0];

        // Get additional stats
        const [projectsResult, achievementsResult] = await Promise.all([
            pool.query(
                `SELECT COUNT(*)::int as total,
                        COUNT(*) FILTER (WHERE status = 'complete')::int as completed
                 FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
                [id]
            ),
            pool.query(
                `SELECT COUNT(*)::int as total,
                        COUNT(*) FILTER (WHERE verified = true)::int as verified
                 FROM achievements WHERE user_id = $1 AND deleted_at IS NULL`,
                [id]
            )
        ]);

        return ApiResponse.success(res, {
            ...student,
            projects: {
                total: projectsResult.rows[0]?.total || 0,
                completed: projectsResult.rows[0]?.completed || 0
            },
            achievements: {
                total: achievementsResult.rows[0]?.total || 0,
                verified: achievementsResult.rows[0]?.verified || 0
            }
        }, 'Student fetched successfully');
    } catch (error: any) {
        console.error('Get teacher student error:', error);
        return ApiResponse.error(res, 'Failed to fetch student', 500, error);
    }
};

// Get teacher's dashboard analytics overview
export const getTeacherAnalytics = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.success(res, {
                totalStudents: 0,
                totalClasses: 0,
                pendingProjects: 0,
                pendingAchievements: 0,
                averageCompletionRate: 0,
                recentActivity: []
            }, 'Analytics fetched successfully');
        }

        // Get student count
        const studentCountResult = await pool.query(
            'SELECT COUNT(DISTINCT student_id)::int as count FROM class_students WHERE class_id = ANY($1)',
            [classIds]
        );

        // Get pending projects from students in teacher's classes
        const pendingProjectsResult = await pool.query(
            `SELECT COUNT(*)::int as count 
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             WHERE cs.class_id = ANY($1) AND p.verified = false AND p.deleted_at IS NULL`,
            [classIds]
        );

        // Get pending achievements from students in teacher's classes
        const pendingAchievementsResult = await pool.query(
            `SELECT COUNT(*)::int as count 
             FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             WHERE cs.class_id = ANY($1) AND a.verified = false AND a.deleted_at IS NULL`,
            [classIds]
        );

        // Get project completion rate
        const completionRateResult = await pool.query(
            `SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'complete')::int as completed
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             WHERE cs.class_id = ANY($1) AND p.deleted_at IS NULL`,
            [classIds]
        );

        const totalProjects = completionRateResult.rows[0]?.total || 0;
        const completedProjects = completionRateResult.rows[0]?.completed || 0;
        const averageCompletionRate = totalProjects > 0 
            ? Math.round((completedProjects / totalProjects) * 100) 
            : 0;

        // Get recent activity
        const recentActivityResult = await pool.query(
            `SELECT 'project' as type, p.id, p.title, p.created_at, u.full_name as student_name
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             JOIN users u ON u.id = p.owner_id
             WHERE cs.class_id = ANY($1) AND p.deleted_at IS NULL
            
             UNION ALL
             
             SELECT 'achievement' as type, a.id, a.title, a.created_at, u.full_name as student_name
             FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             JOIN users u ON u.id = a.user_id
             WHERE cs.class_id = ANY($1) AND a.deleted_at IS NULL
             
             ORDER BY created_at DESC
             LIMIT 10`,
            [classIds]
        );

        return ApiResponse.success(res, {
            totalStudents: studentCountResult.rows[0]?.count || 0,
            totalClasses: classIds.length,
            pendingProjects: pendingProjectsResult.rows[0]?.count || 0,
            pendingAchievements: pendingAchievementsResult.rows[0]?.count || 0,
            averageCompletionRate,
            recentActivity: recentActivityResult.rows
        }, 'Analytics fetched successfully');
    } catch (error: any) {
        console.error('Get teacher analytics error:', error);
        return ApiResponse.error(res, 'Failed to fetch analytics', 500, error);
    }
};

// Get class-specific analytics
export const getClassAnalytics = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;

        // Verify teacher owns this class
        const classCheck = await pool.query(
            'SELECT * FROM classes WHERE id = $1 AND teacher_id = $2 AND deleted_at IS NULL',
            [id, teacherId]
        );

        if (classCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Class not found or unauthorized', 403);
        }

        const classData = classCheck.rows[0];

        // Get student count
        const studentCountResult = await pool.query(
            'SELECT COUNT(*)::int as count FROM class_students WHERE class_id = $1',
            [id]
        );

        // Get project stats
        const projectStatsResult = await pool.query(
            `SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'complete')::int as completed,
                COUNT(*) FILTER (WHERE verified = true)::int as verified
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             WHERE cs.class_id = $1 AND p.deleted_at IS NULL`,
            [id]
        );

        // Get achievement stats
        const achievementStatsResult = await pool.query(
            `SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE verified = true)::int as verified
             FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             WHERE cs.class_id = $1 AND a.deleted_at IS NULL`,
            [id]
        );

        const totalProjects = projectStatsResult.rows[0]?.total || 0;
        const completedProjects = projectStatsResult.rows[0]?.completed || 0;
        const projectCompletionRate = totalProjects > 0 
            ? Math.round((completedProjects / totalProjects) * 100) 
            : 0;

        return ApiResponse.success(res, {
            class: classData,
            totalStudents: studentCountResult.rows[0]?.count || 0,
            projects: {
                total: totalProjects,
                completed: completedProjects,
                verified: projectStatsResult.rows[0]?.verified || 0,
                completionRate: projectCompletionRate
            },
            achievements: {
                total: achievementStatsResult.rows[0]?.total || 0,
                verified: achievementStatsResult.rows[0]?.verified || 0
            }
        }, 'Class analytics fetched successfully');
    } catch (error: any) {
        console.error('Get class analytics error:', error);
        return ApiResponse.error(res, 'Failed to fetch class analytics', 500, error);
    }
};

// Get teacher's notifications
export const getTeacherNotifications = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { unreadOnly } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        let query = `
            SELECT * FROM notifications 
            WHERE user_id = $1
        `;
        const params: any[] = [teacherId];

        if (unreadOnly === 'true') {
            query += ` AND read = false`;
        }

        query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get unread count
        const unreadResult = await pool.query(
            'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND read = false',
            [teacherId]
        );

        return ApiResponse.success(res, {
            notifications: result.rows,
            unreadCount: unreadResult.rows[0]?.count || 0,
            page,
            limit
        }, 'Notifications fetched successfully');
    } catch (error: any) {
        console.error('Get teacher notifications error:', error);
        return ApiResponse.error(res, 'Failed to fetch notifications', 500, error);
    }
};

// Mark notification as read
export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;

        const result = await pool.query(
            'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, teacherId]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'Notification not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'Notification marked as read');
    } catch (error: any) {
        console.error('Mark notification read error:', error);
        return ApiResponse.error(res, 'Failed to mark notification as read', 500, error);
    }
};

// Mark all notifications as read
export const markAllNotificationsRead = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;

        await pool.query(
            'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
            [teacherId]
        );

        return ApiResponse.success(res, null, 'All notifications marked as read');
    } catch (error: any) {
        console.error('Mark all notifications read error:', error);
        return ApiResponse.error(res, 'Failed to mark all notifications as read', 500, error);
    }
};

// Get pending projects from teacher's students
export const getPendingProjects = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.success(res, [], 'No pending projects');
        }

        const result = await pool.query(
            `SELECT p.*, u.full_name as student_name, u.grade,
                    pm.media_url as thumbnail_url
             FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             JOIN users u ON u.id = p.owner_id
             LEFT JOIN (
                 SELECT DISTINCT ON (project_id) project_id, media_url 
                 FROM project_media 
                 WHERE (media_type = 'image' OR media_type = 'video')
                 ORDER BY project_id, created_at ASC
             ) pm ON p.id = pm.project_id
             WHERE cs.class_id = ANY($1) AND p.verified = false AND p.deleted_at IS NULL
             ORDER BY p.created_at DESC`,
            [classIds]
        );

        return ApiResponse.success(res, result.rows, 'Pending projects fetched successfully');
    } catch (error: any) {
        console.error('Get pending projects error:', error);
        return ApiResponse.error(res, 'Failed to fetch pending projects', 500, error);
    }
};

// Get pending achievements from teacher's students
export const getPendingAchievements = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.success(res, [], 'No pending achievements');
        }

        const result = await pool.query(
            `SELECT a.*, u.full_name as student_name, u.grade
             FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             JOIN users u ON u.id = a.user_id
             WHERE cs.class_id = ANY($1) AND a.verified = false AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC`,
            [classIds]
        );

        return ApiResponse.success(res, result.rows, 'Pending achievements fetched successfully');
    } catch (error: any) {
        console.error('Get pending achievements error:', error);
        return ApiResponse.error(res, 'Failed to fetch pending achievements', 500, error);
    }
};

// Reject a project with reason
export const rejectProject = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;
        const { reason } = req.body;

        // Get teacher's classes to verify student belongs to one of them
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.error(res, 'No classes assigned', 403);
        }

        // Verify project belongs to a student in teacher's class
        const projectCheck = await pool.query(
            `SELECT p.* FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             WHERE p.id = $1 AND cs.class_id = ANY($2) AND p.deleted_at IS NULL`,
            [id, classIds]
        );

        if (projectCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 403);
        }

        // Add feedback with rejection
        await pool.query(
            `INSERT INTO project_feedback (project_id, user_id, comment, rating)
             VALUES ($1, $2, $3, NULL)`,
            [id, teacherId, reason || 'Project rejected']
        );

        // Update project status to rejected
        const result = await pool.query(
            `UPDATE projects 
             SET verified = false, verified_by = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [teacherId, id]
        );

        return ApiResponse.success(res, result.rows[0], 'Project rejected');
    } catch (error: any) {
        console.error('Reject project error:', error);
        return ApiResponse.error(res, 'Failed to reject project', 500, error);
    }
};

// Reject an achievement with reason
export const rejectAchievement = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;
        const { reason } = req.body;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.error(res, 'No classes assigned', 403);
        }

        // Verify achievement belongs to a student in teacher's class
        const achievementCheck = await pool.query(
            `SELECT a.* FROM achievements a
             JOIN class_students cs ON cs.student_id = a.user_id
             WHERE a.id = $1 AND cs.class_id = ANY($2) AND a.deleted_at IS NULL`,
            [id, classIds]
        );

        if (achievementCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Achievement not found or unauthorized', 403);
        }

        // Add feedback note (could add a new table for achievement feedback if needed)
        // For now, we'll just update verified_by to track who rejected it
        const result = await pool.query(
            `UPDATE achievements 
             SET verified = false, verified_by = $1, verified_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [teacherId, id]
        );

        return ApiResponse.success(res, result.rows[0], 'Achievement rejected');
    } catch (error: any) {
        console.error('Reject achievement error:', error);
        return ApiResponse.error(res, 'Failed to reject achievement', 500, error);
    }
};

// Add feedback to a project
export const addProjectFeedback = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as AuthRequest).user.id;
        const { id } = req.params;
        const { comment, rating } = req.body;

        // Get teacher's classes
        const classesResult = await pool.query(
            'SELECT id FROM classes WHERE teacher_id = $1 AND deleted_at IS NULL',
            [teacherId]
        );

        const classIds = classesResult.rows.map(c => c.id);

        if (classIds.length === 0) {
            return ApiResponse.error(res, 'No classes assigned', 403);
        }

        // Verify project belongs to a student in teacher's class
        const projectCheck = await pool.query(
            `SELECT p.* FROM projects p
             JOIN class_students cs ON cs.student_id = p.owner_id
             WHERE p.id = $1 AND cs.class_id = ANY($2) AND p.deleted_at IS NULL`,
            [id, classIds]
        );

        if (projectCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 403);
        }

        const result = await pool.query(
            `INSERT INTO project_feedback (project_id, user_id, comment, rating)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, teacherId, comment, rating || null]
        );

        return ApiResponse.success(res, result.rows[0], 'Feedback added successfully', 201);
    } catch (error: any) {
        console.error('Add project feedback error:', error);
        return ApiResponse.error(res, 'Failed to add feedback', 500, error);
    }
};
