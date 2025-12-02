"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const gallery_routes_1 = __importDefault(require("../src/routes/gallery.routes"));
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/gallery', gallery_routes_1.default);
describe('Gallery/Events API', () => {
    let authToken;
    let eventId;
    let mediaId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register and login
        const registerRes = yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({
            email: `gallerytest${Date.now()}@example.com`,
            password: 'TestPassword123!',
            full_name: 'Gallery Test User',
            role: 'student'
        });
        const loginRes = yield (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({
            email: registerRes.body.data.email,
            password: 'TestPassword123!'
        });
        authToken = loginRes.body.token;
    }));
    describe('GET /api/gallery/public', () => {
        it('should get public events without authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/gallery/public');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        }));
    });
    describe('POST /api/gallery/events', () => {
        it('should create an event successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
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
        }));
        it('should reject event without title (validation)', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/gallery/events')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                description: 'Missing title',
                event_date: new Date().toISOString()
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        }));
        it('should reject unauthorized request', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/gallery/events')
                .send({
                title: 'Unauthorized Event',
                event_date: new Date().toISOString()
            });
            expect(res.statusCode).toBe(401);
        }));
    });
    describe('GET /api/gallery/my-events', () => {
        it('should get user events', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/gallery/my-events')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        }));
        it('should require authentication', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/gallery/my-events');
            expect(res.statusCode).toBe(401);
        }));
    });
    describe('GET /api/gallery/events/:id', () => {
        it('should get a specific event', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get(`/api/gallery/events/${eventId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(eventId);
        }));
        it('should return 404 for non-existent event', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/gallery/events/99999');
            expect(res.statusCode).toBe(404);
        }));
    });
    describe('POST /api/gallery/media', () => {
        it('should add media to event', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
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
        }));
        it('should validate media URL', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/gallery/media')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                event_id: eventId,
                media_type: 'image',
                media_url: 'not-a-valid-url'
            });
            expect(res.statusCode).toBe(400);
        }));
    });
    describe('DELETE /api/gallery/media/:id', () => {
        it('should soft delete media', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .delete(`/api/gallery/media/${mediaId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        }));
    });
    describe('DELETE /api/gallery/events/:id', () => {
        it('should soft delete event', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .delete(`/api/gallery/events/${eventId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // Verify event is hidden
            const getRes = yield (0, supertest_1.default)(app)
                .get(`/api/gallery/events/${eventId}`);
            expect(getRes.statusCode).toBe(404);
        }));
        it('should not allow deleting others events', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create another user
            const otherUserRes = yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: `other${Date.now()}@example.com`,
                password: 'TestPassword123!',
                full_name: 'Other User',
                role: 'student'
            });
            const otherLoginRes = yield (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: otherUserRes.body.data.email,
                password: 'TestPassword123!'
            });
            const otherToken = otherLoginRes.body.token;
            // Create event with first user
            const eventRes = yield (0, supertest_1.default)(app)
                .post('/api/gallery/events')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                title: 'Protected Event',
                event_date: new Date().toISOString(),
                type: 'personal'
            });
            // Try to delete with other user
            const deleteRes = yield (0, supertest_1.default)(app)
                .delete(`/api/gallery/events/${eventRes.body.data.id}`)
                .set('Authorization', `Bearer ${otherToken}`);
            expect(deleteRes.statusCode).toBe(403);
        }));
    });
});
