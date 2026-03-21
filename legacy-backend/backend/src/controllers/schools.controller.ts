import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Get list of schools (with pagination & search)
export const getSchools = async (req: Request, res: Response) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search = '',
            type = '',
            level = ''
        } = req.query;
        
        const offset = (Number(page) - 1) * Number(limit);
        const params: any[] = [];
        let conditions: string[] = ['deleted_at IS NULL'];

        // Search filter
        if (search) {
            conditions.push(`(name ILIKE $${params.length + 1} OR location ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        // Type filter
        if (type) {
            conditions.push(`type = $${params.length + 1}`);
            params.push(type);
        }

        // Level filter
        if (level) {
            conditions.push(`level ILIKE $${params.length + 1}`);
            params.push(`%${level}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get schools with user counts
        const query = `
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM users WHERE school_id = s.id AND deleted_at IS NULL) as student_count,
                (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role IN ('teacher', 'school_admin') AND deleted_at IS NULL) as teacher_count
            FROM schools s
            ${whereClause}
            ORDER BY s.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        
        params.push(limit, offset);
        const result = await pool.query(query, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM schools ${whereClause}`;
        const countResult = await pool.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        return ApiResponse.success(res, {
            schools: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        }, 'Schools retrieved successfully');
    } catch (error: any) {
        console.error('Get schools error:', error);
        return ApiResponse.error(res, 'Failed to fetch schools', 500, error);
    }
};

// Get single school by ID
export const getSchool = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT s.*,
                    (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role = 'student' AND deleted_at IS NULL) as student_count,
                    (SELECT COUNT(*) FROM users WHERE school_id = s.id AND role IN ('teacher', 'school_admin') AND deleted_at IS NULL) as teacher_count,
                    (SELECT COUNT(*) FROM projects WHERE owner_id IN (SELECT id FROM users WHERE school_id = s.id) AND deleted_at IS NULL) as project_count,
                    (SELECT COUNT(*) FROM achievements WHERE user_id IN (SELECT id FROM users WHERE school_id = s.id) AND deleted_at IS NULL) as achievement_count
             FROM schools s
             WHERE s.id = $1 AND s.deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'School retrieved successfully');
    } catch (error: any) {
        console.error('Get school error:', error);
        return ApiResponse.error(res, 'Failed to fetch school', 500, error);
    }
};

// Create new school (admin only)
export const createSchool = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;

        // Only admins can create schools
        if (userRole !== 'admin') {
            return ApiResponse.error(res, 'Only administrators can create schools', 403);
        }

        const {
            name,
            location,
            education_system,
            description,
            type,
            level,
            curriculum,
            contact_email,
            contact_phone,
            address,
            banner_url,
            website
        } = req.body;

        if (!name) {
            return ApiResponse.error(res, 'School name is required', 400);
        }

        const result = await pool.query(
            `INSERT INTO schools (name, location, education_system, description, type, level, curriculum, contact_email, contact_phone, address, banner_url, website, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                name,
                location,
                education_system,
                description,
                type,
                level,
                curriculum ? JSON.stringify(curriculum) : null,
                contact_email,
                contact_phone,
                address,
                banner_url,
                website,
                userId
            ]
        );

        return ApiResponse.success(res, result.rows[0], 'School created successfully', 201);
    } catch (error: any) {
        console.error('Create school error:', error);
        return ApiResponse.error(res, 'Failed to create school', 500, error);
    }
};

// Update school (admin only)
export const updateSchool = async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user.role;
        const { id } = req.params;

        // Only admins can update schools
        if (userRole !== 'admin') {
            return ApiResponse.error(res, 'Only administrators can update schools', 403);
        }

        // Check if school exists
        const schoolCheck = await pool.query('SELECT id FROM schools WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (schoolCheck.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        const {
            name,
            location,
            education_system,
            description,
            type,
            level,
            curriculum,
            contact_email,
            contact_phone,
            address,
            banner_url,
            website,
            is_active
        } = req.body;

        const result = await pool.query(
            `UPDATE schools 
             SET name = COALESCE($1, name),
                 location = COALESCE($2, location),
                 education_system = COALESCE($3, education_system),
                 description = COALESCE($4, description),
                 type = COALESCE($5, type),
                 level = COALESCE($6, level),
                 curriculum = COALESCE($7, curriculum),
                 contact_email = COALESCE($8, contact_email),
                 contact_phone = COALESCE($9, contact_phone),
                 address = COALESCE($10, address),
                 banner_url = COALESCE($11, banner_url),
                 website = COALESCE($12, website),
                 is_active = COALESCE($13, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $14
             RETURNING *`,
            [
                name,
                location,
                education_system,
                description,
                type,
                level,
                curriculum ? JSON.stringify(curriculum) : null,
                contact_email,
                contact_phone,
                address,
                banner_url,
                website,
                is_active,
                id
            ]
        );

        return ApiResponse.success(res, result.rows[0], 'School updated successfully');
    } catch (error: any) {
        console.error('Update school error:', error);
        return ApiResponse.error(res, 'Failed to update school', 500, error);
    }
};

// Soft delete school (admin only)
export const deleteSchool = async (req: Request, res: Response) => {
    try {
        const userRole = (req as any).user.role;
        const { id } = req.params;

        // Only admins can delete schools
        if (userRole !== 'admin') {
            return ApiResponse.error(res, 'Only administrators can delete schools', 403);
        }

        const result = await pool.query(
            'UPDATE schools SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'School deleted successfully');
    } catch (error: any) {
        console.error('Delete school error:', error);
        return ApiResponse.error(res, 'Failed to delete school', 500, error);
    }
};

// Get school statistics
export const getSchoolStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if school exists
        const schoolCheck = await pool.query('SELECT name FROM schools WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (schoolCheck.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        const stats = await pool.query(
            `SELECT 
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND deleted_at IS NULL) as total_students,
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND deleted_at IS NULL) as total_teachers,
                (SELECT COUNT(*) FROM projects WHERE owner_id IN (SELECT id FROM users WHERE school_id = $1) AND deleted_at IS NULL) as total_projects,
                (SELECT COUNT(*) FROM achievements WHERE user_id IN (SELECT id FROM users WHERE school_id = $1) AND deleted_at IS NULL) as total_achievements,
                (SELECT COUNT(*) FROM events WHERE school_id = $1 AND deleted_at IS NULL) as total_events`,
            [id]
        );

        // Get recent achievements
        const recentAchievements = await pool.query(
            `SELECT a.*, u.full_name as student_name
             FROM achievements a
             JOIN users u ON a.user_id = u.id
             WHERE u.school_id = $1 AND a.deleted_at IS NULL
             ORDER BY a.created_at DESC
             LIMIT 5`,
            [id]
        );

        // Get top students by points
        const topStudents = await pool.query(
            `SELECT u.id, u.full_name, u.avatar_url, sl.level, sl.points
             FROM users u
             LEFT JOIN student_levels sl ON u.id = sl.user_id
             WHERE u.school_id = $1 AND u.role = 'student' AND u.deleted_at IS NULL
             ORDER BY sl.points DESC NULLS LAST
             LIMIT 5`,
            [id]
        );

        return ApiResponse.success(res, {
            stats: stats.rows[0],
            recentAchievements: recentAchievements.rows,
            topStudents: topStudents.rows
        }, 'School statistics retrieved successfully');
    } catch (error: any) {
        console.error('Get school stats error:', error);
        return ApiResponse.error(res, 'Failed to fetch school statistics', 500, error);
    }
};

// Get users belonging to a school
export const getSchoolUsers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // Check if school exists
        const schoolCheck = await pool.query('SELECT name FROM schools WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (schoolCheck.rows.length === 0) {
            return ApiResponse.error(res, 'School not found', 404);
        }

        let query = `
            SELECT u.id, u.full_name, u.email, u.role, u.avatar_url, u.grade, u.created_at
            FROM users u
            WHERE u.school_id = $1 AND u.deleted_at IS NULL
        `;
        const params: any[] = [id];

        if (role) {
            query += ` AND u.role = $2`;
            params.push(role);
        }

        query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        return ApiResponse.success(res, {
            users: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit)
            }
        }, 'School users retrieved successfully');
    } catch (error: any) {
        console.error('Get school users error:', error);
        return ApiResponse.error(res, 'Failed to fetch school users', 500, error);
    }
};
