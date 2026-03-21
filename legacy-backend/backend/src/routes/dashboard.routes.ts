import { Router } from 'express';
import { getStats, getAchievements, getProjects } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireSchoolMember } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireSchoolMember);

router.get('/stats', getStats);
router.get('/achievements', getAchievements);
router.get('/projects', getProjects);

export default router;
