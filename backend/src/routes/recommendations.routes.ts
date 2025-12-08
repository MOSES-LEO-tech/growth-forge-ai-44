import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { generateRecommendations } from '../controllers/recommendations.controller';

const router = Router();

// Authenticated - personalized recommendations
router.get('/generate', authenticateToken, generateRecommendations);

export default router;
