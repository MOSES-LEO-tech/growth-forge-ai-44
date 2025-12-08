import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/api.response';
import { matchScholarshipsForStudent } from '../services/match.service';
import { pool } from '../config/database';

// Authenticated endpoint - uses logged-in user
export const matchScholarships = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const limit = parseInt(String(req.query.limit || '10'), 10);
    const results = await matchScholarshipsForStudent(userId, limit);
    return ApiResponse.success(res, { matches: results, meta: { total: results.length } });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

// Get all scholarships (public)
export const getAllScholarships = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    const result = await pool.query(
      `SELECT id, title, description, organization, amount::text, deadline, application_url, requirements, eligibility_criteria, created_at
       FROM scholarships
       WHERE deleted_at IS NULL AND (deadline IS NULL OR deadline >= CURRENT_DATE)
       ORDER BY deadline ASC NULLS LAST
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM scholarships WHERE deleted_at IS NULL AND (deadline IS NULL OR deadline >= CURRENT_DATE)`
    );

    return ApiResponse.success(res, {
      scholarships: result.rows,
      meta: { total: countResult.rows[0].total, limit, offset }
    });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

// Get scholarship by ID
export const getScholarshipById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, title, description, organization, amount::text, deadline, application_url, requirements, eligibility_criteria, created_at
       FROM scholarships
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Scholarship not found', 404);
    }

    return ApiResponse.success(res, result.rows[0]);
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
