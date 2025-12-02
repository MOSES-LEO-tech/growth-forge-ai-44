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
const project_routes_1 = __importDefault(require("../src/routes/project.routes"));
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/projects', project_routes_1.default);
describe('Projects API', () => {
    let authToken;
    let userId;
    let projectId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register and login to get auth token
        const registerRes = yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({
            email: `projecttest${Date.now()}@example.com`,
            password: 'TestPassword123!',
            full_name: 'Project Test User',
            role: 'student'
        });
        userId = registerRes.body.data.id;
        const loginRes = yield (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({
            email: registerRes.body.data.email,
            password: 'TestPassword123!'
        });
        authToken = loginRes.body.token;
    }));
    describe('POST /api/projects', () => {
        it('should create a project successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
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
        }));
        it('should reject project without title (validation)', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                description: 'Missing title',
                start_date: new Date().toISOString()
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        }));
        it('should reject unauthorized request', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/projects')
                .send({
                title: 'Unauthorized Project',
                start_date: new Date().toISOString()
            });
            expect(res.statusCode).toBe(401);
        }));
    });
    describe('GET /api/projects', () => {
        it('should get all user projects', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
        }));
    });
    describe('GET /api/projects/:id', () => {
        it('should get a specific project', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(projectId);
        }));
        it('should return 404 for non-existent project', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .get('/api/projects/99999')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(404);
        }));
    });
    describe('PUT /api/projects/:id', () => {
        it('should update a project', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
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
        }));
    });
    describe('DELETE /api/projects/:id', () => {
        it('should soft delete a project', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .delete(`/api/projects/${projectId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // Verify project is hidden from GET
            const getRes = yield (0, supertest_1.default)(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`);
            const deletedProject = getRes.body.data.find((p) => p.id === projectId);
            expect(deletedProject).toBeUndefined();
        }));
    });
});
