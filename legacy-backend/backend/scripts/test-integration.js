"use strict";
// import { fetch } from 'undici'; // Using native fetch
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const API_URL = 'http://localhost:3000/api';
function testIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('Starting Integration Tests...');
        try {
            // 1. Register User
            const email = `test${Date.now()}@example.com`;
            const password = 'password123';
            console.log(`\n1. Registering user: ${email}`);
            const registerRes = yield fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name: 'Test User', role: 'student' })
            });
            const registerData = yield registerRes.json();
            console.log('Register Response:', registerRes.status, registerData);
            if (!registerRes.ok)
                throw new Error('Registration failed');
            // 2. Login
            console.log('\n2. Logging in...');
            const loginRes = yield fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const loginData = yield loginRes.json();
            console.log('Login Response:', loginRes.status, loginData.token ? 'Token received' : 'No token');
            if (!loginRes.ok)
                throw new Error('Login failed');
            const token = loginData.token;
            // 3. Create Project
            console.log('\n3. Creating Project...');
            const projectRes = yield fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: 'Integration Test Project',
                    description: 'Testing API',
                    start_date: new Date().toISOString(),
                    status: 'pending'
                })
            });
            const projectData = yield projectRes.json();
            console.log('Create Project Response:', projectRes.status, projectData);
            if (!projectRes.ok)
                throw new Error('Create Project failed');
            const projectId = projectData.data.id; // Assuming ApiResponse structure
            // 4. Get Projects
            console.log('\n4. Fetching Projects...');
            const getProjectsRes = yield fetch(`${API_URL}/projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const getProjectsData = yield getProjectsRes.json();
            console.log('Get Projects Response:', getProjectsRes.status, ((_a = getProjectsData.data) === null || _a === void 0 ? void 0 : _a.length) + ' projects found');
            // 5. Create Event (Gallery)
            console.log('\n5. Creating Event...');
            const eventRes = yield fetch(`${API_URL}/gallery/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: 'Test Event',
                    description: 'Integration Test Event',
                    event_date: new Date().toISOString(),
                    type: 'personal'
                })
            });
            const eventData = yield eventRes.json();
            console.log('Create Event Response:', eventRes.status, eventData);
            if (!eventRes.ok)
                throw new Error('Create Event failed');
            console.log('\n✅ Integration Tests Completed Successfully!');
        }
        catch (error) {
            console.error('\n❌ Integration Tests Failed:', error);
            process.exit(1);
        }
    });
}
testIntegration();
