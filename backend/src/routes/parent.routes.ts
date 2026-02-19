import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { requireParentChildLink, requireParentProjectAccess } from '../middleware/parent-child.middleware';
import {
    getLinkedChildren,
    getChildOverview,
    getChildProjects,
    postProjectComment,
    getChildAchievements,
    getChildAnalytics,
    sendMessage,
    getMessages,
    getNotifications,
    markNotificationRead,
    getParentPlan,
} from '../controllers/parent.controller';

const router = Router();

// All parent routes require authentication + parent role
router.use(authenticateToken);
router.use(authorize(['parent']));

/**
 * @swagger
 * /api/parent/children:
 *   get:
 *     summary: List all students linked to this parent
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of linked student profiles with summary stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a parent)
 */
router.get('/children', getLinkedChildren);

/**
 * @swagger
 * /api/parent/plan:
 *   get:
 *     summary: Get the parent's current subscription plan and features
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 */
router.get('/plan', getParentPlan);

/**
 * @swagger
 * /api/parent/messages:
 *   get:
 *     summary: Get parent inbox (sent and received messages)
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 */
router.get('/messages', getMessages);

/**
 * @swagger
 * /api/parent/message:
 *   post:
 *     summary: Send a message to a teacher or school admin
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, content]
 *             properties:
 *               receiverId:
 *                 type: integer
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 */
router.post('/message', sendMessage);

/**
 * @swagger
 * /api/parent/notifications:
 *   get:
 *     summary: Get parent notifications
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 */
router.get('/notifications', getNotifications);

/**
 * @swagger
 * /api/parent/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.patch('/notifications/:id/read', markNotificationRead);

// ─── Child-scoped routes (validate parent-child link first) ───────────────────

/**
 * @swagger
 * /api/parent/child/{id}/overview:
 *   get:
 *     summary: Get an overview card for a linked child
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student (child) user ID
 */
router.get('/child/:id/overview', requireParentChildLink, getChildOverview);

/**
 * @swagger
 * /api/parent/child/{id}/projects:
 *   get:
 *     summary: Get projects for a linked child (read-only)
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, complete]
 */
router.get('/child/:id/projects', requireParentChildLink, getChildProjects);

/**
 * @swagger
 * /api/parent/child/{id}/achievements:
 *   get:
 *     summary: Get achievements for a linked child (read-only)
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [academic, sports, leadership, arts, other]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 */
router.get('/child/:id/achievements', requireParentChildLink, getChildAchievements);

/**
 * @swagger
 * /api/parent/child/{id}/analytics:
 *   get:
 *     summary: Get growth analytics for a linked child
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/child/:id/analytics', requireParentChildLink, getChildAnalytics);

// ─── Project comment (parent encouragement) ───────────────────────────────────

/**
 * @swagger
 * /api/parent/project/{projectId}/comment:
 *   post:
 *     summary: Post an encouragement comment on a linked child's project
 *     tags: [Parent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comment]
 *             properties:
 *               comment:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 */
router.post('/project/:projectId/comment', requireParentProjectAccess, postProjectComment);

export default router;
