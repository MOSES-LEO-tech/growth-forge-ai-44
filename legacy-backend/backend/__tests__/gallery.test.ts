import request from 'supertest';
import express from 'express';
import galleryRoutes from '../src/routes/gallery.routes';
import authRoutes from '../src/routes/auth.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);

describe('Gallery/Events API', () => {
    let authToken: string;
    let eventId: number;
    let mediaId: number;

    beforeAll(async () => {
        // Register and login
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: `gallerytest${Date.now()}@example.com`,
                password: 'TestPassword123!',
                full_name: 'Gallery Test User',
                role: 'student'
            });

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: registerRes.body.data.email,
                password: 'TestPassword123!'
            });

        authToken = loginRes.body.token;
    });

    describe('GET /api/gallery/public', () => {
        it('should get public events without authentication', async () => {
            const res = await request(app)
                .get('/api/gallery/public');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('POST /api/gallery/events', () => {
        it('should create an event successfully', async () => {
            const res = await request(app)
                .post('/api/gallery/events')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Event',
                    description: 'A test event',
                    event_date: new Date().toISOString(),
                    type: 'personal',
                    location: 'Test Location'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.title).toBe('Test Event');

            eventId = res.body.data.id;
        });

        it('should reject event without title (validation)', async () => {
            const res = await request(app)
                .post('/api/gallery/events')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Missing title',
                    event_date: new Date().toISOString()
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should reject unauthorized request', async () => {
            const res = await request(app)
                .post('/api/gallery/events')
                .send({
                    title: 'Unauthorized Event',
                    event_date: new Date().toISOString()
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/gallery/my-events', () => {
        it('should get user events', async () => {
            const res = await request(app)
                .get('/api/gallery/my-events')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/gallery/my-events');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/gallery/events/:id', () => {
        it('should get a specific event', async () => {
            const res = await request(app)
                .get(`/api/gallery/events/${eventId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(eventId);
        });

        it('should return 404 for non-existent event', async () => {
            const res = await request(app)
                .get('/api/gallery/events/99999');

            expect(res.statusCode).toBe(404);
        });
    });

    describe('POST /api/gallery/media', () => {
        it('should add media to event', async () => {
            const res = await request(app)
                .post('/api/gallery/media')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    event_id: eventId,
                    title: 'Test Media',
                    description: 'Test media item',
                    media_type: 'image',
                    media_url: 'https://example.com/image.jpg'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');

            mediaId = res.body.data.id;
        });

        it('should validate media URL', async () => {
            const res = await request(app)
                .post('/api/gallery/media')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    event_id: eventId,
                    media_type: 'image',
                    media_url: 'not-a-valid-url'
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('DELETE /api/gallery/media/:id', () => {
        it('should soft delete media', async () => {
            const res = await request(app)
                .delete(`/api/gallery/media/${mediaId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('DELETE /api/gallery/events/:id', () => {
        it('should soft delete event', async () => {
            const res = await request(app)
                .delete(`/api/gallery/events/${eventId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify event is hidden
            const getRes = await request(app)
                .get(`/api/gallery/events/${eventId}`);

            expect(getRes.statusCode).toBe(404);
        });

        it('should not allow deleting others events', async () => {
            // Create another user
            const otherUserRes = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `other${Date.now()}@example.com`,
                    password: 'TestPassword123!',
                    full_name: 'Other User',
                    role: 'student'
                });

            const otherLoginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: otherUserRes.body.data.email,
                    password: 'TestPassword123!'
                });

            const otherToken = otherLoginRes.body.token;

            // Create event with first user
            const eventRes = await request(app)
                .post('/api/gallery/events')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Protected Event',
                    event_date: new Date().toISOString(),
                    type: 'personal'
                });

            // Try to delete with other user
            const deleteRes = await request(app)
                .delete(`/api/gallery/events/${eventRes.body.data.id}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(deleteRes.statusCode).toBe(403);
        });
    });
});
