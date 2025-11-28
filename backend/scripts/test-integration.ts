// import { fetch } from 'undici'; // Using native fetch

const API_URL = 'http://localhost:3000/api';

async function testIntegration() {
    console.log('Starting Integration Tests...');

    try {
        // 1. Register User
        const email = `test${Date.now()}@example.com`;
        const password = 'password123';
        console.log(`\n1. Registering user: ${email}`);

        const registerRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: 'Test User', role: 'student' })
        });

        const registerData = await registerRes.json() as any;
        console.log('Register Response:', registerRes.status, registerData);

        if (!registerRes.ok) throw new Error('Registration failed');

        // 2. Login
        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json() as any;
        console.log('Login Response:', loginRes.status, loginData.token ? 'Token received' : 'No token');

        if (!loginRes.ok) throw new Error('Login failed');
        const token = loginData.token;

        // 3. Create Project
        console.log('\n3. Creating Project...');
        const projectRes = await fetch(`${API_URL}/projects`, {
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

        const projectData = await projectRes.json() as any;
        console.log('Create Project Response:', projectRes.status, projectData);

        if (!projectRes.ok) throw new Error('Create Project failed');
        const projectId = projectData.data.id; // Assuming ApiResponse structure

        // 4. Get Projects
        console.log('\n4. Fetching Projects...');
        const getProjectsRes = await fetch(`${API_URL}/projects`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const getProjectsData = await getProjectsRes.json() as any;
        console.log('Get Projects Response:', getProjectsRes.status, getProjectsData.data?.length + ' projects found');

        // 5. Create Event (Gallery)
        console.log('\n5. Creating Event...');
        const eventRes = await fetch(`${API_URL}/gallery/events`, {
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

        const eventData = await eventRes.json() as any;
        console.log('Create Event Response:', eventRes.status, eventData);

        if (!eventRes.ok) throw new Error('Create Event failed');

        console.log('\n✅ Integration Tests Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Integration Tests Failed:', error);
        process.exit(1);
    }
}

testIntegration();
