import { Router } from 'express';
import { createItem, getMyItems, updateItem, deleteItem, getStudentItems } from '../controllers/personal-gallery.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Student routes
router.post('/', authorize(['student']), createItem);
router.get('/', authorize(['student']), getMyItems);
router.put('/:id', authorize(['student']), updateItem);
router.delete('/:id', authorize(['student']), deleteItem);

// Parent routes
router.get('/student/:studentId', authorize(['parent']), getStudentItems);

export default router;
