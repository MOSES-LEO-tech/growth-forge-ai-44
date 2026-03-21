import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Extend Request type to include schoolId
interface AuthRequest extends Request {
    schoolId?: number;
}

// ============================================
// Module 1: School Overview / Metrics
// ============================================

export const getSchoolMetrics = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Get aggregated metrics for the school
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND deleted_at IS NULL) as total_students,
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND deleted_at IS NULL) as total_teachers,
                (SELECT COUNT(*) FROM parent_student_links psl 
                 JOIN users u ON psl.parent_id = u.id 
                 WHERE u.school_id = $1 AND u.deleted_at IS NULL) as total_parents,
                (SELECT COUNT(*) FROM projects WHERE owner_id IN (SELECT id FROM users WHERE school_id = $1) AND deleted_at IS NULL) as total_projects,
                (SELECT COUNT(*) FROM achievements WHERE user_id IN (SELECT id FROM users WHERE school_id = $1) AND deleted_at IS NULL) as achievement_completions,
                (SELECT COUNT(*) FROM ai_chat_logs WHERE user_id IN (SELECT id FROM users WHERE school_id = $1)) as ai_usage_count
            `;
        
        const result = await pool.query(query, [schoolId]);
        const metrics = result.rows[0];

        // Convert to numbers
        const formattedMetrics = {
            totalStudents: parseInt(metrics.total_students) || 0,
            totalTeachers: parseInt(metrics.total_teachers) || 0,
            totalParents: parseInt(metrics.total_parents) || 0,
            totalProjects: parseInt(metrics.total_projects) || 0,
            achievementCompletions: parseInt(metrics.achievement_completions) || 0,
            aiUsageCount: parseInt(metrics.ai_usage_count) || 0,
            storageUsed: 2.4 // Placeholder - would need storage service integration
        };

        return ApiResponse.success(res, formattedMetrics, 'School metrics retrieved successfully');
    } catch (error: any) {
        console.error('Get school metrics error:', error);
        return ApiResponse.error(res, 'Failed to fetch school metrics', 500, error);
    }
};

// ============================================
// Module 2: User Management
// ============================================

// Get all users (students, teachers, parents) for the school
export const getSchoolUsers = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { role, search = '', page = 1, limit = 20 } = req.query;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const offset = (Number(page) - 1) * Number(limit);
        const params: any[] = [schoolId];
        let conditions: string[] = ['u.school_id = $1', 'u.deleted_at IS NULL'];

        if (role) {
            conditions.push(`u.role = $${params.length + 1}`);
            params.push(role as string);
        }

        if (search) {
            conditions.push(`(u.full_name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        
        // Get users with their levels
        const query = `
            SELECT 
                u.id, u.email, u.full_name, u.role, u.avatar_url, u.grade, u.created_at,
                sl.level as student_level, sl.points
            FROM users u
            LEFT JOIN student_levels sl ON u.id = sl.user_id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(limit, offset);
        const result = await pool.query(query, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
        const countResult = await pool.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        return ApiResponse.success(res, {
            users: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        }, 'Users retrieved successfully');
    } catch (error: any) {
        console.error('Get school users error:', error);
        return ApiResponse.error(res, 'Failed to fetch users', 500, error);
    }
};

// Create a new user (student, teacher, or parent)
export const createSchoolUser = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { email, full_name, role, grade, password } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        if (!email || !full_name || !role) {
            return ApiResponse.error(res, 'Email, full name, and role are required', 400);
        }

        // Check if email already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return ApiResponse.error(res, 'Email already exists', 400);
        }

        // Hash password if provided
        const bcrypt = require('bcrypt');
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, password, full_name, role, school_id, grade, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id, email, full_name, role, school_id, grade, created_at`,
            [email, hashedPassword, full_name, role, schoolId, grade || null]
        );

        const user = result.rows[0];

        // If student, create student level entry
        if (role === 'student') {
            await pool.query(
                'INSERT INTO student_levels (user_id, level, points, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [user.id, 'basic', 0]
            );
        }

        return ApiResponse.success(res, user, 'User created successfully', 201);
    } catch (error: any) {
        console.error('Create school user error:', error);
        return ApiResponse.error(res, 'Failed to create user', 500, error);
    }
};

// Update user (suspend, change grade, etc.)
export const updateSchoolUser = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { userId } = req.params;
        const { full_name, grade, locked_until } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Verify user belongs to this school
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL',
            [userId, schoolId]
        );

        if (userCheck.rows.length === 0) {
            return ApiResponse.error(res, 'User not found in your school', 404);
        }

        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            params.push(full_name);
        }

        if (grade !== undefined) {
            updates.push(`grade = $${paramIndex++}`);
            params.push(grade);
        }

        if (locked_until !== undefined) {
            updates.push(`locked_until = $${paramIndex++}`);
            params.push(locked_until);
        }

        if (updates.length === 0) {
            return ApiResponse.error(res, 'No fields to update', 400);
        }

        updates.push(`updated_at = NOW()`);
        params.push(userId);

        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, email, full_name, role, grade, locked_until
        `;

        const result = await pool.query(query, params);

        return ApiResponse.success(res, result.rows[0], 'User updated successfully');
    } catch (error: any) {
        console.error('Update school user error:', error);
        return ApiResponse.error(res, 'Failed to update user', 500, error);
    }
};

// Delete/soft-delete user
export const deleteSchoolUser = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { userId } = req.params;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Soft delete user
        const result = await pool.query(
            `UPDATE users 
             SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [userId, schoolId]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'User not found in your school', 404);
        }

        return ApiResponse.success(res, { id: result.rows[0].id }, 'User deleted successfully');
    } catch (error: any) {
        console.error('Delete school user error:', error);
        return ApiResponse.error(res, 'Failed to delete user', 500, error);
    }
};

// ============================================
// Module 3: Academic Structure (Classes, Subjects, Years)
// ============================================

export const getClasses = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT c.*, 
                   u.full_name as teacher_name,
                   (SELECT COUNT(*) FROM user_classes WHERE class_id = c.id) as student_count
            FROM classes c
            LEFT JOIN users u ON c.teacher_id = u.id
            WHERE c.school_id = $1 AND c.deleted_at IS NULL
            ORDER BY c.grade, c.name
        `;

        const result = await pool.query(query, [schoolId]);
        return ApiResponse.success(res, result.rows, 'Classes retrieved successfully');
    } catch (error: any) {
        console.error('Get classes error:', error);
        return ApiResponse.error(res, 'Failed to fetch classes', 500, error);
    }
};

export const createClass = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { name, grade, teacher_id } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const result = await pool.query(
            `INSERT INTO classes (name, grade, school_id, teacher_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING *`,
            [name, grade, schoolId, teacher_id || null]
        );

        return ApiResponse.success(res, result.rows[0], 'Class created successfully', 201);
    } catch (error: any) {
        console.error('Create class error:', error);
        return ApiResponse.error(res, 'Failed to create class', 500, error);
    }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT s.*, u.full_name as subject_head_name
            FROM subjects s
            LEFT JOIN users u ON s.subject_head_id = u.id
            WHERE s.school_id = $1 AND s.deleted_at IS NULL
            ORDER BY s.grade, s.name
        `;

        const result = await pool.query(query, [schoolId]);
        return ApiResponse.success(res, result.rows, 'Subjects retrieved successfully');
    } catch (error: any) {
        console.error('Get subjects error:', error);
        return ApiResponse.error(res, 'Failed to fetch subjects', 500, error);
    }
};

export const getAcademicYears = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT * FROM academic_years 
            WHERE school_id = $1 
            ORDER BY start_date DESC
        `;

        const result = await pool.query(query, [schoolId]);
        return ApiResponse.success(res, result.rows, 'Academic years retrieved successfully');
    } catch (error: any) {
        console.error('Get academic years error:', error);
        return ApiResponse.error(res, 'Failed to fetch academic years', 500, error);
    }
};

// ============================================
// Module 4: Portfolio Moderation
// ============================================

export const getSchoolProjects = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { status, featured, flagged, page = 1, limit = 20 } = req.query;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const offset = (Number(page) - 1) * Number(limit);
        const params: any[] = [schoolId];
        let conditions: string[] = [
            'p.owner_id IN (SELECT id FROM users WHERE school_id = $1)',
            'p.deleted_at IS NULL'
        ];

        if (status) {
            conditions.push(`p.status = $${params.length + 1}`);
            params.push(status);
        }

        if (featured !== undefined) {
            conditions.push(`p.featured = $${params.length + 1}`);
            params.push(featured === 'true');
        }

        if (flagged !== undefined) {
            conditions.push(`p.flagged = $${params.length + 1}`);
            params.push(flagged === 'true');
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const query = `
            SELECT p.*, u.full_name as student_name, u.avatar_url
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limit, offset);
        const result = await pool.query(query, params);

        return ApiResponse.success(res, {
            projects: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit)
            }
        }, 'Projects retrieved successfully');
    } catch (error: any) {
        console.error('Get school projects error:', error);
        return ApiResponse.error(res, 'Failed to fetch projects', 500, error);
    }
};

export const moderateProject = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { projectId } = req.params;
        const { status, featured, flagged } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Verify project belongs to school
        const projectCheck = await pool.query(
            `SELECT p.id FROM projects p
             JOIN users u ON p.owner_id = u.id
             WHERE p.id = $1 AND u.school_id = $2 AND p.deleted_at IS NULL`,
            [projectId, schoolId]
        );

        if (projectCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found in your school', 404);
        }

        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (featured !== undefined) {
            updates.push(`featured = $${paramIndex++}`);
            params.push(featured);
        }

        if (flagged !== undefined) {
            updates.push(`flagged = $${paramIndex++}`);
            params.push(flagged);
        }

        if (updates.length === 0) {
            return ApiResponse.error(res, 'No fields to update', 400);
        }

        updates.push(`updated_at = NOW()`);
        params.push(projectId);

        const query = `
            UPDATE projects 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, params);

        return ApiResponse.success(res, result.rows[0], 'Project moderated successfully');
    } catch (error: any) {
        console.error('Moderate project error:', error);
        return ApiResponse.error(res, 'Failed to moderate project', 500, error);
    }
};

// ============================================
// Module 5: Achievement Control
// ============================================

export const getSchoolAchievements = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT sa.*, 
                   (SELECT COUNT(*) FROM achievements WHERE school_achievement_id = sa.id) as recipient_count
            FROM school_achievements sa
            WHERE sa.school_id = $1 AND sa.deleted_at IS NULL
            ORDER BY sa.created_at DESC
        `;

        const result = await pool.query(query, [schoolId]);
        return ApiResponse.success(res, result.rows, 'School achievements retrieved successfully');
    } catch (error: any) {
        console.error('Get school achievements error:', error);
        return ApiResponse.error(res, 'Failed to fetch achievements', 500, error);
    }
};

export const createSchoolAchievement = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { title, description, criteria, type } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const result = await pool.query(
            `INSERT INTO school_achievements (title, description, criteria, type, school_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING *`,
            [title, description, criteria, type, schoolId]
        );

        return ApiResponse.success(res, result.rows[0], 'Achievement created successfully', 201);
    } catch (error: any) {
        console.error('Create school achievement error:', error);
        return ApiResponse.error(res, 'Failed to create achievement', 500, error);
    }
};

// ============================================
// Module 6: AI Governance
// ============================================

export const getAIUsageStats = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Get daily requests
        const dailyQuery = `
            SELECT COUNT(*) as daily_requests
            FROM ai_chat_logs
            WHERE user_id IN (SELECT id FROM users WHERE school_id = $1)
            AND created_at >= NOW() - INTERVAL '24 hours'
        `;
        
        const dailyResult = await pool.query(dailyQuery, [schoolId]);

        // Get total credits
        const creditsQuery = `
            SELECT SUM(credits_used) as total_used
            FROM ai_usage_logs
            WHERE school_id = $1
        `;
        
        const creditsResult = await pool.query(creditsQuery, [schoolId]);

        // Get top users
        const topUsersQuery = `
            SELECT u.full_name, COUNT(acl.id) as request_count
            FROM ai_chat_logs acl
            JOIN users u ON acl.user_id = u.id
            WHERE u.school_id = $1
            GROUP BY u.id, u.full_name
            ORDER BY request_count DESC
            LIMIT 5
        `;
        
        const topUsersResult = await pool.query(topUsersQuery, [schoolId]);

        return ApiResponse.success(res, {
            dailyRequests: parseInt(dailyResult.rows[0].daily_requests) || 0,
            totalCredits: 10000, // Placeholder
            usedCredits: parseInt(creditsResult.rows[0].total_used) || 0,
            topUsers: topUsersResult.rows
        }, 'AI usage stats retrieved successfully');
    } catch (error: any) {
        console.error('Get AI usage stats error:', error);
        return ApiResponse.error(res, 'Failed to fetch AI usage stats', 500, error);
    }
};

// ============================================
// Module 7: Analytics & Reports
// ============================================

export const getStudentPerformanceReport = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT 
                u.id, u.full_name, u.grade,
                COUNT(DISTINCT p.id) as project_count,
                COUNT(DISTINCT a.id) as achievement_count,
                COALESCE(SUM(sl.points), 0) as total_points
            FROM users u
            LEFT JOIN projects p ON u.id = p.owner_id AND p.deleted_at IS NULL
            LEFT JOIN achievements a ON u.id = a.user_id AND a.deleted_at IS NULL
            LEFT JOIN student_levels sl ON u.id = sl.user_id
            WHERE u.school_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
            GROUP BY u.id, u.full_name, u.grade
            ORDER BY total_points DESC
            LIMIT 50
        `;

        const result = await pool.query(query, [schoolId]);
        return ApiResponse.success(res, result.rows, 'Student performance report generated');
    } catch (error: any) {
        console.error('Get student performance report error:', error);
        return ApiResponse.error(res, 'Failed to generate report', 500, error);
    }
};

// ============================================
// Module 8: School Settings
// ============================================

export const getSchoolSettings = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        
        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        const query = `
            SELECT s.*, ss.*
            FROM schools s
            LEFT JOIN school_settings ss ON s.id = ss.school_id
            WHERE s.id = $1 AND s.deleted_at IS NULL
        `;

        const result = await pool.query(query, [schoolId]);

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'School settings retrieved successfully');
    } catch (error: any) {
        console.error('Get school settings error:', error);
        return ApiResponse.error(res, 'Failed to fetch settings', 500, error);
    }
};

export const updateSchoolSettings = async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.schoolId;
        const { name, logo_url, theme_color, parent_access_enabled, ai_features_enabled, email_notifications } = req.body;

        if (!schoolId) {
            return ApiResponse.error(res, 'School ID not found', 400);
        }

        // Update school
        const schoolUpdates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            schoolUpdates.push(`name = $${paramIndex++}`);
            params.push(name);
        }

        if (logo_url !== undefined) {
            schoolUpdates.push(`logo_url = $${paramIndex++}`);
            params.push(logo_url);
        }

        if (schoolUpdates.length > 0) {
            schoolUpdates.push(`updated_at = NOW()`);
            params.push(schoolId);

            await pool.query(
                `UPDATE schools SET ${schoolUpdates.join(', ')} WHERE id = $${paramIndex}`,
                params
            );
        }

        // Upsert school settings
        await pool.query(
            `INSERT INTO school_settings (school_id, theme_color, parent_access_enabled, ai_features_enabled, email_notifications, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             ON CONFLICT (school_id) DO UPDATE SET
                theme_color = COALESCE($2, school_settings.theme_color),
                parent_access_enabled = COALESCE($3, school_settings.parent_access_enabled),
                ai_features_enabled = COALESCE($4, school_settings.ai_features_enabled),
                email_notifications = COALESCE($5, school_settings.email_notifications),
                updated_at = NOW()`,
            [schoolId, theme_color || null, parent_access_enabled ?? true, ai_features_enabled ?? true, email_notifications ?? true]
        );

        return ApiResponse.success(res, { success: true }, 'School settings updated successfully');
    } catch (error: any) {
        console.error('Update school settings error:', error);
        return ApiResponse.error(res, 'Failed to update settings', 500, error);
    }
};
