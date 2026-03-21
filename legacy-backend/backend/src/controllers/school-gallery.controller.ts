import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Get list of events (Public to all auth users)
// Supports optional query ?schoolId=... to filter
export const getEvents = async (req: Request, res: Response) => {
    try {
        const { schoolId, page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let query = `
            SELECT e.*, s.name as school_name, s.logo_url as school_logo,
            (SELECT media_url FROM media_items WHERE event_id = e.id ORDER BY created_at ASC LIMIT 1) as cover_image
            FROM events e
            JOIN schools s ON e.school_id = s.id
            WHERE e.deleted_at IS NULL
        `;
        const params: any[] = [];

        if (schoolId) {
            query += ` AND e.school_id = $1`;
            params.push(schoolId);
        }

        query += ` ORDER BY e.event_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        return ApiResponse.success(res, result.rows, 'Events retrieved successfully');
    } catch (error: any) {
        console.error('Get events error:', error);
        return ApiResponse.error(res, 'Failed to fetch events', 500, error);
    }
};

// Get single event details with media
export const getEventDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const eventResult = await pool.query(`
            SELECT e.*, s.name as school_name, s.logo_url as school_logo
            FROM events e
            JOIN schools s ON e.school_id = s.id
            WHERE e.id = $1 AND e.deleted_at IS NULL
        `, [id]);

        if (eventResult.rows.length === 0) {
            return ApiResponse.error(res, 'Event not found', 404);
        }

        const mediaResult = await pool.query(
            'SELECT * FROM media_items WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
            [id]
        );

        return ApiResponse.success(res, {
            ...eventResult.rows[0],
            media: mediaResult.rows
        }, 'Event details retrieved');
    } catch (error: any) {
        console.error('Get event details error:', error);
        return ApiResponse.error(res, 'Failed to fetch event', 500, error);
    }
};

// Create Event (Admin/Teacher only)
export const createEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        // User must have school_id (enforced by RBAC ideally, or we check here)
        const userCheck = await pool.query('SELECT school_id FROM users WHERE id = $1', [userId]);
        const schoolId = userCheck.rows[0]?.school_id;

        if (!schoolId) {
            return ApiResponse.error(res, 'You must be associated with a school to create events', 403);
        }

        const { title, description, eventDate, location, type } = req.body;

        if (!title || !eventDate) {
            return ApiResponse.error(res, 'Title and Event Date are required', 400);
        }

        const result = await pool.query(
            `INSERT INTO events (title, description, event_date, location, type, school_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, description, eventDate, location, type || 'school', schoolId, userId]
        );

        return ApiResponse.success(res, result.rows[0], 'Event created successfully', 201);
    } catch (error: any) {
        console.error('Create event error:', error);
        return ApiResponse.error(res, 'Failed to create event', 500, error);
    }
};

// Add Media to Event
export const addEventMedia = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params; // Event ID
        const { mediaType, mediaUrl, title, description } = req.body;

        // Verify permission: User must share school_id with event OR be the creator
        // Simple check: Is user from same school?
        const eventCheck = await pool.query('SELECT school_id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) return ApiResponse.error(res, 'Event not found', 404);

        const userCheck = await pool.query('SELECT school_id FROM users WHERE id = $1', [userId]);

        if (eventCheck.rows[0].school_id !== userCheck.rows[0].school_id) {
            return ApiResponse.error(res, 'Unauthorized to add media to this event', 403);
        }

        const result = await pool.query(
            `INSERT INTO media_items (event_id, title, description, media_type, media_url, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, title, description, mediaType || 'image', mediaUrl, userId]
        );

        return ApiResponse.success(res, result.rows[0], 'Media added successfully', 201);
    } catch (error: any) {
        console.error('Add event media error:', error);
        return ApiResponse.error(res, 'Failed to add media', 500, error);
    }
};

// Delete Event
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const eventCheck = await pool.query('SELECT school_id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) return ApiResponse.error(res, 'Event not found', 404);

        const userCheck = await pool.query('SELECT school_id FROM users WHERE id = $1', [userId]);

        // Only allow same school staff to delete
        if (eventCheck.rows[0].school_id !== userCheck.rows[0].school_id) {
            return ApiResponse.error(res, 'Unauthorized to delete this event', 403);
        }

        await pool.query('UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);

        return ApiResponse.success(res, null, 'Event deleted successfully');
    } catch (error: any) {
        console.error('Delete event error:', error);
        return ApiResponse.error(res, 'Failed to delete event', 500, error);
    }
};
