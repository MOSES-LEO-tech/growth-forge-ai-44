import { Router } from 'express';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject
} from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize, requireSchoolMember } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { projectSchema } from '../utils/schemas';

const router = Router();

// All project routes require authentication and school membership
router.use(authenticateToken);
router.use(requireSchoolMember);

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

export default router;
