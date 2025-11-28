import request from 'supertest';
import express from 'express';
import projectRoutes from '../src/routes/project.routes';
import authRoutes from '../src/routes/auth.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

describe('Projects API', () => {
    let authToken: string;
    let userId: number;
    let projectId: number;

    beforeAll(async () => {
        // Register and login to get auth token
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: `projecttest${Date.now()}@example.com`,
                password: 'TestPassword123!',
                full_name: 'Project Test User',
                role: 'student'
            });

        userId = registerRes.body.data.id;

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: registerRes.body.data.email,
                password: 'TestPassword123!'
            });

        authToken = loginRes.body.token;
    });

    describe('POST /api/projects', () => {
        it('should create a project successfully', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Project',
                    description: 'A test project',
                    start_date: new Date().toISOString(),
                    status: 'ongoing'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.title).toBe('Test Project');

            projectId = res.body.data.id;
        });

        it('should reject project without title (validation)', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Missing title',
                    start_date: new Date().toISOString()
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject unauthorized request', async () => {
            const res = await request(app)
                .post('/api/projects')
                .send({
                    title: 'Unauthorized Project',
                    start_date: new Date().toISOString()
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/projects', () => {
        it('should get all user projects', async () => {
            const res = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/projects/:id', () => {
        it('should get a specific project', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(projectId);
        });

        it('should return 404 for non-existent project', async () => {
            const res = await request(app)
                .get('/api/projects/99999')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /api/projects/:id', () => {
        it('should update a project', async () => {
            const res = await request(app)
                .put(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Updated Test Project',
                    description: 'Updated description',
                    status: 'complete'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe('Updated Test Project');
            expect(res.body.data.status).toBe('complete');
        });
    });

    describe('DELETE /api/projects/:id', () => {
        it('should soft delete a project', async () => {
            const res = await request(app)
                .delete(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify project is hidden from GET
            const getRes = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`);

            const deletedProject = getRes.body.data.find((p: any) => p.id === projectId);
            expect(deletedProject).toBeUndefined();
        });
    });
});
