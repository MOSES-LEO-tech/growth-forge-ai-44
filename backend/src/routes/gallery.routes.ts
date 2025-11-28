import { Router } from 'express';
import { getPublicEvents, getUserEvents, createEvent, addMedia, getEventById, getEventMedia, deleteEvent, deleteMedia } from '../controllers/gallery.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { eventSchema, mediaSchema } from '../utils/schemas';

const router = Router();

// Public routes
router.get('/public', getPublicEvents);
router.get('/events/:id', getEventById);
router.get('/events/:id/media', getEventMedia);

// Protected routes
router.get('/my-events', authenticateToken, getUserEvents);
router.post('/events', authenticateToken, validate(eventSchema), createEvent);
router.post('/media', authenticateToken, validate(mediaSchema), addMedia);
router.delete('/events/:id', authenticateToken, deleteEvent);
router.delete('/media/:id', authenticateToken, deleteMedia);

export default router;
