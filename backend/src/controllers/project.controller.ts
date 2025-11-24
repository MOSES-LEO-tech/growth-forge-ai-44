import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get all projects for authenticated user
export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const result = await pool.query(
            'SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        res.status(200).json({ projects: result.rows });
    } catch (error: any) {
        console.error('Get projects error:', error);
        res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
};

// Get single project by ID
export const getProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json({ project: result.rows[0] });
    } catch (error: any) {
        console.error('Get project error:', error);
        res.status(500).json({ message: 'Failed to fetch project', error: error.message });
    }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { title, description, start_date, end_date, status, skills } = req.body;

        // Validation
        if (!title || !start_date) {
            return res.status(400).json({ message: 'Title and start date are required' });
        }

        const validStatuses = ['pending', 'ongoing', 'complete'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const result = await pool.query(
            `INSERT INTO projects (owner_id, title, description, start_date, end_date, status, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [userId, title, description || null, start_date, end_date || null, status || 'pending', skills || null]
        );

        res.status(201).json({
            message: 'Project created successfully',
            project: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Failed to create project', error: error.message });
    }
};

// Update existing project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { title, description, start_date, end_date, status, skills } = req.body;

        // Check if project exists and belongs to user
        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or unauthorized' });
        }

        // Validation
        if (status) {
            const validStatuses = ['pending', 'ongoing', 'complete'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Invalid status value' });
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

        res.status(200).json({
            message: 'Project updated successfully',
            project: result.rows[0]
        });
    } catch (error: any) {
        console.error('Update project error:', error);
        res.status(500).json({ message: 'Failed to update project', error: error.message });
    }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        // Check if project exists and belongs to user
        const checkResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Project not found or unauthorized' });
        }

        await pool.query(
            'DELETE FROM projects WHERE id = $1 AND owner_id = $2',
            [id, userId]
        );

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error: any) {
        console.error('Delete project error:', error);
        res.status(500).json({ message: 'Failed to delete project', error: error.message });
    }
};
