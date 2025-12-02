import { Router } from 'express';
import { matchScholarships } from '../controllers/scholarship.controller';

const router = Router();

router.get('/match', matchScholarships);

export default router;
