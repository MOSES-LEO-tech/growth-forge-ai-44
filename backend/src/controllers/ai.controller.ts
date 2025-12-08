import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { streamAIChat, buildChatResponse } from '../services/ai-chat.service';
import { matchScholarshipsForStudent } from '../services/match.service';
import { generateRecommendationsForStudent } from '../services/recommendations.service';

// Streaming AI chat endpoint (authenticated)
export const chat = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const message = String(req.body.message || '');

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!message.trim()) {
    res.status(400).json({ success: false, message: 'Message is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // First send matches and recommendations
    const [matches, recos] = await Promise.all([
      matchScholarshipsForStudent(userId, 5),
      generateRecommendationsForStudent(userId)
    ]);

    res.write(`event: matches\n`);
    res.write(`data: ${JSON.stringify(matches)}\n\n`);
    res.write(`event: recommendations\n`);
    res.write(`data: ${JSON.stringify(recos)}\n\n`);

    // Then stream AI response
    for await (const chunk of streamAIChat(userId, message)) {
      res.write(`event: token\n`);
      res.write(chunk);
    }

    res.end();
  } catch (error: any) {
    console.error('Chat error:', error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: 'Server error' })}\n\n`);
    res.end();
  }
};

// Legacy endpoint for backward compatibility (accepts studentId query param)
export const chatLegacy = async (req: AuthRequest, res: Response) => {
  const studentId = parseInt(String(req.body.studentId || req.user?.id || '0'), 10);
  const message = String(req.body.message || '');

  if (!studentId || Number.isNaN(studentId)) {
    res.status(400).json({ success: false, message: 'studentId is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const data = await buildChatResponse(studentId, message);
    res.write(`event: token\n`);
    res.write(`data: ${JSON.stringify({ text: 'Analyzing...' })}\n\n`);
    res.write(`event: matches\n`);
    res.write(`data: ${JSON.stringify(data.matches)}\n\n`);
    res.write(`event: recommendations\n`);
    res.write(`data: ${JSON.stringify(data.recos)}\n\n`);
    res.write(`event: token\n`);
    res.write(`data: ${JSON.stringify({ text: data.text })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: 'Server error' })}\n\n`);
    res.end();
  }
};
