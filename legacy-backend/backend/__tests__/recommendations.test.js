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
const recommendations_routes_1 = __importDefault(require("../src/routes/recommendations.routes"));
const database_1 = require("../src/config/database");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/recommendations', recommendations_routes_1.default);
describe('Recommendations API', () => {
    let userEmail = `reco${Date.now()}@example.com`;
    let userId;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app)
            .post('/api/auth/register')
            .send({ email: userEmail, password: 'TestPassword123!', full_name: 'Reco User', role: 'student' });
        const userRes = yield database_1.pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
        userId = userRes.rows[0].id;
        yield database_1.pool.query('INSERT INTO events (title, type, created_by) VALUES ($1, $2, $3)', ['Debate', 'debate', userId]);
        yield database_1.pool.query('INSERT INTO scholarships (title, description, amount, eligibility_criteria) VALUES ($1, $2, $3, $4)', [
            'CS Major Scholarship',
            'For CS majors',
            2000,
            JSON.stringify({ event_types: ['debate'] }),
        ]);
    }));
    it('returns recommendations with actions and scholarships', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app).get('/api/recommendations/generate').query({ studentId: userId });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.scholarships)).toBe(true);
        expect(Array.isArray(res.body.data.actions)).toBe(true);
    }));
});
