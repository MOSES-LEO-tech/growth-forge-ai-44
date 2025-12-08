import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { matchScholarships, getAllScholarships, getScholarshipById } from '../controllers/scholarship.controller';

const router = Router();

// Public endpoint - list all scholarships
router.get('/', getAllScholarships);
router.get('/:id', getScholarshipById);

// Authenticated - get personalized matches
router.get('/match', authenticateToken, matchScholarships);

export default router;
