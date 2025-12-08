import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/api.response';
import { pool } from '../config/database';

export const getGalleryItems = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `SELECT id, title, description, media_type, media_url, thumbnail_url, visibility, created_at
       FROM personal_gallery_items 
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    return ApiResponse.success(res, result.rows);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const getGalleryItemById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `SELECT id, title, description, media_type, media_url, thumbnail_url, visibility, created_at
       FROM personal_gallery_items 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gallery item not found', 404);
    }
    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const createGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const { title, description, media_type, media_url, thumbnail_url, visibility } = req.body;

    if (!media_url) {
      return ApiResponse.error(res, 'media_url is required', 400);
    }

    const result = await pool.query(
      `INSERT INTO personal_gallery_items (user_id, title, description, media_type, media_url, thumbnail_url, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, media_type, media_url, thumbnail_url, visibility, created_at`,
      [userId, title || null, description || null, media_type || 'image', media_url, thumbnail_url || null, visibility || 'private']
    );

    return ApiResponse.success(res, result.rows[0], 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const updateGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const { title, description, media_type, media_url, thumbnail_url, visibility } = req.body;

    const result = await pool.query(
      `UPDATE personal_gallery_items 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           media_type = COALESCE($3, media_type),
           media_url = COALESCE($4, media_url),
           thumbnail_url = COALESCE($5, thumbnail_url),
           visibility = COALESCE($6, visibility),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8 AND deleted_at IS NULL
       RETURNING id, title, description, media_type, media_url, thumbnail_url, visibility, created_at`,
      [title, description, media_type, media_url, thumbnail_url, visibility, id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gallery item not found', 404);
    }
    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const deleteGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `UPDATE personal_gallery_items SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gallery item not found', 404);
    }
    return ApiResponse.success(res, { message: 'Gallery item deleted' });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
