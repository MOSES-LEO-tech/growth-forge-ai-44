import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const USER = {
    email: 'marklot001@gmail.com',
    password: 'mark003@'
};

async function runTest() {
    console.log('--- Starting QA Test for Mark Lot ---');

    // 1. Auth
    let token;
    try {
        console.log('1. Testing Login...');
        const res = await axios.post(`${API_URL}/auth/login`, USER);
        token = res.data.token;
        console.log('✅ Login Successful');
    } catch (e) {
        console.error('❌ Login Failed:', e.response?.data || e.message);
        process.exit(1);
    }

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Profile
    try {
        console.log('2. Testing Get Profile...');
        const res = await axios.get(`${API_URL}/profile/me`, auth);
        console.log(`✅ Profile Fetched: ${res.data.full_name} (${res.data.role})`);
    } catch (e) {
        console.error('❌ Profile Fetch Failed:', e.response?.data || e.message);
    }

    // 3. Dashboard Stats (Student)
    try {
        console.log('3. Testing Dashboard Stats...');
        const res = await axios.get(`${API_URL}/achievements`, auth);
        console.log('✅ Achievements/Stats Fetched');
    } catch (e) {
        console.error('❌ Dashboard Stats Failed:', e.response?.data || e.message);
    }

    // 4. Projects
    try {
        console.log('4. Testing Projects List...');
        const res = await axios.get(`${API_URL}/projects`, auth);
        console.log(`✅ Projects List Fetched: ${res.data.length} items`);
    } catch (e) {
        console.error('❌ Projects List Failed:', e.response?.data || e.message);
    }

    // 5. Gallery
    try {
        console.log('5. Testing Personal Gallery...');
        const res = await axios.get(`${API_URL}/personal-gallery`, auth);
        console.log(`✅ Personal Gallery Fetched: ${res.data.length} items`);
    } catch (e) {
        console.error('❌ Personal Gallery Failed:', e.response?.data || e.message);
    }

    console.log('--- QA Test Complete ---');
}

runTest();
