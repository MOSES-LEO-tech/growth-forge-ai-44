import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement
} from '../controllers/achievements.controller';

const router = Router();

router.get('/', authenticateToken, getAchievements);
router.get('/:id', authenticateToken, getAchievementById);
router.post('/', authenticateToken, createAchievement);
router.put('/:id', authenticateToken, updateAchievement);
router.delete('/:id', authenticateToken, deleteAchievement);

export default router;
