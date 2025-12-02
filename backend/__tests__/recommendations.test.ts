import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth.routes';
import recommendationsRoutes from '../src/routes/recommendations.routes';
import { pool } from '../src/config/database';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/recommendations', recommendationsRoutes);

describe('Recommendations API', () => {
  let userEmail = `reco${Date.now()}@example.com`;
  let userId: number;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: 'TestPassword123!', full_name: 'Reco User', role: 'student' });
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
    userId = userRes.rows[0].id;

    await pool.query('INSERT INTO events (title, type, created_by) VALUES ($1, $2, $3)', ['Debate', 'debate', userId]);

    await pool.query(
      'INSERT INTO scholarships (title, description, amount, eligibility_criteria) VALUES ($1, $2, $3, $4)',
      [
        'CS Major Scholarship',
        'For CS majors',
        2000,
        JSON.stringify({ event_types: ['debate'] }),
      ]
    );
  });

  it('returns recommendations with actions and scholarships', async () => {
    const res = await request(app).get('/api/recommendations/generate').query({ studentId: userId });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.scholarships)).toBe(true);
    expect(Array.isArray(res.body.data.actions)).toBe(true);
  });
});
