import { NextFunction, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';

export type StudentPlan = 'basic' | 'plus' | 'pro';

const planOrder: Record<StudentPlan, number> = {
    basic: 1,
    plus: 2,
    pro: 3,
};

const normalizePlan = (value?: string | null): StudentPlan => {
    const plan = (value || '').toLowerCase();
    if (plan === 'pro') return 'pro';
    if (plan === 'plus') return 'plus';
    return 'basic';
};

export const resolveStudentPlan = async (userId: number): Promise<StudentPlan> => {
    const result = await pool.query('SELECT level FROM student_levels WHERE user_id = $1', [userId]);
    return normalizePlan(result.rows[0]?.level);
};

export const requirePlanAtLeast = (minimum: StudentPlan) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
            }

            // Admin-like roles bypass student plan checks
            if (['admin', 'school_admin', 'teacher'].includes(req.user.role)) {
                return next();
            }

            const currentPlan = await resolveStudentPlan(req.user.id);
            if (planOrder[currentPlan] < planOrder[minimum]) {
                return res.status(403).json({
                    success: false,
                    error: 'PLAN_UPGRADE_REQUIRED',
                    message: `Upgrade to ${minimum.charAt(0).toUpperCase() + minimum.slice(1)} to access this feature.`,
                });
            }

            return next();
        } catch (error: any) {
            return res.status(500).json({ success: false, error: 'PLAN_RESOLUTION_FAILED', message: error?.message || 'Failed to resolve plan' });
        }
    };
};
