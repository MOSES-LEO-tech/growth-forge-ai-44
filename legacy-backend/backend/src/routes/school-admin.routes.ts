import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { requireSchoolAdmin, addSchoolScope } from '../middleware/school-admin.middleware';
import * as schoolAdminController from '../controllers/school-admin.controller';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication and school_admin role
router.use(authenticateToken);
router.use(authorize(['school_admin']));
router.use(addSchoolScope);

// ============================================
// Module 1: School Overview / Metrics
// ============================================

// GET /api/school-admin/metrics - Get school metrics
router.get('/metrics', schoolAdminController.getSchoolMetrics);

// ============================================
// Module 2: User Management
// ============================================

// GET /api/school-admin/users - Get all users (students, teachers, parents)
router.get('/users', schoolAdminController.getSchoolUsers);

// POST /api/school-admin/users - Create a new user
const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['student', 'teacher', 'parent']),
    grade: z.string().optional(),
    password: z.string().optional()
});
router.post('/users', validate(createUserSchema), schoolAdminController.createSchoolUser);

// PUT /api/school-admin/users/:userId - Update user
const updateUserSchema = z.object({
    full_name: z.string().optional(),
    grade: z.string().optional(),
    locked_until: z.string().datetime().optional()
});
router.put('/users/:userId', validate(updateUserSchema), schoolAdminController.updateSchoolUser);

// DELETE /api/school-admin/users/:userId - Delete (soft-delete) user
router.delete('/users/:userId', schoolAdminController.deleteSchoolUser);

// ============================================
// Module 3: Academic Structure
// ============================================

// Classes
router.get('/classes', schoolAdminController.getClasses);

const createClassSchema = z.object({
    name: z.string().min(1, 'Class name is required'),
    grade: z.string().min(1, 'Grade is required'),
    teacher_id: z.number().optional()
});
router.post('/classes', validate(createClassSchema), schoolAdminController.createClass);

// Subjects
router.get('/subjects', schoolAdminController.getSubjects);

// Academic Years
router.get('/academic-years', schoolAdminController.getAcademicYears);

// ============================================
// Module 4: Portfolio Moderation
// ============================================

// GET /api/school-admin/projects - Get all school projects for moderation
router.get('/projects', schoolAdminController.getSchoolProjects);

// PUT /api/school-admin/projects/:projectId - Moderate project (approve, feature, flag)
const moderateProjectSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    featured: z.boolean().optional(),
    flagged: z.boolean().optional()
});
router.put('/projects/:projectId', validate(moderateProjectSchema), schoolAdminController.moderateProject);

// ============================================
// Module 5: Achievement Control
// ============================================

// GET /api/school-admin/achievements - Get school achievements
router.get('/achievements', schoolAdminController.getSchoolAchievements);

// POST /api/school-admin/achievements - Create school achievement
const createAchievementSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    criteria: z.string().optional(),
    type: z.string().min(1, 'Type is required')
});
router.post('/achievements', validate(createAchievementSchema), schoolAdminController.createSchoolAchievement);

// ============================================
// Module 6: AI Governance
// ============================================

// GET /api/school-admin/ai-usage - Get AI usage statistics
router.get('/ai-usage', schoolAdminController.getAIUsageStats);

// ============================================
// Module 7: Analytics & Reports
// ============================================

// GET /api/school-admin/reports/student-performance - Student performance report
router.get('/reports/student-performance', schoolAdminController.getStudentPerformanceReport);

// ============================================
// Module 8: School Settings
// ============================================

// GET /api/school-admin/settings - Get school settings
router.get('/settings', schoolAdminController.getSchoolSettings);

// PUT /api/school-admin/settings - Update school settings
const updateSettingsSchema = z.object({
    name: z.string().optional(),
    logo_url: z.string().url().optional(),
    theme_color: z.string().optional(),
    parent_access_enabled: z.boolean().optional(),
    ai_features_enabled: z.boolean().optional(),
    email_notifications: z.boolean().optional()
});
router.put('/settings', validate(updateSettingsSchema), schoolAdminController.updateSchoolSettings);

export default router;
