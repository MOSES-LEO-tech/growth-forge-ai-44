import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Get all projects for authenticated user or all pending for teachers
export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const userRole = (req as any).user.role;
        const { pending } = req.query;

        let query = `
            SELECT p.*, pm.media_url as thumbnail_url, u.full_name as student_name
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN (
                SELECT DISTINCT ON (project_id) project_id, media_url 
                FROM project_media 
                WHERE media_type = 'image' OR media_type = 'video'
                ORDER BY project_id, created_at ASC
            ) pm ON p.id = pm.project_id
            WHERE p.deleted_at IS NULL 
        `;
        const params: any[] = [];

        // Teacher viewing pending
        if ((userRole === 'teacher' || userRole === 'admin') && pending === 'true') {
            query += ` AND p.verified = false`;
        } else {
            // Default: My projects
            query += ` AND p.owner_id = $1`;
            params.push(userId);
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);

        return ApiResponse.success(res, result.rows, 'Projects fetched successfully');
    } catch (error: any) {
        console.error('Get projects error:', error);
        return ApiResponse.error(res, 'Failed to fetch projects', 500, error);
    }
};

// Get single project by ID with Media and Feedback
export const getProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        // Fetch project details
        const projectResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (projectResult.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found', 404);
        }

        const project = projectResult.rows[0];

        // Check ownership or visibility (if needed in future) - for now assuming owner or authorized viewer
        // In a real app, we'd check if public or if viewer is teacher/parent.
        // For simplicity, we allow if specific ID matches (and route middleware handles role access).

        // Fetch media
        const mediaResult = await pool.query(
            'SELECT * FROM project_media WHERE project_id = $1 AND deleted_at IS NULL',
            [id]
        );

        // Fetch feedback
        const feedbackResult = await pool.query(`
            SELECT pf.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
            FROM project_feedback pf
            JOIN users u ON pf.user_id = u.id
            WHERE pf.project_id = $1 AND pf.deleted_at IS NULL
            ORDER BY pf.created_at DESC
        `, [id]);

        return ApiResponse.success(res, {
            ...project,
            media: mediaResult.rows,
            feedback: feedbackResult.rows
        }, 'Project fetched successfully');
    } catch (error: any) {
        console.error('Get project error:', error);
        return ApiResponse.error(res, 'Failed to fetch project', 500, error);
    }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, start_date, end_date, status, skills } = req.body;

        if (!title || !start_date) {
            return ApiResponse.error(res, 'Title and start date are required', 400);
        }

        const result = await pool.query(
            `INSERT INTO projects (owner_id, title, description, start_date, end_date, status, skills)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, title, description || null, start_date, end_date || null, status || 'pending', skills || null]
        );

        return ApiResponse.success(res, result.rows[0], 'Project created successfully', 201);
    } catch (error: any) {
        console.error('Create project error:', error);
        return ApiResponse.error(res, 'Failed to create project', 500, error);
    }
};

// Update existing project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { title, description, start_date, end_date, status, skills } = req.body;

        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 404);
        }

        const result = await pool.query(
            `UPDATE projects 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 start_date = COALESCE($3, start_date),
                 end_date = $4,
                 status = COALESCE($5, status),
                 skills = $6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND owner_id = $8
             RETURNING *`,
            [title, description, start_date, end_date, status, skills, id, userId]
        );

        return ApiResponse.success(res, result.rows[0], 'Project updated successfully');
    } catch (error: any) {
        console.error('Update project error:', error);
        return ApiResponse.error(res, 'Failed to update project', 500, error);
    }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 404);
        }

        await pool.query(
            'UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        return ApiResponse.success(res, null, 'Project deleted successfully');
    } catch (error: any) {
        console.error('Delete project error:', error);
        return ApiResponse.error(res, 'Failed to delete project', 500, error);
    }
};

// Add Media to Project
export const addMedia = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { mediaType, mediaUrl, fileName, fileSize, thumbnailUrl } = req.body;

        // Verify project ownership
        const projectCheck = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (projectCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 404);
        }

        const result = await pool.query(
            `INSERT INTO project_media (project_id, media_type, media_url, file_name, file_size, uploaded_by, thumbnail_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, mediaType, mediaUrl, fileName, fileSize, userId, thumbnailUrl]
        );

        return ApiResponse.success(res, result.rows[0], 'Media added successfully', 201);
    } catch (error: any) {
        console.error('Add media error:', error);
        return ApiResponse.error(res, 'Failed to add media', 500, error);
    }
};

// Verify Project (Teacher only)
export const verifyProject = async (req: Request, res: Response) => {
    try {
        const teacherId = (req as any).user.id;
        const { id } = req.params;

        // Ensure user is teacher via Middleware, but redundant check is fine
        const result = await pool.query(
            `UPDATE projects 
             SET verified = true, verified_by = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [teacherId, id]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'Project verified successfully');
    } catch (error: any) {
        console.error('Verify project error:', error);
        return ApiResponse.error(res, 'Failed to verify project', 500, error);
    }
};

// Add Feedback
export const addFeedback = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { comment, rating } = req.body;

        const result = await pool.query(
            `INSERT INTO project_feedback (project_id, user_id, comment, rating)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, userId, comment, rating]
        );

        return ApiResponse.success(res, result.rows[0], 'Feedback added successfully', 201);
    } catch (error: any) {
        console.error('Add feedback error:', error);
        return ApiResponse.error(res, 'Failed to add feedback', 500, error);
    }
};
