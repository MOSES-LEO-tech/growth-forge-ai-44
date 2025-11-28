import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Get all projects for authenticated user
export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        console.log(`Fetching projects for user: ${userId}`);

        const result = await pool.query(
            'SELECT * FROM projects WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
            [userId]
        );

        return ApiResponse.success(res, result.rows, 'Projects fetched successfully');
    } catch (error: any) {
        console.error('Get projects error:', error);
        return ApiResponse.error(res, 'Failed to fetch projects', 500, error);
    }
};

// Get single project by ID
export const getProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        console.log(`Fetching project ${id} for user: ${userId}`);

        const result = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'Project fetched successfully');
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
        console.log(`Creating project for user ${userId}:`, { title, status });

        // Validation
        if (!title || !start_date) {
            return ApiResponse.error(res, 'Title and start date are required', 400);
        }

        const validStatuses = ['pending', 'ongoing', 'complete'];
        if (status && !validStatuses.includes(status)) {
            return ApiResponse.error(res, 'Invalid status value', 400);
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
        console.log(`Updating project ${id} for user ${userId}`);

        // Check if project exists and belongs to user
        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 404);
        }

        // Validation
        if (status) {
            const validStatuses = ['pending', 'ongoing', 'complete'];
            if (!validStatuses.includes(status)) {
                return ApiResponse.error(res, 'Invalid status value', 400);
            }
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
        console.log(`Deleting project ${id} for user ${userId}`);

        // Check if project exists and belongs to user
        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return ApiResponse.error(res, 'Project not found or unauthorized', 404);
        }

        // Soft delete
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
