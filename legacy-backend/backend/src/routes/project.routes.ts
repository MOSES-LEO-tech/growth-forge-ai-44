import { Router } from 'express';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    addMedia,
    verifyProject,
    addFeedback
} from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { projectSchema } from '../utils/schemas';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// Get all projects for user (accessible to all roles)
router.get('/', getProjects);

// Get single project (accessible to all roles)
router.get('/:id', getProject);

// Create new project (students, teachers, admins only)
router.post('/', authorize(['student', 'teacher', 'admin']), validate(projectSchema), createProject);

// Update project (students, teachers, admins only)
router.put('/:id', authorize(['student', 'teacher', 'admin']), validate(projectSchema.partial()), updateProject);

// Delete project (students, teachers, admins only)
router.delete('/:id', authorize(['student', 'teacher', 'admin']), deleteProject);

// Add Media (Owner/Student mainly, but Teachers too?)
router.post('/:id/media', authorize(['student', 'teacher', 'admin']), addMedia);

// Verify Project (Teacher/Admin only)
router.post('/:id/verify', authorize(['teacher', 'admin']), verifyProject);

// Add Feedback (Teacher, Parent, Admin)
router.post('/:id/feedback', authorize(['teacher', 'parent', 'admin']), addFeedback);

export default router;
