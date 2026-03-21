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
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
describe('Authentication API', () => {
    const testUser = {
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        full_name: 'Test User',
        role: 'student'
    };
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser);
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.email).toBe(testUser.email);
        }));
        it('should reject duplicate email', () => __awaiter(void 0, void 0, void 0, function* () {
            // Register once
            yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser);
            // Try to register again
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser);
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        }));
        it('should reject invalid email format', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(Object.assign(Object.assign({}, testUser), { email: 'invalid-email' }));
            expect(res.statusCode).toBe(400);
        }));
    });
    describe('POST /api/auth/login', () => {
        beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
            // Ensure user exists
            yield (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send(testUser);
        }));
        it('should login successfully with correct credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('token');
        }));
        it('should reject incorrect password', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: 'WrongPassword123!'
            });
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        }));
        it('should reject non-existent user', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });
            expect(res.statusCode).toBe(401);
        }));
    });
});
