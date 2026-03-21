import { Router } from 'express';
import { upload, handleMulterError } from '../middleware/upload.middleware';
import { uploadFile, uploadMultipleFiles, deleteFile } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All upload routes require authentication
router.use(authenticateToken);

// Single file upload
router.post('/single', upload.single('file'), handleMulterError, uploadFile);

// Multiple files upload
router.post('/multiple', upload.array('files', 10), handleMulterError, uploadMultipleFiles);

// Delete file
router.delete('/:filename', deleteFile);

export default router;
