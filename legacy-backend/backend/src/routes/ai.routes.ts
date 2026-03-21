import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import { pool } from '../config/database';
import { streamAIChat } from '../services/ai-chat.service';
import { requirePlanAtLeast, resolveStudentPlan } from '../middleware/entitlement.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requirePlanAtLeast('plus'));

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

// ─────────────────────────────────────────────────────────────────────────────
// PARENT AI GUIDANCE — Separate from student SmartBuddy
// Routes below require 'parent' role instead of student plan enforcement
// ─────────────────────────────────────────────────────────────────────────────

const PARENT_DAILY_LIMITS: Record<string, number> = {
    basic: 0,    // No AI for basic parents
    plus: 50,
    pro: -1,     // Unlimited
};

/**
 * @swagger
 * /api/ai/parent-chat:
 *   post:
 *     summary: Parent AI guidance chat (contextualized to linked child)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *               childId:
 *                 type: integer
 *                 description: Optional — contextualizes response to this child's profile
 */
const parentChatRouter = Router();
parentChatRouter.use(authenticateToken);

parentChatRouter.post('/parent-chat', async (req: AuthRequest, res) => {
    if (!req.user || req.user.role !== 'parent') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only parents can access parent guidance.' });
    }

    const parentId = req.user.id;
    const message = String(req.body?.message || '').trim();
    const childId = req.body?.childId ? Number(req.body.childId) : null;

    if (!message) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Message is required.' });
    }

    try {
        // Check parent plan
        const planResult = await pool.query(
            `SELECT tier FROM parent_plans WHERE user_id = $1`,
            [parentId]
        );
        const tier = planResult.rows[0]?.tier || 'basic';
        const dailyLimit = PARENT_DAILY_LIMITS[tier] ?? 0;

        if (dailyLimit === 0) {
            return res.status(403).json({
                success: false,
                error: 'PLAN_UPGRADE_REQUIRED',
                message: 'Upgrade to Plus to access AI Guidance.',
            });
        }

        if (dailyLimit > 0) {
            const usageResult = await pool.query(
                `SELECT COUNT(*)::int AS count FROM parent_ai_chat_logs
                 WHERE parent_id = $1 AND message_role = 'user' AND created_at::date = CURRENT_DATE`,
                [parentId]
            );
            if ((usageResult.rows[0]?.count || 0) >= dailyLimit) {
                return res.status(429).json({
                    success: false,
                    error: 'PLAN_LIMIT_REACHED',
                    message: `Daily guidance limit reached for ${tier} plan.`,
                });
            }
        }

        // Build child context if childId provided and parent is linked
        let childContext = '';
        if (childId) {
            const linkCheck = await pool.query(
                `SELECT pc.id FROM parent_children pc WHERE pc.parent_id = $1 AND pc.student_id = $2`,
                [parentId, childId]
            );
            if (linkCheck.rows.length > 0) {
                const childData = await pool.query(
                    `SELECT u.full_name, u.grade,
                            (SELECT COUNT(*)::int FROM projects WHERE owner_id = u.id AND deleted_at IS NULL) AS projects,
                            (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND verified = true AND deleted_at IS NULL) AS verified_achievements,
                            s.name AS school_name
                     FROM users u
                     LEFT JOIN schools s ON s.id = u.school_id
                     WHERE u.id = $1`,
                    [childId]
                );
                const c = childData.rows[0];
                if (c) {
                    childContext = `\n\nChild Profile:\nName: ${c.full_name}\nGrade: ${c.grade || 'N/A'}\nSchool: ${c.school_name || 'N/A'}\nProjects: ${c.projects}\nVerified Achievements: ${c.verified_achievements}`;
                }
            }
        }

        const systemPrompt = `You are a supportive academic guidance assistant helping a parent guide their child's educational journey in Africa.
You provide practical, encouraging advice about learning, study habits, career paths, and scholarship opportunities.
Be empathetic, clear, and action-oriented.
${childContext}

Guidelines:
- Address the parent respectfully as they advocate for their child
- Give concrete next steps they can take to support their child
- Reference the child's data when contextually relevant
- Suggest African scholarship opportunities when appropriate
- Keep responses under 300 words unless more detail is needed`;

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

        if (!LOVABLE_API_KEY) {
            // Fallback response
            await pool.query(
                `INSERT INTO parent_ai_chat_logs (parent_id, child_id, message_role, message_content) VALUES ($1, $2, 'user', $3)`,
                [parentId, childId, message]
            );
            const fallback = `Thank you for reaching out. Based on your question about "${message}", here are some key suggestions: encourage consistent study habits, celebrate small wins like project completions and verified achievements, and explore scholarship opportunities in STEM and leadership. Would you like more specific advice?`;
            await pool.query(
                `INSERT INTO parent_ai_chat_logs (parent_id, child_id, message_role, message_content) VALUES ($1, $2, 'assistant', $3)`,
                [parentId, childId, fallback]
            );
            return res.json({ success: true, data: { response: fallback } });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                stream: true,
            }),
        });

        if (!aiResponse.ok) {
            res.write(`data: ${JSON.stringify({ error: 'AI service temporarily unavailable.' })}\n\n`);
            return res.end();
        }

        const reader = aiResponse.body?.getReader();
        if (!reader) { res.write('data: [DONE]\n\n'); return res.end(); }

        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === '[DONE]') { res.write('data: [DONE]\n\n'); break; }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullResponse += content;
                            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                        }
                    } catch { /* skip */ }
                }
            }
        }

        res.end();

        // Log to parent_ai_chat_logs
        await pool.query(
            `INSERT INTO parent_ai_chat_logs (parent_id, child_id, message_role, message_content) VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
            [parentId, childId, message, fullResponse]
        );

    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error?.message || 'Chat failed' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }
});

/**
 * @swagger
 * /api/ai/parent-history/{parentId}:
 *   get:
 *     summary: Get parent AI chat history
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema:
 *           type: integer
 */
parentChatRouter.get('/parent-history/:parentId', async (req: AuthRequest, res) => {
    try {
        if (!req.user || req.user.role !== 'parent') {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only parents can access this.' });
        }

        const parentId = Number(req.params.parentId);
        if (req.user.id !== parentId) {
            return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You can only access your own history.' });
        }

        const limit = Math.min(Number(req.query.limit) || 100, 200);
        const history = await pool.query(
            `SELECT id, child_id, message_role, message_content, created_at
             FROM parent_ai_chat_logs
             WHERE parent_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [parentId, limit]
        );

        return res.json({ success: true, data: history.rows.reverse() });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: 'HISTORY_FETCH_FAILED', message: error?.message });
    }
});

// Merge parent chat router into main router
router.use(parentChatRouter);

export default router;
