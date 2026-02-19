import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { pool } from '../config/database';

const router = Router();

// Analytics is open to all authenticated students — AI usage tab is plan-gated per row below
router.use(authenticateToken);

router.get('/student/:id', async (req: AuthRequest, res) => {
    try {
        const studentId = Number(req.params.id);
        const requesterId = req.user!.id;

        if (requesterId !== studentId) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You can only access your own analytics.' });
        }

        const [projects, achievements, level] = await Promise.all([
            pool.query(
                `SELECT
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'complete')::int AS completed
                 FROM projects
                 WHERE owner_id = $1 AND deleted_at IS NULL`,
                [studentId]
            ),
            pool.query(
                `SELECT
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE verified = true)::int AS verified
                 FROM achievements
                 WHERE user_id = $1 AND deleted_at IS NULL`,
                [studentId]
            ),
            pool.query('SELECT level, points FROM student_levels WHERE user_id = $1', [studentId]),
        ]);

        const totalProjects = projects.rows[0]?.total || 0;
        const completedProjects = projects.rows[0]?.completed || 0;
        const completionRate = totalProjects === 0 ? 0 : Number(((completedProjects / totalProjects) * 100).toFixed(1));

        const points = level.rows[0]?.points || 0;
        const levelBucket = Math.max(1, Math.floor(points / 100) + 1);
        const planTier = (level.rows[0]?.level || 'basic').toLowerCase();

        // AI usage is only available for Plus / Pro plans
        let aiUsage: { day: string; messages: number }[] = [];
        if (planTier === 'plus' || planTier === 'pro') {
            const aiResult = await pool.query(
                `SELECT DATE(created_at) AS day, COUNT(*)::int AS messages
                 FROM ai_chat_logs
                 WHERE user_id = $1 AND message_role = 'user' AND created_at >= NOW() - INTERVAL '30 days'
                 GROUP BY DATE(created_at)
                 ORDER BY day ASC`,
                [studentId]
            );
            aiUsage = aiResult.rows;
        }

        return res.json({
            success: true,
            data: {
                projectCompletionRate: completionRate,
                verifiedAchievementCount: achievements.rows[0]?.verified || 0,
                achievementCount: achievements.rows[0]?.total || 0,
                aiUsage,
                xp: {
                    level: levelBucket,
                    currentXp: points,
                    nextLevelXp: levelBucket * 100,
                    tier: planTier,
                },
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'ANALYTICS_FETCH_FAILED', message: error?.message || 'Failed to fetch analytics' });
    }
});

export default router;
