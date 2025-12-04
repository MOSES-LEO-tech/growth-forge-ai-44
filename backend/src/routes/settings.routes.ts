import { Router } from 'express';
import { getSetting, updateSetting, getAllSettings } from '../controllers/settings.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

// Public: get a specific setting (for hero video, etc.)
router.get('/:key', getSetting);

// Admin only: update settings
router.put('/:key', authenticateToken, authorize(['admin']), updateSetting);

// Admin only: get all settings
router.get('/', authenticateToken, authorize(['admin']), getAllSettings);

export default router;
