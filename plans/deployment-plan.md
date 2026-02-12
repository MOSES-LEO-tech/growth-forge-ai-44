# Deployment Plan - Growth Forge AI

## Overview
This document outlines the step-by-step plan to deploy the Growth Forge AI application to production, including database migrations, environment configuration, testing, and deployment procedures.

---

## Prerequisites

### System Requirements
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 7+ (optional, for caching)
- Git
- PM2 or similar process manager (for production)

### Access Requirements
- GitHub repository access
- Database credentials with migration permissions
- AWS account credentials (for S3 storage)
- Domain name (optional)

---

## Step 1: Prepare the Application

### 1.1 Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-org/growth-forge-ai-44.git
cd growth-forge-ai-44

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if using Lovable)
cd ../frontend  # or main project directory
npm install
```

### 1.2 Verify Build
```bash
cd backend
npm run build

# If using TypeScript
npx tsc --noEmit
```

### 1.3 Run Existing Tests
```bash
cd backend
npm test
```

---

## Step 2: Database Setup

### 2.1 Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE growth_forge;

# Create user (optional - use existing user)
CREATE USER growth_forge_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE growth_forge TO growth_forge_user;

# Connect to the database
\c growth_forge

# Grant schema permissions
GRANT ALL ON SCHEMA public TO growth_forge_user;
```

### 2.2 Run Existing Migrations
```bash
# Run the original schema (init.sql)
psql -U growth_forge_user -d growth_forge -f backend/init.sql
```

### 2.3 Run New Migrations (in order)
```bash
# Migration 001: Refresh tokens table
psql -U growth_forge_user -d growth_forge -f backend/migrations/001_refresh_tokens.sql

# Migration 002: Audit logs table
psql -U growth_forge_user -d growth_forge -f backend/migrations/002_audit_logs.sql
```

### 2.4 Verify Tables Created
```bash
psql -U growth_forge_user -d growth_forge -c "\dt"

# Expected tables:
# - users
# - schools
# - profiles
# - projects
# - achievements
# - refresh_tokens      (NEW)
# - audit_logs          (NEW)
```

---

## Step 3: Environment Variables

### 3.1 Create Production `.env` File

Create `backend/.env` with the following variables:

```env
# ============================================
# REQUIRED - Security
# ============================================

# Generate with: openssl rand -base64 32
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Generate with: openssl rand -base64 32
REFRESH_TOKEN_SECRET=your-super-secure-refresh-secret-min-32-chars

# ============================================
# REQUIRED - Database
# ============================================

DATABASE_URL=postgresql://growth_forge_user:your-password@localhost:5432/growth_forge

# ============================================
# REQUIRED - Redis (Optional - for caching)
# ============================================

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ============================================
# REQUIRED - AWS S3 (Optional - for file uploads)
# ============================================

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=growth-forge-uploads

# Optional CDN URL
CDN_URL=https://cdn.yourdomain.com

# ============================================
# REQUIRED - AI Service
# ============================================

LOVABLE_API_KEY=your-lovable-api-key

# ============================================
# REQUIRED - Application
# ============================================

NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-api-domain.com

# ============================================
# OPTIONAL - Email (for future features)
# ============================================

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 3.2 Generate Secure Secrets
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate Refresh Token secret
openssl rand -base64 32
```

### 3.3 Update Frontend Environment
Create `frontend/.env` (or add to Lovable project settings):
```env
VITE_API_URL=https://your-api-domain.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Step 4: Testing

### 4.1 Unit Tests
```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- auth.test.ts

# Run with coverage
npm test -- --coverage
```

### 4.2 Integration Tests
```bash
# Ensure database is running
# Ensure Redis is running (if using)

# Run integration tests
npm run test:integration
```

### 4.3 Manual API Testing
```bash
# Start development server
npm run dev

# Test endpoints with curl or Postman
# Health check
curl http://localhost:3000/health

# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123","fullName":"Test User"}'
```

---

## Step 5: Deployment Options

### Option A: Docker Deployment (Recommended)

#### 5.1 Build Docker Images
```bash
# Build backend image
cd backend
docker build -t growth-forge-backend:latest .

# Build frontend (if separate)
cd ../frontend
docker build -t growth-forge-frontend:latest .
```

#### 5.2 Update docker-compose.prod.yml
```yaml
version: '3.8'

services:
  backend:
    image: growth-forge-backend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}
      - REDIS_HOST=redis
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - LOVABLE_API_KEY=${LOVABLE_API_KEY}
    depends_on:
      - redis
      - db
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - app-network

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=growth_forge_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=growth_forge
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

#### 5.3 Deploy with Docker Compose
```bash
# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

### Option B: Traditional Server Deployment

#### 5.1 Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server
```

#### 5.2 Deploy Application
```bash
# Clone repository
git clone https://github.com/your-org/growth-forge-ai-44.git
cd growth-forge-ai-44/backend

# Install dependencies
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start src/server.js --name growth-forge-api

# Setup PM2 to start on boot
pm2 startup
pm2 save

# View logs
pm2 logs growth-forge-api

# Restart application
pm2 restart growth-forge-api
```

#### 5.3 Configure Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable Nginx
sudo ln -s /etc/nginx/sites-available/growth-forge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option C: Cloud Platform Deployment

#### AWS Elastic Beanstalk
1. Create EB application
2. Configure environment variables in EB console
3. Deploy using EB CLI or GitHub Actions

#### Heroku
```bash
# Create Procfile
echo "web: node src/server.js" > Procfile

# Create app
heroku create growth-forge-api

# Set config vars
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set DATABASE_URL=$(heroku pg:credentials:url DATABASE)
heroku config:set LOVABLE_API_KEY=your-api-key

# Deploy
git push heroku main
```

#### Vercel (Frontend + Serverless Functions)
1. Connect GitHub repository
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push

---

## Step 6: Post-Deployment Verification

### 6.1 Health Check
```bash
curl https://api.yourdomain.com/health
# Expected response: {"status":"ok","timestamp":"..."}
```

### 6.2 API Documentation
Access Swagger UI: `https://api.yourdomain.com/api-docs`

### 6.3 Test Critical Endpoints
```bash
# Register
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123","fullName":"Test User"}'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ss123"}'

# Refresh Token
curl -X POST https://api.yourdomain.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token"}'
```

### 6.4 Monitor Logs
```bash
# Docker
docker-compose logs -f backend

# PM2
pm2 logs growth-forge-api
```

---

## Rollback Plan

### If Issues Occur:

#### Docker Deployment
```bash
# View previous versions
docker-compose -f docker-compose.prod.yml ps

# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

#### Traditional Deployment
```bash
# Git checkout previous version
git checkout main
git pull origin main
npm install --production
pm2 restart growth-forge-api
```

#### Database Rollback
```bash
# Create rollback migration
psql -d growth_forge -c "DROP TABLE IF EXISTS refresh_tokens;"
psql -d growth_forge -c "DROP TABLE IF EXISTS audit_logs;"
```

---

## Monitoring & Maintenance

### 6.1 Set Up Monitoring
- **PM2 Plus**: `pm2 plus`
- **New Relic**: Install Node.js agent
- **Datadog**: Install Node.js tracing

### 6.2 Set Up Alerts
- Uptime monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)
- Performance monitoring (New Relic, Datadog)

### 6.3 Regular Maintenance
```bash
# Weekly: Clean up expired refresh tokens
psql -d growth_forge -c "SELECT cleanup_expired_refresh_tokens();"

# Monthly: Clean old audit logs (retention 90 days)
psql -d growth_forge -c "SELECT cleanup_old_audit_logs(90);"

# Daily: Check disk space
df -h
```

---

## Checklist

- [ ] Database created and migrations applied
- [ ] Environment variables configured
- [ ] All tests passing
- [ ] Build successful
- [ ] Docker images built (if using Docker)
- [ ] Server provisioned (if using traditional deployment)
- [ ] Domain configured and SSL certificate installed
- [ ] Nginx/reverse proxy configured
- [ ] Health check endpoint verified
- [ ] API documentation accessible
- [ ] Critical endpoints tested
- [ ] Logs monitored
- [ ] Backups configured
- [ ] Rollback plan documented

---

## Support

For issues during deployment:
1. Check application logs: `pm2 logs` or `docker-compose logs`
2. Verify environment variables are set correctly
3. Ensure database connections are working
4. Check disk space and memory usage
