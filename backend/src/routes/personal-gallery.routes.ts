import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} from '../controllers/personal-gallery.controller';

const router = Router();

router.get('/', authenticateToken, getGalleryItems);
router.get('/:id', authenticateToken, getGalleryItemById);
router.post('/', authenticateToken, createGalleryItem);
router.put('/:id', authenticateToken, updateGalleryItem);
router.delete('/:id', authenticateToken, deleteGalleryItem);

export default router;
