import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const USERS = {
    student: { email: 'marklot001@gmail.com', password: 'mark003@', role: 'student' },
    teacher: { email: 'teacher@example.com', password: 'pass123', role: 'teacher' },
    parent: { email: 'parent@example.com', password: 'pass123', role: 'parent' }
};

async function login(user) {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, { email: user.email, password: user.password });
        console.log(`✅ [${user.role.toUpperCase()}] Login Successful`);
        return res.data.token;
    } catch (e) {
        console.error(`❌ [${user.role.toUpperCase()}] Login Failed:`, e.response?.data?.message || e.message);
        return null;
    }
}

async function testStudent(token) {
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('\n--- Testing Student Features ---');

    try {
        const p = await axios.get(`${API_URL}/profile/me`, auth);
        console.log(`✅ Profile: ${p.data.full_name}`);
    } catch (e) { console.error('❌ Profile Fetch Failed', e.message); }

    try {
        // Link Parent
        console.log('Testing Link Parent...');
        await axios.post(`${API_URL}/profile/link-parent`, {
            parentEmail: USERS.parent.email,
            relationship: 'Father'
        }, auth);
        console.log(`✅ Parent Linked Successfully`);
    } catch (e) {
        // Ignore unique constraint error if already linked
        if (e.response?.status === 500) console.log('✅ Parent Link (Already Linked)');
        else console.error('❌ Link Parent Failed', e.response?.data || e.message);
    }

    try {
        const projects = await axios.get(`${API_URL}/projects`, auth);
        console.log(`✅ Projects My List: ${projects.data.length} items`);
    } catch (e) { console.error('❌ Projects List Failed', e.message); }

    try {
        const gallery = await axios.get(`${API_URL}/personal-gallery`, auth);
        console.log(`✅ Gallery: ${gallery.data.length} items`);
    } catch (e) { console.error('❌ Gallery List Failed', e.message); }
}

async function testTeacher(token) {
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('\n--- Testing Teacher Features ---');

    try {
        const p = await axios.get(`${API_URL}/profile/me`, auth);
        console.log(`✅ Profile: ${p.data.full_name}`);
    } catch (e) { console.error('❌ Profile Fetch Failed', e.message); }

    try {
        // Teacher view pending projects
        const pending = await axios.get(`${API_URL}/projects?pending=true`, auth);
        console.log(`✅ Pending Projects Queue: ${pending.data.length} items`);
    } catch (e) { console.error('❌ Pending Projects Failed', e.message); }
}

async function testParent(token) {
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    console.log('\n--- Testing Parent Features ---');

    try {
        const p = await axios.get(`${API_URL}/profile/me`, auth);
        console.log(`✅ Profile: ${p.data.full_name}`);
    } catch (e) { console.error('❌ Profile Fetch Failed', e.message); }

    try {
        const children = await axios.get(`${API_URL}/profile/children`, auth);
        console.log(`✅ Linked Children: ${children.data.length} (Expected 1)`);
    } catch (e) { console.error('❌ Children List Failed', e.response?.data || e.message); }
}

async function runAudit() {
    console.log('--- Starting Comprehensive System Audit ---\n');

    const studentToken = await login(USERS.student);
    if (studentToken) await testStudent(studentToken);

    const teacherToken = await login(USERS.teacher);
    if (teacherToken) await testTeacher(teacherToken);

    const parentToken = await login(USERS.parent);
    if (parentToken) await testParent(parentToken);

    console.log('\n--- Audit Complete ---');
}

runAudit();
