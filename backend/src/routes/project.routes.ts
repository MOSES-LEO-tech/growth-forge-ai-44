import { Router } from 'express';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject
} from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All project routes require authentication
router.use(authenticateToken);

// Get all projects for user
router.get('/', getProjects);

// Get single project
router.get('/:id', getProject);

// Create new project
router.post('/', createProject);

// Update project
router.put('/:id', updateProject);

// Delete project
router.delete('/:id', deleteProject);

export default router;
