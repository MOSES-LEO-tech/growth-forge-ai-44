import { Request, Response } from 'express';
import { buildChatResponse } from '../services/chat.service';

export const chat = async (req: Request, res: Response) => {
  const studentId = parseInt(String(req.body.studentId || '0'), 10);
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
