import { Router } from 'express';
import { getPublicEvents, getUserEvents, createEvent, addMedia, getEventById, getEventMedia, deleteEvent, deleteMedia } from '../controllers/gallery.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { eventSchema, mediaSchema } from '../utils/schemas';

const router = Router();

// Public routes
router.get('/public', getPublicEvents);
router.get('/events/:id', getEventById);
router.get('/events/:id/media', getEventMedia);

// Protected routes
router.use(authenticateToken);

router.get('/my-events', getUserEvents);
router.post('/events', authorize(['student', 'teacher', 'admin']), validate(eventSchema), createEvent);
router.post('/media', authorize(['student', 'teacher', 'admin']), validate(mediaSchema), addMedia);
router.delete('/events/:id', authorize(['student', 'teacher', 'admin']), deleteEvent);
router.delete('/media/:id', authorize(['student', 'teacher', 'admin']), deleteMedia);

export default router;
