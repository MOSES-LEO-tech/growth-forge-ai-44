import { Router } from 'express';
import {
    getEvents,
    getEventDetails,
    createEvent,
    addEventMedia,
    deleteEvent
} from '../controllers/school-gallery.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize, requireSchoolMember } from '../middleware/rbac.middleware';

const router = Router();

// Everyone must be logged in
router.use(authenticateToken);

// Public View (All authenticated users can see)
router.get('/', getEvents);
router.get('/:id', getEventDetails);

// Creation/Modification (Teachers/Admins only)
// Note: We check school association inside controller for stricter security, 
// but authorize role here first.
router.post('/', authorize(['teacher', 'admin']), createEvent);
router.post('/:id/media', authorize(['teacher', 'admin']), addEventMedia);
router.delete('/:id', authorize(['teacher', 'admin']), deleteEvent);

export default router;
