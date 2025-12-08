import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApiResponse } from '../utils/api.response';
import { pool } from '../config/database';

// Helper to update student level/points
const updateStudentStats = async (userId: number) => {
  // Check if student_levels entry exists, if not create
  await pool.query(
    `INSERT INTO student_levels (user_id) 
         SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM student_levels WHERE user_id = $1)`,
    [userId]
  );

  // Count verified achievements (50 pts each) + Projects (verified?)
  // For now, simplify: 1 Verified Achievement = 50 Points.

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM achievements WHERE user_id = $1 AND verified = true AND deleted_at IS NULL',
    [userId]
  );
  const achievementCount = parseInt(countResult.rows[0].count);
  const points = achievementCount * 50;

  let level = 'Basic';
  if (points >= 1000) level = 'Gold';
  else if (points >= 500) level = 'Silver';
  else if (points >= 200) level = 'Bronze';

  await pool.query(
    `UPDATE student_levels 
         SET points = $1, achievements_count = $2, level = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
    [points, achievementCount, level, userId]
  );
};

export const getAchievements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    // Get stats as well
    const statsResult = await pool.query('SELECT * FROM student_levels WHERE user_id = $1', [userId]);
    const stats = statsResult.rows[0] || { points: 0, level: 'Basic', achievements_count: 0 };

    const result = await pool.query(
      `SELECT a.*, v.full_name as verifier_name 
       FROM achievements a
       LEFT JOIN users v ON a.verified_by = v.id
       WHERE a.user_id = $1 AND a.deleted_at IS NULL
       ORDER BY a.date_earned DESC`,
      [userId]
    );

    return ApiResponse.success(res, { stats, achievements: result.rows });
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
      `SELECT * FROM achievements WHERE id = $1 AND deleted_at IS NULL`, // Allow viewing others?
      [id]
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
    const userRole = req.user?.role;
    if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);

    const { title, description, date_earned, certificate_url, studentId } = req.body;

    if (!title) return ApiResponse.error(res, 'Title is required', 400);

    let targetUserId = userId;
    let verified = false;
    let verifiedBy = null;
    let verifiedAt = null;

    // If Teacher/Admin awarding to a student
    if ((userRole === 'teacher' || userRole === 'admin') && studentId) {
      targetUserId = studentId;
      verified = true;
      verifiedBy = userId;
      verifiedAt = new Date();
    }

    const result = await pool.query(
      `INSERT INTO achievements (user_id, title, description, date_earned, certificate_url, verified, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [targetUserId, title, description || null, date_earned || null, certificate_url || null, verified, verifiedBy, verifiedAt]
    );

    if (verified) {
      await updateStudentStats(targetUserId);
    }

    return ApiResponse.success(res, result.rows[0], 201);
  } catch (error: any) {
    console.error("Create achievement error:", error);
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};

export const verifyAchievement = async (req: AuthRequest, res: Response) => {
  try {
    const verifierId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return ApiResponse.error(res, 'Only teachers can verify achievements', 403);
    }

    const result = await pool.query(
      `UPDATE achievements 
             SET verified = true, verified_by = $1, verified_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND deleted_at IS NULL
             RETURNING user_id`,
      [verifierId, id]
    );

    if (result.rows.length === 0) return ApiResponse.error(res, 'Achievement not found', 404);

    const studentId = result.rows[0].user_id;
    await updateStudentStats(studentId);

    return ApiResponse.success(res, { message: 'Verified successfully' });
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

    // Only owner can update details, reset verification if changed? 
    // For now simple update.
    const result = await pool.query(
      `UPDATE achievements 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           date_earned = COALESCE($3, date_earned),
           certificate_url = COALESCE($4, certificate_url)
       WHERE id = $5 AND user_id = $6 AND deleted_at IS NULL
       RETURNING *`,
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
       RETURNING user_id, verified`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Achievement not found', 404);
    }

    if (result.rows[0].verified) {
      await updateStudentStats(userId);
    }

    return ApiResponse.success(res, { message: 'Achievement deleted' });
  } catch (error: any) {
    return ApiResponse.error(res, 'Server error', 500, error);
  }
};
