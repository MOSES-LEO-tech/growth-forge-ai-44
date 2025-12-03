import { Router } from 'express';
import { getProfile, updateProfile, getPublicProfile, linkParent } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get own profile
router.get('/me', getProfile);

// Update own profile
router.put('/me', updateProfile);

// Link parent (Student only)
router.post('/link-parent', authorize(['student']), linkParent);

// Get public profile (must be last to avoid conflict with specific paths)
router.get('/:id', getPublicProfile);

export default router;
