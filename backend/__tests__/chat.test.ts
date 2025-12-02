import request from 'supertest';
import express from 'express';
import aiRoutes from '../src/routes/ai.routes';
import authRoutes from '../src/routes/auth.routes';
import { pool } from '../src/config/database';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

describe('AI Chat SSE', () => {
  let userEmail = `chat${Date.now()}@example.com`;
  let userId: number;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'TestPassword123!', full_name: 'Chat User', role: 'student' });
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    userId = userRes.rows[0].id;
  });

  it('streams events', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ studentId: userId, message: 'find scholarships' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/event-stream');
    expect(String(res.text)).toContain('event: matches');
  });
});

