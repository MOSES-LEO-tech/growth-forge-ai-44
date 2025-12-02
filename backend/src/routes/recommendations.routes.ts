import { Router } from 'express';
import { generateRecommendations } from '../controllers/recommendations.controller';

const router = Router();

router.get('/generate', generateRecommendations);

export default router;
