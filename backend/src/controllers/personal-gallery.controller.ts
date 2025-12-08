import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

// Create a new gallery item
export const createItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, mediaType, mediaUrl, thumbnailUrl, visibility } = req.body;

    if (!mediaUrl) {
      return ApiResponse.error(res, 'Media URL is required', 400);
    }

    const query = `
            INSERT INTO personal_gallery_items 
            (user_id, title, description, media_type, media_url, thumbnail_url, visibility)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

    const values = [
      userId,
      title || 'Untitled',
      description || '',
      mediaType || 'image',
      mediaUrl,
      thumbnailUrl,
      visibility || 'private'
    ];

    const result = await pool.query(query, values);

    return ApiResponse.success(res, result.rows[0], 'Gallery item created successfully', 201);
  } catch (error) {
    console.error('Create gallery item error:', error);
    return ApiResponse.error(res, 'Failed to create gallery item', 500, error);
  }
};

// Get current user's gallery items
export const getMyItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const query = `
            SELECT * FROM personal_gallery_items
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

    const countQuery = `
            SELECT COUNT(*) FROM personal_gallery_items
            WHERE user_id = $1 AND deleted_at IS NULL
        `;

    const result = await pool.query(query, [userId, limit, offset]);
    const countResult = await pool.query(countQuery, [userId]);

    return ApiResponse.success(res, {
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }, 'Gallery items retrieved');

  } catch (error) {
    console.error('Get gallery items error:', error);
    return ApiResponse.error(res, 'Failed to retrieve gallery items', 500, error);
  }
};

// Update an item
export const updateItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const itemId = parseInt(req.params.id);
    const { title, description, visibility } = req.body;

    const query = `
            UPDATE personal_gallery_items
            SET title = $1, description = $2, visibility = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND user_id = $5 AND deleted_at IS NULL
            RETURNING *
        `;

    const result = await pool.query(query, [title, description, visibility, itemId, userId]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Item not found or unauthorized', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Item updated successfully');
  } catch (error) {
    console.error('Update item error:', error);
    return ApiResponse.error(res, 'Failed to update item', 500, error);
  }
};

// Delete an item (soft delete)
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const itemId = parseInt(req.params.id);

    const query = `
            UPDATE personal_gallery_items
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;

    const result = await pool.query(query, [itemId, userId]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Item not found or unauthorized', 404);
    }

    return ApiResponse.success(res, { id: itemId }, 'Item deleted successfully');
  } catch (error) {
    console.error('Delete item error:', error);
    return ApiResponse.error(res, 'Failed to delete item', 500, error);
  }
};

// Get items for a connected student (Parent view)
export const getStudentItems = async (req: Request, res: Response) => {
  try {
    const parentId = (req as any).user.id;
    const studentId = parseInt(req.params.studentId);

    // Check if parent is linked to student
    const linkCheck = await pool.query(
      `SELECT * FROM parent_student_links 
             WHERE parent_id = $1 AND student_id = $2 AND verified = true`,
      [parentId, studentId]
    );

    if (linkCheck.rows.length === 0) {
      return ApiResponse.error(res, 'Not authorized to view this student\'s gallery', 403);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Fetch items that are NOT private (or maybe parents can see private? let's assume family visibility logic later, for now everything except 'private' maybe? or just everything since they are verified parents)
    // Let's assume parents can see 'parents' and 'public' visibility, OR maybe even 'private' if goal is full oversight.
    // For "Personal Gallery to showcase...", usually implies sharing. 
    // Let's filter by visibility != 'private' UNLESS we decide parents have full access.
    // Implementation plan said: "Visible to parents (linked accounts)". Let's assume full access for now or specific 'parents' scope.
    // Let's show all for verified parents for simplicity of "monitoring" unless specified.
    // Actually, user said "visible to parents... and can be made public". Defaults to private.
    // Let's allow parents to see everything for now as they are "linked".

    const query = `
            SELECT * FROM personal_gallery_items
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

    const result = await pool.query(query, [studentId, limit, offset]);

    return ApiResponse.success(res, result.rows, 'Student gallery retrieved');

  } catch (error) {
    console.error('Get student items error:', error);
    return ApiResponse.error(res, 'Failed to retrieve student items', 500, error);
  }
};
