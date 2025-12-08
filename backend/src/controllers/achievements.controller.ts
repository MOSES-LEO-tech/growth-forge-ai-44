import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/api.response';
import { pool } from '../config/database';

export const getAchievements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `SELECT id, title, description, date_earned, verified, verified_by, verified_at, certificate_url, created_at
       FROM achievements 
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY date_earned DESC`,
      [userId]
    );
    return ApiResponse.success(res, result.rows);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const getAchievementById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `SELECT id, title, description, date_earned, verified, verified_by, verified_at, certificate_url, created_at
       FROM achievements 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Achievement not found', 404);
    }
    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const createAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const { title, description, date_earned, certificate_url } = req.body;

    if (!title) {
      return ApiResponse.error(res, 'Title is required', 400);
    }

    const result = await pool.query(
      `INSERT INTO achievements (user_id, title, description, date_earned, certificate_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, date_earned, verified, certificate_url, created_at`,
      [userId, title, description || null, date_earned || null, certificate_url || null]
    );

    return ApiResponse.success(res, result.rows[0], 201);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const updateAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const { title, description, date_earned, certificate_url } = req.body;

    const result = await pool.query(
      `UPDATE achievements 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           date_earned = COALESCE($3, date_earned),
           certificate_url = COALESCE($4, certificate_url)
       WHERE id = $5 AND user_id = $6 AND deleted_at IS NULL
       RETURNING id, title, description, date_earned, verified, certificate_url, created_at`,
      [title, description, date_earned, certificate_url, id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Achievement not found', 404);
    }
    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const deleteAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const result = await pool.query(
      `UPDATE achievements SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Achievement not found', 404);
    }
    return ApiResponse.success(res, { message: 'Achievement deleted' });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
