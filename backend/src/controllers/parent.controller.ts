import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/children
// Returns all students linked to the authenticated parent
// ─────────────────────────────────────────────────────────────────────────────
export const getLinkedChildren = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;

        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.avatar_url, u.grade, u.school_id,
                    s.name AS school_name,
                    (SELECT COUNT(*)::int FROM projects WHERE owner_id = u.id AND deleted_at IS NULL) AS projects_count,
                    (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND deleted_at IS NULL) AS achievements_count,
                    (SELECT COUNT(*)::int FROM achievements WHERE user_id = u.id AND verified = true AND deleted_at IS NULL) AS verified_achievements_count
             FROM parent_children pc
             JOIN users u ON u.id = pc.student_id
             LEFT JOIN schools s ON s.id = u.school_id
             WHERE pc.parent_id = $1
               AND u.deleted_at IS NULL
             ORDER BY u.full_name ASC`,
            [parentId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'FETCH_CHILDREN_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/child/:id/overview
// Returns the overview card for the linked child
// ─────────────────────────────────────────────────────────────────────────────
export const getChildOverview = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const child = (req as any).linkedChild;
        const childId = child.id;

        const [statsResult, recentActivityResult, schoolResult] = await Promise.all([
            pool.query(
                `SELECT
                    (SELECT COUNT(*)::int FROM projects WHERE owner_id = $1 AND deleted_at IS NULL) AS projects_count,
                    (SELECT COUNT(*)::int FROM projects WHERE owner_id = $1 AND status = 'complete' AND deleted_at IS NULL) AS projects_completed,
                    (SELECT COUNT(*)::int FROM achievements WHERE user_id = $1 AND deleted_at IS NULL) AS achievements_count,
                    (SELECT COUNT(*)::int FROM achievements WHERE user_id = $1 AND verified = true AND deleted_at IS NULL) AS verified_achievements_count,
                    (SELECT level FROM student_levels WHERE user_id = $1) AS level,
                    (SELECT points FROM student_levels WHERE user_id = $1) AS points`,
                [childId]
            ),
            pool.query(
                `(SELECT 'project' AS type, title AS label, status AS status_text, created_at
                  FROM projects WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 3)
                 UNION ALL
                 (SELECT 'achievement' AS type, title AS label, CASE WHEN verified THEN 'verified' ELSE 'pending' END AS status_text, date_earned AS created_at
                  FROM achievements WHERE user_id = $1 AND deleted_at IS NULL ORDER BY date_earned DESC LIMIT 3)
                 ORDER BY created_at DESC LIMIT 5`,
                [childId]
            ),
            pool.query(
                `SELECT s.name, s.location FROM schools s
                 JOIN users u ON u.school_id = s.id
                 WHERE u.id = $1`,
                [childId]
            ),
        ]);

        const stats = statsResult.rows[0] || {};
        res.json({
            success: true,
            data: {
                student: {
                    id: child.id,
                    fullName: child.full_name,
                    email: child.email,
                    avatarUrl: child.avatar_url,
                    grade: child.grade,
                    school: schoolResult.rows[0] || null,
                },
                stats: {
                    projectsCount: stats.projects_count,
                    projectsCompleted: stats.projects_completed,
                    achievementsCount: stats.achievements_count,
                    verifiedAchievementsCount: stats.verified_achievements_count,
                    level: stats.level || 'basic',
                    points: stats.points || 0,
                },
                recentActivity: recentActivityResult.rows,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'OVERVIEW_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/child/:id/projects
// Returns child's projects (read-only, with verification status and comments)
// ─────────────────────────────────────────────────────────────────────────────
export const getChildProjects = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const childId = (req as any).linkedChild.id;
        const { status, cursor, limit = 20 } = req.query;

        const conditions: string[] = ['p.owner_id = $1', 'p.deleted_at IS NULL'];
        const params: (string | number)[] = [childId];

        if (status) {
            params.push(status as string);
            conditions.push(`p.status = $${params.length}`);
        }

        const projects = await pool.query(
            `SELECT p.id, p.title, p.description, p.status, p.verified, p.skills,
                    p.started_at, p.completed_at, p.created_at,
                    (SELECT COUNT(*)::int FROM project_files WHERE project_id = p.id) AS files_count,
                    (SELECT COUNT(*)::int FROM project_comments WHERE project_id = p.id AND parent_id = $2) AS my_comments_count
             FROM projects p
             WHERE ${conditions.join(' AND ')}
             ORDER BY p.created_at DESC
             LIMIT $${params.length + 1}`,
            [...params, req.user!.id, Number(limit)]
        );

        res.json({ success: true, data: projects.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'PROJECTS_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/parent/project/:projectId/comment
// Parent posts an encouragement comment on their child's project
// ─────────────────────────────────────────────────────────────────────────────
export const postProjectComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;
        const projectId = (req as any).linkedProject.id;
        const { comment } = req.body;

        if (!comment || typeof comment !== 'string' || comment.trim().length < 10 || comment.trim().length > 500) {
            res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Comment must be between 10 and 500 characters.',
            });
            return;
        }

        const result = await pool.query(
            `INSERT INTO project_comments (project_id, parent_id, comment)
             VALUES ($1, $2, $3) RETURNING id, comment, created_at`,
            [projectId, parentId, comment.trim()]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'COMMENT_POST_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/child/:id/achievements
// Returns child's achievements (read-only, filterable by category/verified)
// ─────────────────────────────────────────────────────────────────────────────
export const getChildAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const childId = (req as any).linkedChild.id;
        const { category, verified } = req.query;

        const conditions: string[] = ['user_id = $1', 'deleted_at IS NULL'];
        const params: (string | number | boolean)[] = [childId];

        if (category) {
            params.push(category as string);
            conditions.push(`category = $${params.length}`);
        }
        if (verified !== undefined) {
            params.push(verified === 'true');
            conditions.push(`verified = $${params.length}`);
        }

        const achievements = await pool.query(
            `SELECT id, title, description, category, verified, certificate_url, date_earned, created_at
             FROM achievements
             WHERE ${conditions.join(' AND ')}
             ORDER BY date_earned DESC NULLS LAST, created_at DESC`,
            params
        );

        res.json({ success: true, data: achievements.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'ACHIEVEMENTS_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/child/:id/analytics
// Returns growth analytics for the linked child
// ─────────────────────────────────────────────────────────────────────────────
export const getChildAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const childId = (req as any).linkedChild.id;

        const [projects, achievements, activityTrend, level] = await Promise.all([
            pool.query(
                `SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE status = 'complete')::int AS completed
                 FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
                [childId]
            ),
            pool.query(
                `SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE verified = true)::int AS verified,
                    COUNT(*) FILTER (WHERE category = 'academic')::int AS academic,
                    COUNT(*) FILTER (WHERE category = 'sports')::int AS sports,
                    COUNT(*) FILTER (WHERE category = 'leadership')::int AS leadership,
                    COUNT(*) FILTER (WHERE category = 'arts')::int AS arts
                 FROM achievements WHERE user_id = $1 AND deleted_at IS NULL`,
                [childId]
            ),
            pool.query(
                `SELECT DATE(created_at) AS day, COUNT(*)::int AS activity_count
                 FROM (
                     SELECT created_at FROM projects WHERE owner_id = $1 AND deleted_at IS NULL
                     UNION ALL
                     SELECT created_at FROM achievements WHERE user_id = $1 AND deleted_at IS NULL
                 ) activity
                 WHERE created_at >= NOW() - INTERVAL '60 days'
                 GROUP BY DATE(created_at)
                 ORDER BY day ASC`,
                [childId]
            ),
            pool.query(
                `SELECT level, points FROM student_levels WHERE user_id = $1`,
                [childId]
            ),
        ]);

        const totalProjects = projects.rows[0]?.total || 0;
        const completedProjects = projects.rows[0]?.completed || 0;
        const completionRate = totalProjects === 0 ? 0 : Number(((completedProjects / totalProjects) * 100).toFixed(1));

        const points = level.rows[0]?.points || 0;
        const tier = level.rows[0]?.level || 'basic';
        const levelBucket = Math.max(1, Math.floor(points / 100) + 1);

        res.json({
            success: true,
            data: {
                projectCompletionRate: completionRate,
                projectsTotal: totalProjects,
                projectsCompleted: completedProjects,
                achievements: {
                    total: achievements.rows[0]?.total || 0,
                    verified: achievements.rows[0]?.verified || 0,
                    byCategory: {
                        academic: achievements.rows[0]?.academic || 0,
                        sports: achievements.rows[0]?.sports || 0,
                        leadership: achievements.rows[0]?.leadership || 0,
                        arts: achievements.rows[0]?.arts || 0,
                    },
                },
                activityTrend: activityTrend.rows,
                xp: {
                    tier,
                    level: levelBucket,
                    currentXp: points,
                    nextLevelXp: levelBucket * 100,
                },
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'ANALYTICS_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/parent/message — Send a message to a teacher
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const senderId = req.user!.id;
        const { receiverId, subject, content } = req.body;

        if (!receiverId || !content || content.trim().length === 0) {
            res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'receiverId and content are required.' });
            return;
        }

        // Verify receiver is a teacher or school_admin
        const receiverCheck = await pool.query(
            `SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [Number(receiverId)]
        );
        if (receiverCheck.rows.length === 0) {
            res.status(404).json({ success: false, error: 'RECEIVER_NOT_FOUND', message: 'Recipient not found.' });
            return;
        }
        if (!['teacher', 'school_admin', 'admin'].includes(receiverCheck.rows[0].role)) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'You can only message teachers or school admins.' });
            return;
        }

        const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, subject, content)
             VALUES ($1, $2, $3, $4)
             RETURNING id, sender_id, receiver_id, subject, content, read_status, created_at`,
            [senderId, Number(receiverId), subject?.trim() || null, content.trim()]
        );

        // Create notification for receiver
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
             VALUES ($1, 'message', $2, $3, $4, 'message')`,
            [
                Number(receiverId),
                'New message from a parent',
                content.trim().substring(0, 100),
                result.rows[0].id,
            ]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'MESSAGE_SEND_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/messages — Parent inbox (sent + received)
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;

        const messages = await pool.query(
            `SELECT m.id, m.subject, m.content, m.read_status, m.created_at,
                    sender.id AS sender_id, sender.full_name AS sender_name, sender.avatar_url AS sender_avatar,
                    receiver.id AS receiver_id, receiver.full_name AS receiver_name, receiver.avatar_url AS receiver_avatar,
                    CASE WHEN m.sender_id = $1 THEN 'sent' ELSE 'received' END AS direction
             FROM messages m
             JOIN users sender ON sender.id = m.sender_id
             JOIN users receiver ON receiver.id = m.receiver_id
             WHERE m.sender_id = $1 OR m.receiver_id = $1
             ORDER BY m.created_at DESC
             LIMIT 50`,
            [parentId]
        );

        res.json({ success: true, data: messages.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'MESSAGES_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/notifications — Parent notifications
// ─────────────────────────────────────────────────────────────────────────────
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;

        const notifications = await pool.query(
            `SELECT id, type, title, body, read_status, reference_id, reference_type, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [parentId]
        );

        const unreadCount = notifications.rows.filter(n => !n.read_status).length;

        res.json({ success: true, data: { notifications: notifications.rows, unreadCount } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'NOTIFICATIONS_FETCH_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/parent/notifications/:id/read — Mark notification as read
// ─────────────────────────────────────────────────────────────────────────────
export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;
        const notificationId = Number(req.params.id);

        const result = await pool.query(
            `UPDATE notifications
             SET read_status = true
             WHERE id = $1 AND user_id = $2
             RETURNING id, read_status`,
            [notificationId, parentId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' });
            return;
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'NOTIFICATION_UPDATE_FAILED', message: error?.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parent/plan — Get parent's subscription plan
// ─────────────────────────────────────────────────────────────────────────────
export const getParentPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const parentId = req.user!.id;

        const result = await pool.query(
            `SELECT tier, updated_at FROM parent_plans WHERE user_id = $1`,
            [parentId]
        );

        const tier = result.rows[0]?.tier || 'basic';
        const featureMatrix = {
            basic: ['View child overview', 'Monitor projects (read-only)', 'View achievements', 'School notifications'],
            plus: ['All Basic features', 'AI Guidance chat', 'Send messages to teachers', 'Basic analytics'],
            pro: ['All Plus features', 'Advanced analytics', 'Export reports', 'Priority support'],
        };

        res.json({
            success: true,
            data: {
                tier,
                features: featureMatrix[tier as keyof typeof featureMatrix],
                updatedAt: result.rows[0]?.updated_at || null,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'PLAN_FETCH_FAILED', message: error?.message });
    }
};
