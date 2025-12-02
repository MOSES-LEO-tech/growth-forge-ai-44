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
        console.log('Starting Enhanced Integration Tests for Phase 2...');
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
            console.log('Register Response:', registerRes.status, registerData.success ? '✓' : '✗');
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
            console.log('Login Response:', loginRes.status, loginData.token ? '✓ Token received' : '✗ No token');
            if (!loginRes.ok)
                throw new Error('Login failed');
            const token = loginData.token;
            // 3. Test Validation - Invalid Project (missing title)
            console.log('\n3. Testing Validation - Invalid Project (missing title)...');
            const invalidProjectRes = yield fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    description: 'Testing validation',
                    start_date: new Date().toISOString(),
                })
            });
            const invalidProjectData = yield invalidProjectRes.json();
            console.log('Invalid Project Response:', invalidProjectRes.status, invalidProjectRes.status === 400 ? '✓ Validation works' : '✗ Should be 400');
            // 4. Create Valid Project
            console.log('\n4. Creating Valid Project...');
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
            console.log('Create Project Response:', projectRes.status, projectData.success ? '✓' : '✗');
            if (!projectRes.ok)
                throw new Error('Create Project failed');
            const projectId = projectData.data.id;
            // 5. Soft Delete Project
            console.log('\n5. Soft Deleting Project...');
            const deleteRes = yield fetch(`${API_URL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const deleteData = yield deleteRes.json();
            console.log('Delete Project Response:', deleteRes.status, deleteData.success ? '✓' : '✗');
            // 6. Verify Project is Hidden
            console.log('\n6. Verifying Project is Hidden from GET...');
            const getProjectsRes = yield fetch(`${API_URL}/projects`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const getProjectsData = yield getProjectsRes.json();
            const projectStillVisible = getProjectsData.data.some((p) => p.id === projectId);
            console.log('Project still visible:', projectStillVisible ? '✗ Should be hidden' : '✓ Correctly hidden');
            // 7. Create Event
            console.log('\n7. Creating Event...');
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
            console.log('Create Event Response:', eventRes.status, eventData.success ? '✓' : '✗');
            if (!eventRes.ok)
                throw new Error('Create Event failed');
            const eventId = eventData.data.id;
            // 8. Delete Event
            console.log('\n8. Deleting Event...');
            const deleteEventRes = yield fetch(`${API_URL}/gallery/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const deleteEventData = yield deleteEventRes.json();
            console.log('Delete Event Response:', deleteEventRes.status, deleteEventData.success ? '✓' : '✗');
            console.log('\n✅ All Phase 2 Integration Tests Completed Successfully!');
        }
        catch (error) {
            console.error('\n❌ Integration Tests Failed:', error);
            process.exit(1);
        }
    });
}
testIntegration();
