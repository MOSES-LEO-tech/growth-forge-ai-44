import { Router } from 'express';
import { getStats, getAchievements, getProjects } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticateToken, getStats);
router.get('/achievements', authenticateToken, getAchievements);
router.get('/projects', authenticateToken, getProjects);

export default router;
