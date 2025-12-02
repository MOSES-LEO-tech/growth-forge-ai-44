import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth.routes';
import scholarshipRoutes from '../src/routes/scholarship.routes';
import { pool } from '../src/config/database';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/scholarship', scholarshipRoutes);

describe('Scholarship Matching API', () => {
  let userEmail = `match${Date.now()}@example.com`;
  let userId: number;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'TestPassword123!', full_name: 'Match User', role: 'student' });
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    userId = userRes.rows[0].id;

    await pool.query('INSERT INTO events (title, type, created_by) VALUES ($1, $2, $3)', ['Coding Club', 'code', userId]);
    await pool.query('INSERT INTO achievements (user_id, title) VALUES ($1, $2)', [userId, 'Hackathon Winner']);
    await pool.query('INSERT INTO projects (owner_id, title, skills) VALUES ($1, $2, $3)', [userId, 'Web App', JSON.stringify(['javascript','react'])]);

    await pool.query(
      'INSERT INTO scholarships (title, description, amount, requirements, eligibility_criteria) VALUES ($1, $2, $3, $4, $5)',
      [
        'Tech Scholarship',
        'For coding students',
        1000,
        JSON.stringify({ skills: ['javascript'] }),
        JSON.stringify({ event_types: ['code'], skills: ['react'] })
      ]
    );
  });

  it('returns ranked matches with explanations', async () => {
    const res = await request(app).get(`/api/scholarship/match`).query({ studentId: userId, limit: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.matches)).toBe(true);
    const first = res.body.data.matches[0];
    expect(first.score).toBeGreaterThan(0);
    expect(Array.isArray(first.explanations)).toBe(true);
  });
});

