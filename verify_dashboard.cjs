const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'curltest4@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Get Stats
        console.log('Fetching stats...');
        const statsRes = await axios.get(`${API_URL}/dashboard/stats`, config);
        console.log('Stats:', statsRes.data);

        // 3. Get Achievements
        console.log('Fetching achievements...');
        const achievementsRes = await axios.get(`${API_URL}/dashboard/achievements`, config);
        console.log('Achievements:', achievementsRes.data);

        // 4. Get Projects
        console.log('Fetching projects...');
        const projectsRes = await axios.get(`${API_URL}/dashboard/projects`, config);
        console.log('Projects:', projectsRes.data);

        console.log('ALL VERIFICATIONS PASSED');
    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

verify();
