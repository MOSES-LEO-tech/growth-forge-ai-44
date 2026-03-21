import { Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';

/**
 * Middleware: requireParentChildLink
 *
 * Validates that the authenticated parent has a confirmed link to the
 * student identified by req.params.id (childId).
 *
 * - 401 if not authenticated
 * - 403 if not a parent role
 * - 404 if child account does not exist or is soft-deleted
 * - 403 if no parent_children record links this parent to this child
 *
 * On success, injects req.linkedChild for downstream controllers.
 */
export const requireParentChildLink = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
            return;
        }

        if (req.user.role !== 'parent') {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Only parents can access this resource.' });
            return;
        }

        const childId = Number(req.params.id);
        if (!childId || isNaN(childId)) {
            res.status(400).json({ success: false, error: 'INVALID_CHILD_ID', message: 'A valid child ID is required.' });
            return;
        }

        // Check child account exists and is not soft-deleted
        const childCheck = await pool.query(
            `SELECT id, full_name, email, role, school_id, grade, avatar_url, deleted_at
             FROM users WHERE id = $1`,
            [childId]
        );

        if (childCheck.rows.length === 0 || childCheck.rows[0].deleted_at !== null) {
            res.status(404).json({ success: false, error: 'CHILD_NOT_FOUND', message: 'Student account not found or has been removed.' });
            return;
        }

        // Check parent-child link
        const linkCheck = await pool.query(
            `SELECT id FROM parent_children WHERE parent_id = $1 AND student_id = $2`,
            [req.user.id, childId]
        );

        if (linkCheck.rows.length === 0) {
            // Log suspicious access attempt
            console.warn(`[SECURITY] Parent ${req.user.id} attempted to access unlinked child ${childId}`);
            res.status(403).json({ success: false, error: 'PARENT_CHILD_NOT_LINKED', message: 'You are not linked to this student account.' });
            return;
        }

        // Inject child profile into request for downstream use
        (req as any).linkedChild = childCheck.rows[0];
        next();
    } catch (error: any) {
        console.error('[requireParentChildLink] Error:', error);
        res.status(500).json({ success: false, error: 'MIDDLEWARE_ERROR', message: error?.message || 'Failed to validate parent-child link.' });
    }
};

/**
 * Middleware: requireParentCommentOwnership
 *
 * For comment-related actions, validates the parent owns the project's student.
 * Reads projectId from req.params.projectId and verifies the project owner
 * is a linked child of the requesting parent.
 */
export const requireParentProjectAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
            return;
        }

        const projectId = Number(req.params.projectId);
        if (!projectId || isNaN(projectId)) {
            res.status(400).json({ success: false, error: 'INVALID_PROJECT_ID', message: 'A valid project ID is required.' });
            return;
        }

        // Get project owner
        const projectCheck = await pool.query(
            `SELECT p.id, p.owner_id, u.full_name as student_name
             FROM projects p
             JOIN users u ON u.id = p.owner_id
             WHERE p.id = $1 AND p.deleted_at IS NULL`,
            [projectId]
        );

        if (projectCheck.rows.length === 0) {
            res.status(404).json({ success: false, error: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
            return;
        }

        const ownerId = projectCheck.rows[0].owner_id;

        // Verify parent-child link
        const linkCheck = await pool.query(
            `SELECT id FROM parent_children WHERE parent_id = $1 AND student_id = $2`,
            [req.user.id, ownerId]
        );

        if (linkCheck.rows.length === 0) {
            console.warn(`[SECURITY] Parent ${req.user.id} attempted to comment on project of unlinked student ${ownerId}`);
            res.status(403).json({ success: false, error: 'PARENT_CHILD_NOT_LINKED', message: 'You are not linked to this student\'s account.' });
            return;
        }

        (req as any).linkedProject = projectCheck.rows[0];
        next();
    } catch (error: any) {
        console.error('[requireParentProjectAccess] Error:', error);
        res.status(500).json({ success: false, error: 'MIDDLEWARE_ERROR', message: error?.message || 'Failed to validate project access.' });
    }
};
