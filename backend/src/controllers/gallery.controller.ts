import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

export const getPublicEvents = async (req: Request, res: Response) => {
    try {
        console.log('Fetching public events');
        const result = await pool.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', m.id,
                 'title', m.title,
                 'description', m.description,
                 'media_type', m.media_type,
                 'media_url', m.media_url
               )
             ) as media
      FROM events e
      LEFT JOIN media_items m ON e.id = m.event_id AND m.deleted_at IS NULL
      WHERE e.type = 'school' AND e.deleted_at IS NULL
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);
        return ApiResponse.success(res, result.rows, 'Public events fetched successfully');
    } catch (error) {
        console.error('Error fetching public events:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const getUserEvents = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        console.log(`Fetching user events for user: ${userId}`);

        const result = await pool.query(`
      SELECT e.*, 
             json_agg(
               json_build_object(
                 'id', m.id,
                 'title', m.title,
                 'description', m.description,
                 'media_type', m.media_type,
                 'media_url', m.media_url
               )
             ) as media
      FROM events e
      LEFT JOIN media_items m ON e.id = m.event_id AND m.deleted_at IS NULL
      WHERE e.created_by = $1 AND e.type = 'personal' AND e.deleted_at IS NULL
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `, [userId]);

        return ApiResponse.success(res, result.rows, 'User events fetched successfully');
    } catch (error) {
        console.error('Error fetching user events:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { title, description, event_date, type } = req.body;
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user.role;
        console.log(`Creating event for user ${userId}:`, { title, type });

        // Force 'personal' type for non-admins unless specified otherwise by logic
        // But for now, let's trust the input but validate permissions if 'school'
        let eventType = type || 'personal';

        if (eventType === 'school' && userRole !== 'admin' && userRole !== 'teacher') {
            return ApiResponse.error(res, 'Only admins and teachers can create school events', 403);
        }

        const result = await pool.query(
            'INSERT INTO events (title, description, event_date, type, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, event_date, eventType, userId]
        );

        return ApiResponse.success(res, result.rows[0], 'Event created successfully', 201);
    } catch (error) {
        console.error('Error creating event:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const addMedia = async (req: Request, res: Response) => {
    try {
        const { event_id, title, description, media_type, media_url } = req.body;
        // @ts-ignore
        const userId = req.user.id;
        console.log(`Adding media to event ${event_id} for user ${userId}`);

        // Verify event ownership or admin status
        const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
        if (eventCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Event not found', 404);
        }

        const event = eventCheck.rows[0];
        // @ts-ignore
        if (event.created_by !== userId && req.user.role !== 'admin') {
            return ApiResponse.error(res, 'Not authorized to add media to this event', 403);
        }

        const result = await pool.query(
            'INSERT INTO media_items (event_id, title, description, media_type, media_url, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [event_id, title, description, media_type, media_url, userId]
        );

        return ApiResponse.success(res, result.rows[0], 'Media added successfully', 201);
    } catch (error) {
        console.error('Error adding media:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const getEventById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`Fetching event ${id}`);

        const result = await pool.query(
            'SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (result.rows.length === 0) {
            return ApiResponse.error(res, 'Event not found', 404);
        }

        return ApiResponse.success(res, result.rows[0], 'Event fetched successfully');
    } catch (error) {
        console.error('Error fetching event:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const getEventMedia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`Fetching media for event ${id}`);

        const result = await pool.query(
            'SELECT * FROM media_items WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
            [id]
        );

        return ApiResponse.success(res, result.rows, 'Event media fetched successfully');
    } catch (error) {
        console.error('Error fetching event media:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user.role;
        console.log(`Deleting event ${id} for user ${userId}`);

        // Check if event exists and user has permission
        const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (eventCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Event not found', 404);
        }

        const event = eventCheck.rows[0];
        // Only creator or admin can delete
        if (event.created_by !== userId && userRole !== 'admin') {
            return ApiResponse.error(res, 'Not authorized to delete this event', 403);
        }

        // Soft delete
        await pool.query(
            'UPDATE events SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        return ApiResponse.success(res, null, 'Event deleted successfully');
    } catch (error) {
        console.error('Error deleting event:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const deleteMedia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user.role;
        console.log(`Deleting media ${id} for user ${userId}`);

        // Check if media exists
        const mediaCheck = await pool.query('SELECT * FROM media_items WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (mediaCheck.rows.length === 0) {
            return ApiResponse.error(res, 'Media not found', 404);
        }

        const media = mediaCheck.rows[0];
        // Only uploader or admin can delete
        if (media.uploaded_by !== userId && userRole !== 'admin') {
            return ApiResponse.error(res, 'Not authorized to delete this media', 403);
        }

        // Soft delete
        await pool.query(
            'UPDATE media_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        return ApiResponse.success(res, null, 'Media deleted successfully');
    } catch (error) {
        console.error('Error deleting media:', error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
