import { Router } from 'express';
import {
    getSchools,
    getSchool,
    createSchool,
    updateSchool,
    deleteSchool,
    getSchoolStats,
    getSchoolUsers
} from '../controllers/schools.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createSchoolSchema = z.object({
    name: z.string().min(1, 'School name is required'),
    location: z.string().optional(),
    education_system: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    level: z.string().optional(),
    curriculum: z.array(z.string()).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
    banner_url: z.string().optional(),
    website: z.string().optional()
});

const updateSchoolSchema = z.object({
    name: z.string().min(1).optional(),
    location: z.string().optional(),
    education_system: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    level: z.string().optional(),
    curriculum: z.array(z.string()).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    address: z.string().optional(),
    banner_url: z.string().optional(),
    website: z.string().optional(),
    is_active: z.boolean().optional()
});

// All routes require authentication
router.use(authenticateToken);

// Public routes (authenticated users can view schools)
router.get('/', getSchools);
router.get('/:id', getSchool);
router.get('/:id/stats', getSchoolStats);
router.get('/:id/users', getSchoolUsers);

// Admin-only routes
router.post('/', authorize(['admin']), validate(createSchoolSchema), createSchool);
router.put('/:id', authorize(['admin']), validate(updateSchoolSchema), updateSchool);
router.delete('/:id', authorize(['admin']), deleteSchool);

export default router;
