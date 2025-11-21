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
        console.log('Login successful.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Update Profile
        console.log('Updating profile...');
        const newName = 'Updated Name ' + Date.now();
        const updateRes = await axios.put(`${API_URL}/auth/profile`, {
            fullName: newName,
            avatarUrl: 'https://example.com/avatar.png'
        }, config);

        console.log('Update response:', updateRes.data);

        if (updateRes.data.full_name === newName) {
            console.log('SUCCESS: Profile name updated correctly.');
        } else {
            console.error('FAILURE: Profile name mismatch.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Verification Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

verify();
