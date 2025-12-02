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
const scholarship_routes_1 = __importDefault(require("../src/routes/scholarship.routes"));
const database_1 = require("../src/config/database");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/scholarship', scholarship_routes_1.default);
describe('Scholarship Matching API', () => {
    let userEmail = `match${Date.now()}@example.com`;
    let userId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({ email: userEmail, password: 'TestPassword123!', full_name: 'Match User', role: 'student' });
        const userRes = yield database_1.pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        userId = userRes.rows[0].id;
        yield database_1.pool.query('INSERT INTO events (title, type, created_by) VALUES ($1, $2, $3)', ['Coding Club', 'code', userId]);
        yield database_1.pool.query('INSERT INTO achievements (user_id, title) VALUES ($1, $2)', [userId, 'Hackathon Winner']);
        yield database_1.pool.query('INSERT INTO projects (owner_id, title, skills) VALUES ($1, $2, $3)', [userId, 'Web App', JSON.stringify(['javascript', 'react'])]);
        yield database_1.pool.query('INSERT INTO scholarships (title, description, amount, requirements, eligibility_criteria) VALUES ($1, $2, $3, $4, $5)', [
            'Tech Scholarship',
            'For coding students',
            1000,
            JSON.stringify({ skills: ['javascript'] }),
            JSON.stringify({ event_types: ['code'], skills: ['react'] })
        ]);
    }));
    it('returns ranked matches with explanations', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app).get(`/api/scholarship/match`).query({ studentId: userId, limit: 5 });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.matches)).toBe(true);
        const first = res.body.data.matches[0];
        expect(first.score).toBeGreaterThan(0);
        expect(Array.isArray(first.explanations)).toBe(true);
    }));
});
