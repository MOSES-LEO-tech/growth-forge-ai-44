# Growth Forge AI - Testing Guide

## Prerequisites

Before testing, ensure:
1. Docker Desktop is running
2. Database is started: `docker-compose up -d db`
3. Backend dependencies installed: `cd backend && npm install`
4. Frontend dependencies installed: `npm install`

---

## 1. Run Database Migration

### Option A: Docker
```bash
docker-compose exec db psql -U postgres -d growth_forge -f /docker-entrypoint-initdb.d/006_schools_enhancements.sql
```

### Option B: Local (if PostgreSQL installed)
```bash
psql -U postgres -d growth_forge -f backend/migrations/006_schools_enhancements.sql
```

---

## 2. Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server running on port 3000
API Documentation: http://localhost:3000/api-docs
Connected to PostgreSQL database
```

---

## 3. Start Frontend

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in 200 ms

➜  Local:   http://localhost:8080/
➜  Network: http://localhost:8081/
```

---

## 4. Test API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"..."}
```

### Schools Module

#### Get All Schools
```bash
curl http://localhost:3000/api/schools
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "schools": [...],
    "pagination": {...}
  },
  "message": "Schools retrieved successfully"
}
```

#### Get Single School
```bash
curl http://localhost:3000/api/schools/1
```

#### Get School Stats
```bash
curl http://localhost:3000/api/schools/1/stats
```

### Recommendations Module

#### Get Scholarship Recommendations
```bash
curl http://localhost:3000/api/recommendations/scholarships
```

#### Get Profile Completeness
```bash
curl http://localhost:3000/api/recommendations/completeness
```

#### Get Action Items
```bash
curl http://localhost:3000/api/recommendations/actions
```

#### Get Dashboard (All)
```bash
curl http://localhost:3000/api/recommendations/dashboard
```

---

## 5. Test Frontend Pages

### Schools Page
1. Open: http://localhost:8080/schools
2. Verify: Schools are displayed in grid
3. Verify: Search functionality works
4. Verify: Click on school navigates to profile

### School Profile Page
1. Open: http://localhost:8080/schools/1
2. Verify: School details are displayed
3. Verify: School statistics are shown
4. Verify: Gallery, Hall of Fame sections render

### Recommendations Page
1. Open: http://localhost:8080/recommendations
2. Verify: Profile completeness gauge displays
3. Verify: Scholarship matches are shown
4. Verify: Action items are listed

---

## 6. Test Authentication Flow

### Login
1. Open: http://localhost:8080/auth
2. Login with test credentials:
   - Email: `student@school.edu`
   - Password: `Test123!`

### Verify Authenticated Requests
After login, the JWT token is stored. Subsequent requests to:
- `/api/schools` - Returns schools list
- `/api/recommendations/*` - Returns personalized recommendations

---

## 7. Test Email Service (Development Mode)

In development mode, emails are logged to console instead of sent.

1. Trigger email (e.g., password reset)
2. Check backend console for:
```
📧 [DEV] Email sent:
   To: user@example.com
   Subject: Reset Your Password - Growth Forge AI
```

---

## 8. Common Issues & Fixes

### "ECONNREFUSED" - Database not running
```bash
docker-compose up -d db
```

### "Port 3000 in use" - Kill existing process
```bash
npx kill-port 3000
```

### "Port 8080 in use" - Kill existing process
```bash
npx kill-port 8080
```

### TypeScript errors in backend
```bash
cd backend
npm run build
```

### Frontend build errors
```bash
npm run build
```

---

## 9. Automated Tests

### Run Backend Tests
```bash
cd backend
npm test
```

### Run Backend Tests with Coverage
```bash
npm run test:coverage
```

---

## 10. Test Data

### Sample Schools (Added by Migration)
1. Greenfield International Academy (London, UK)
2. Nairobi STEM High School (Nairobi, Kenya)
3. Cape Town Arts Academy (Cape Town, South Africa)

### Sample Scholarships (Added by Migration)
1. African Excellence Scholarship ($25,000)
2. STEM Women Initiative ($15,000)
3. Young Leaders Award ($10,000)

### Test Users
| Email | Password | Role |
|-------|----------|------|
| admin@growthforge.ai | Test123! | Admin |
| teacher@school.edu | Test123! | Teacher |
| student@school.edu | Test123! | Student |
| parent@email.com | Test123! | Parent |

---

## 11. Performance Testing

### Load Testing with Artillery
```bash
npm install -g artillery
artillery quick --count 10 --duration 5 http://localhost:3000/health
```

---

## 12. Security Testing

### Test Rate Limiting
Make more than 5 login attempts in 15 minutes - should be blocked.

### Test Role-Based Access
- Try to create school without admin role - should fail with 403
- Try to access admin endpoints without auth - should fail with 401

---

## 13. Browser Console Check

Open browser DevTools (F12) and check for:
- No red errors in Console
- No failed network requests
- API calls returning 200 status

---

## 14. Mobile Responsiveness

Test at different viewport sizes:
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667

Use Chrome DevTools Device Toolbar (Ctrl+Shift+M)

---

## Test Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Schools listing | ⏳ | |
| School profile | ⏳ | |
| Recommendations dashboard | ⏳ | |
| Profile completeness | ⏳ | |
| Scholarship matching | ⏳ | |
| Action items | ⏳ | |
| Authentication | ⏳ | |
| Email logging | ⏳ | |
| Mobile responsive | ⏳ | |

---

## Report Bugs

If you find bugs, add them to [`BUG_LOG.md`](BUG_LOG.md) with:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots (if applicable)
