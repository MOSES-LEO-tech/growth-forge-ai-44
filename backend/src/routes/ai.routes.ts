import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { chat, chatLegacy } from '../controllers/ai.controller';

const router = Router();

// Authenticated streaming chat with real LLM
router.post('/chat', authenticateToken, chat);

// Legacy endpoint (backward compatibility)
router.post('/chat/legacy', chatLegacy);

export default router;
