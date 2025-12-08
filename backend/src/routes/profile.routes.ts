import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
    getProfile,
    updateProfile,
    getPublicProfile,
    linkParent,
    getChildren
} from '../controllers/profile.controller';

const router = Router();

router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);
router.get('/children', authenticateToken, getChildren);
router.get('/:id', authenticateToken, getPublicProfile);
router.post('/link-parent', authenticateToken, linkParent);

export default router;
