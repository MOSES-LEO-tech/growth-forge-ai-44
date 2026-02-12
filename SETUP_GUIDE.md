# Growth Forge AI - Setup Guide

## Quick Start

### Prerequisites
- Docker Desktop (for PostgreSQL database)
- Node.js 18+ (for backend)
- Bun or npm (package manager)

---

## Step 1: Start Docker Desktop

Docker Desktop must be running to provide the PostgreSQL database.

1. Open Docker Desktop application
2. Wait for it to fully start (indicator shows green)
3. If you see any errors, restart Docker Desktop

---

## Step 2: Start the Database with Docker Compose

```bash
# Start PostgreSQL and other services
docker-compose up -d db

# Verify the database is running
docker ps | grep postgres
```

Expected output should show a healthy PostgreSQL container on port 5432.

---

## Step 3: Start the Backend Server

**Option A: Using Docker Compose (Recommended)**
```bash
docker-compose up -d backend
```

**Option B: Running locally with ts-node**
```bash
cd backend
npm install  # If not already installed
npx ts-node src/server.ts
```

---

## Step 4: Verify the Backend is Running

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response: {"status":"ok","timestamp":"..."}
```

---

## Step 5: Test the Login Flow

### Using curl (Backend API)
```bash
# Test login with sample user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@school.edu","password":"Test123!"}'
```

### Using the Frontend
1. Start the frontend: `cd growth-forge-ai-44-main && npm run dev`
2. Open http://localhost:8080/auth
3. Login with sample credentials (see below)

---

## Test Accounts

All accounts use the password: **Test123!**

| Email | Role | Description |
|-------|------|-------------|
| admin@growthforge.ai | Admin | System administrator |
| teacher@school.edu | Teacher | Sample teacher account |
| student@school.edu | Student | Sample student account |
| parent@email.com | Parent | Sample parent account |

---

## Database Schema

### Core Tables
- **users** - User accounts with roles (student, parent, teacher, admin)
- **schools** - School information
- **profiles** - Extended user profile data
- **student_levels** - Gamification levels and points
- **achievements** - User achievements and certifications
- **projects** - Portfolio projects
- **scholarships** - Scholarship opportunities
- **recommendations** - AI-generated recommendations

### Database Connection
- **Host**: localhost (for local dev) or db (for Docker)
- **Port**: 5432
- **Database**: growth_forge
- **Username**: postgres
- **Password**: postgres

---

## Troubleshooting

### "ECONNREFUSED" Error
This means Docker is not running or the database container is not started.
1. Start Docker Desktop
2. Run: `docker-compose up -d db`

### "EADDRINUSE" Error (Port 3000)
Another process is using port 3000.
1. Kill the process: `npx kill-port 3000`
2. Or use a different port: `PORT=3001 npx ts-node src/server.ts`

### Rate Limiter IPv6 Error
This was a known issue fixed in server.ts. Make sure you're using the latest version.

### Login Returns "Invalid Credentials"
1. Verify the database has seed data: `docker-compose exec db psql -U postgres -d growth_forge -c "SELECT email FROM users;"`
2. Check the password is correct: `Test123!`
3. Ensure the user exists in the database

---

## Development Workflow

### Running Tests
```bash
cd backend
npm test
```

### Database Migrations
```bash
# Run migrations manually
docker-compose exec db psql -U postgres -d growth_forge -f /docker-entrypoint-initdb.d/init.sql
```

### Adding New Seed Data
Edit `backend/seed.sql` and run:
```bash
docker-compose exec db psql -U postgres -d growth_forge -f /docker-entrypoint-initdb.d/seed.sql
```

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/growth_forge
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:8080
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Growth Forge AI                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                   │
│  - Authentication: Supabase                                 │
│  - UI: Shadcn/UI + Tailwind CSS                            │
│  - Runs on: http://localhost:8080                          │
├─────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express)                               │
│  - Auth: Custom JWT                                        │
│  - API: REST + Swagger Docs                                │
│  - Runs on: http://localhost:3000                          │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                     │
│  - Users, Projects, Achievements, Scholarships             │
│  - Runs on: localhost:5432 (Docker)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Start Docker Desktop
2. ✅ Start database: `docker-compose up -d db`
3. ✅ Start backend: `npx ts-node src/server.ts`
4. ⏳ Test login with sample accounts
5. ⏳ Explore the dashboard and features
6. ⏳ Add your own projects and achievements
