import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { pool } from '../config/database';
import { streamAIChat } from '../services/ai-chat.service';
import { resolveStudentPlan } from '../middleware/entitlement.middleware';

const router = Router();

router.use(authenticateToken);
const DAILY_LIMITS = {
    basic: 20,
    plus: 200,
    pro: -1,
};

router.get('/history/:studentId', async (req: AuthRequest, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const requesterId = req.user!.id;

        if (requesterId !== studentId) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You can only access your own chat history.' });
        }

        const limit = Math.min(Number(req.query.limit) || 100, 200);
        const history = await pool.query(
            `SELECT id, message_role, message_content, personality, created_at
             FROM ai_chat_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [studentId, limit]
        );

        return res.json({ success: true, data: history.rows.reverse() });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'HISTORY_FETCH_FAILED', message: error?.message || 'Failed to fetch chat history' });
    }
});

router.get('/usage/:studentId', async (req: AuthRequest, res) => {
    try {
        const studentId = Number(req.params.studentId);
        const requesterId = req.user!.id;

        if (requesterId !== studentId) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You can only access your own usage.' });
        }

        const plan = await resolveStudentPlan(studentId);
        const usage = await pool.query(
            `SELECT COUNT(*)::int AS messages_today
             FROM ai_chat_logs
             WHERE user_id = $1 AND message_role = 'user' AND created_at::date = CURRENT_DATE`,
            [studentId]
        );

        const messagesToday = usage.rows[0]?.messages_today || 0;
        const dailyLimit = DAILY_LIMITS[plan];

        return res.json({
            success: true,
            data: {
                plan,
                messagesToday,
                dailyLimit,
                remaining: dailyLimit < 0 ? null : Math.max(0, dailyLimit - messagesToday),
            },
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'USAGE_FETCH_FAILED', message: error?.message || 'Failed to fetch usage' });
    }
});

router.post('/chat', async (req: AuthRequest, res) => {
    const userId = req.user!.id;
    const message = String(req.body?.message || '').trim();

    if (!message) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Message is required' });
    }

    try {
        const plan = await resolveStudentPlan(userId);
        const dailyLimit = DAILY_LIMITS[plan];

        if (dailyLimit > 0) {
            const usage = await pool.query(
                `SELECT COUNT(*)::int AS messages_today
                 FROM ai_chat_logs
                 WHERE user_id = $1 AND message_role = 'user' AND created_at::date = CURRENT_DATE`,
                [userId]
            );

            const messagesToday = usage.rows[0]?.messages_today || 0;
            if (messagesToday >= dailyLimit) {
                return res.status(429).json({
                    success: false,
                    error: 'PLAN_LIMIT_REACHED',
                    message: `Daily chat limit reached for ${plan} plan.`,
                });
            }
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of streamAIChat(userId, message)) {
            res.write(chunk);
        }

        res.end();
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error?.message || 'Chat failed' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }
});

export default router;
