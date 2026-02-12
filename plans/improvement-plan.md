# Growth Forge AI - Improvement Plan

## Overview
This document outlines the comprehensive plan to fix critical security issues and implement recommended improvements for the Growth Forge AI platform.

---

## Phase 1: Critical Security Fixes (Priority 0)

### 1.1 JWT Secret Configuration
**Files**: [`backend/src/middleware/auth.middleware.ts`](backend/src/middleware/auth.middleware.ts), [`backend/src/controllers/auth.controller.ts`](backend/src/controllers/auth.controller.ts)

**Current Code (INSECURE)**:
```typescript
// auth.middleware.ts:4
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// auth.controller.ts:7
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
```

**New Code (SECURE)**:
```typescript
// auth.middleware.ts:4
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}

// auth.controller.ts:7
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
```

**Implementation Steps**:
- [ ] Replace line 4 in auth.middleware.ts with secure validation
- [ ] Replace line 7 in auth.controller.ts with secure validation
- [ ] Add `.env` example: `JWT_SECRET=your-super-secure-secret-min-32-chars`
- [ ] Update README with required environment variables

---

### 1.2 Password Strength Validation
**File**: [`backend/src/controllers/auth.controller.ts`](backend/src/controllers/auth.controller.ts)

**Add after imports (line 5)**:
```typescript
import { z } from 'zod';

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

**Update register() function (around line 14)**:
Add after email validation:
```typescript
const passwordValidation = passwordSchema.safeParse(password);
if (!passwordValidation.success) {
    return ApiResponse.error(res, passwordValidation.error.errors[0].message, 400);
}
```

**Implementation Steps**:
- [ ] Add `import { z } from 'zod';` to auth.controller.ts imports
- [ ] Define `passwordSchema` constant after imports
- [ ] Add password validation in `register()` function
- [ ] Add unit tests in `__tests__/auth.test.ts` for password validation

---

### 1.3 Rate Limiting
**File**: [`backend/src/server.ts`](backend/src/server.ts)

**Install Dependency**:
```bash
cd backend && npm install express-rate-limit
```

**Add after other imports (around line 3)**:
```typescript
import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window per IP
    message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
});

// General API rate limiter for all other endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
```

**Apply to routes (around line 44)**:
```typescript
// Apply auth limiter to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// Apply general limiter to all other API routes
app.use('/api/', apiLimiter);
```

**Implementation Steps**:
- [ ] Run `npm install express-rate-limit` in backend directory
- [ ] Add imports and limiter configurations in server.ts
- [ ] Apply authLimiter to /api/auth/* routes
- [ ] Apply apiLimiter to all other /api/* routes
- [ ] Test rate limiting works correctly

---

### 1.4 Input Sanitization
**File**: Create [`backend/src/middleware/sanitization.middleware.ts`](backend/src/middleware/sanitization.middleware.ts)

**Create new file**:
```typescript
import { Request, Response, NextFunction } from 'express';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    const sanitizeString = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = sanitizeString(obj[key]);
            }
        }
        return obj;
    };
    
    if (req.body) {
        req.body = sanitizeString(req.body);
    }
    if (req.query) {
        req.query = sanitizeString(req.query);
    }
    
    next();
};
```

**Update server.ts**:
```typescript
import { sanitizeInput } from './middleware/sanitization.middleware';

// Apply sanitization to all routes (after cors and json)
app.use(sanitizeInput);
```

**Implementation Steps**:
- [ ] Create `backend/src/middleware/sanitization.middleware.ts`
- [ ] Add import in server.ts
- [ ] Apply middleware in server.ts before routes
- [ ] Test that XSS attempts are sanitized

---

## Phase 2: AI Service Improvements (Priority 1)

### 2.1 Real Scholarship Matching Algorithm
**File**: [`backend/src/services/ai-chat.service.ts`](backend/src/services/ai-chat.service.ts)

**Current Mock Implementation (lines 237-247)**:
```typescript
async function matchScholarshipsForStudent(userId: number, limit: number): Promise<ScholarshipMatch[]> {
    const res = await pool.query(
        `SELECT title, description FROM scholarships ORDER BY created_at DESC LIMIT $1`,
        [limit]
    );
    return res.rows.map((row: any) => ({
        title: row.title,
        score: 0.8,  // FAKE - always 80%
        explanations: ['Profile alignment', 'Recent achievements match keywords'],
    }));
}
```

**New Real Implementation**:
```typescript
interface StudentProfile {
    gpa?: number;
    intended_course?: string;
    grade?: string;
    achievements: string[];
    skills: string[];
}

interface Scholarship {
    id: number;
    title: string;
    min_gpa?: number;
    eligible_courses?: string[];
    requirements?: string[];
    amount: number;
    deadline: Date;
}

interface ScholarshipMatch {
    scholarshipId: number;
    title: string;
    score: number; // 0-100
    matchedCriteria: string[];
    missingCriteria: string[];
}

function calculateScholarshipMatch(
    profile: StudentProfile,
    scholarship: Scholarship
): ScholarshipMatch {
    let score = 0;
    const matched: string[] = [];
    const missing: string[] = [];
    
    // GPA matching (weighted 30%)
    if (profile.gpa && scholarship.min_gpa) {
        if (profile.gpa >= scholarship.min_gpa) {
            score += 30;
            matched.push(`GPA ${profile.gpa} meets requirement of ${scholarship.min_gpa}`);
        } else {
            missing.push(`GPA ${profile.gpa} below required ${scholarship.min_gpa}`);
        }
    } else if (!scholarship.min_gpa) {
        score += 30; // No GPA requirement
        matched.push('No GPA requirement');
    }
    
    // Course matching (weighted 25%)
    if (profile.intended_course && scholarship.eligible_courses) {
        if (scholarship.eligible_courses.some(c => 
            c.toLowerCase().includes(profile.intended_course!.toLowerCase()))) {
            score += 25;
            matched.push(`Course ${profile.intended_course} is eligible`);
        } else {
            missing.push(`Course ${profile.intended_course} may not be eligible`);
        }
    } else if (!scholarship.eligible_courses) {
        score += 25; // Open to all courses
        matched.push('Open to all courses');
    }
    
    // Achievement keyword matching (weighted 25%)
    const achievementText = profile.achievements.join(' ').toLowerCase();
    if (scholarship.requirements) {
        const matchedKeywords = scholarship.requirements.filter(req => 
            achievementText.includes(req.toLowerCase()));
        const keywordScore = Math.min(25, matchedKeywords.length * 8);
        score += keywordScore;
        if (matchedKeywords.length > 0) {
            matched.push(`Meets ${matchedKeywords.length} requirement(s): ${matchedKeywords.join(', ')}`);
        }
    }
    
    // Deadline proximity (weighted 20%)
    const daysUntilDeadline = Math.ceil(
        (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline > 0) {
        if (daysUntilDeadline <= 7) {
            score += 20; // Urgent - apply now!
            matched.push(`Deadline approaching: ${daysUntilDeadline} days left`);
        } else if (daysUntilDeadline <= 30) {
            score += 15;
            matched.push(`Deadline in ${daysUntilDeadline} days`);
        } else {
            score += 10;
            matched.push(`Deadline: ${daysUntilDeadline} days remaining`);
        }
    } else {
        missing.push('Scholarship deadline has passed');
    }
    
    return {
        scholarshipId: scholarship.id,
        title: scholarship.title,
        score: Math.min(100, score),
        matchedCriteria: matched,
        missingCriteria: missing,
    };
}

async function matchScholarshipsForStudent(userId: number, limit: number): Promise<ScholarshipMatch[]> {
    // Get student profile
    const profileRes = await pool.query(
        `SELECT intended_course, grade FROM profiles WHERE user_id = $1`,
        [userId]
    );
    const profile = profileRes.rows[0] || {};
    
    const achievementsRes = await pool.query(
        `SELECT title, description FROM achievements WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId]
    );
    
    const projectsRes = await pool.query(
        `SELECT skills FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
        [userId]
    );
    
    const studentProfile: StudentProfile = {
        intended_course: profile.intended_course,
        grade: profile.grade,
        achievements: achievementsRes.rows.map(a => `${a.title} ${a.description}`),
        skills: projectsRes.rows.flatMap(p => p.skills || []),
    };
    
    // Get all scholarships
    const scholarshipsRes = await pool.query(
        `SELECT * FROM scholarships WHERE deleted_at IS NULL ORDER BY deadline ASC`
    );
    
    // Calculate matches
    const matches = scholarshipsRes.rows.map(scholarship => 
        calculateScholarshipMatch(studentProfile, scholarship as Scholarship)
    );
    
    // Sort by score and return top matches
    return matches
        .filter(m => m.score > 0) // Only return relevant matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
```

**Implementation Steps**:
- [ ] Add StudentProfile, Scholarship, ScholarshipMatch interfaces
- [ ] Implement calculateScholarshipMatch() function
- [ ] Rewrite matchScholarshipsForStudent() to use real algorithm
- [ ] Add tests for matching logic with various profiles
- [ ] Update AI chat to show matched/missing criteria

---

### 2.2 Enhanced AI Chat Context
**File**: [`backend/src/services/ai-chat.service.ts`](backend/src/services/ai-chat.service.ts)

**Enhancements to getStudentContext()**:
- [ ] Add student level/points to context
- [ ] Include recent activity (last 10 actions)
- [ ] Add school information to context
- [ ] Include parent/teacher feedback summaries

---

## Phase 3: TypeScript Type Safety (Priority 1)

### 3.1 Define Proper Interfaces
**File**: Create [`backend/src/types/index.ts`](backend/src/types/index.ts)

**Create new file**:
```typescript
import { Request } from 'express';

// User Types
export type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'school_admin';

export interface User {
    id: number;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    school_id: number | null;
    bio: string | null;
    grade: string | null;
    google_id: string | null;
    password?: string;
    created_at: Date;
    updated_at: Date;
}

export interface AuthUser {
    id: number;
    role: UserRole;
    school_id?: number;
    email?: string;
}

// Request Types
export interface AuthRequest extends Request {
    user?: AuthUser;
}

// Project Types
export type ProjectStatus = 'pending' | 'ongoing' | 'complete';
export type ProjectVisibility = 'private' | 'public';

export interface Project {
    id: number;
    owner_id: number;
    title: string;
    description: string | null;
    start_date: Date;
    end_date: Date | null;
    status: ProjectStatus;
    skills: string[] | null;
    verified: boolean;
    verified_by: number | null;
    visibility: ProjectVisibility;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// Achievement Types
export interface Achievement {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    date_earned: Date | null;
    verified: boolean;
    verified_by: number | null;
    verified_at: Date | null;
    certificate_url: string | null;
    created_at: Date;
    deleted_at: Date | null;
}

// Scholarship Types
export interface Scholarship {
    id: number;
    title: string;
    description: string | null;
    organization: string | null;
    amount: number | null;
    deadline: Date | null;
    application_url: string | null;
    requirements: Record<string, any> | null;
    eligibility_criteria: Record<string, any> | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
```

**Implementation Steps**:
- [ ] Create `backend/src/types/index.ts` with all domain interfaces
- [ ] Update `backend/src/middleware/auth.middleware.ts`:
  ```typescript
  import { AuthRequest, AuthUser } from '../types';
  export interface AuthRequest extends Request {
      user?: AuthUser;
  }
  ```
- [ ] Replace all `any` types in controllers with proper types
- [ ] Remove all `@ts-ignore` directives
- [ ] Run TypeScript compiler and fix remaining errors

---

## Phase 4: Production Readiness (Priority 1)

### 4.1 API Documentation with Swagger
**File**: [`backend/src/server.ts`](backend/src/server.ts)

**Install Dependencies**:
```bash
cd backend && npm install swagger-jsdoc swagger-ui-express
```

**Add in server.ts**:
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Growth Forge AI API',
            version: '1.0.0',
            description: 'API for student portfolio and scholarship matching platform in Africa',
            contact: {
                name: 'API Support',
                email: 'support@growthforge.ai',
            },
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token in format: Bearer <token>',
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Growth Forge AI API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
```

**Add JSDoc to route files**:
Example for auth.routes.ts:
```typescript
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, parent, teacher, admin]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', register);
```

**Implementation Steps**:
- [ ] Install swagger dependencies
- [ ] Add swagger configuration in server.ts
- [ ] Add JSDoc comments to all route files
- [ ] Document all endpoints with parameters, responses, auth requirements
- [ ] Test documentation at /api-docs

---

### 4.2 Redis Caching Layer
**File**: Create [`backend/src/config/cache.ts`](backend/src/config/cache.ts)

**Install Dependency**:
```bash
cd backend && npm install ioredis
```

**Create cache configuration**:
```typescript
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

export default redis;

// Cache helper functions
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

export async function setCache(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
        console.error('Cache set error:', error);
    }
}

export async function invalidateCache(pattern: string): Promise<void> {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}

// Cache keys generator
export const CacheKeys = {
    user: (id: number) => `user:${id}`,
    projects: (userId: number) => `projects:${userId}`,
    project: (id: number) => `project:${id}`,
    scholarships: () => 'scholarships:all',
    recommendations: (userId: number) => `recommendations:${userId}`,
    gallery: (userId: number) => `gallery:${userId}`,
};
```

**Update docker-compose.yml**:
```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  redis_data:
```

**Implementation Steps**:
- [ ] Install ioredis package
- [ ] Create cache configuration file
- [ ] Update docker-compose.yml with Redis service
- [ ] Add caching to frequently accessed endpoints (getProjects, getScholarships)
- [ ] Add cache invalidation on create/update/delete operations
- [ ] Update server.ts to wait for Redis connection

---

### 4.3 Cloud Storage Migration (S3)
**File**: [`backend/src/controllers/upload.controller.ts`](backend/src/controllers/upload.controller.ts)

**Install Dependencies**:
```bash
cd backend && npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Create S3 service**:
```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
const CDN_URL = process.env.CDN_URL; // Optional CDN front

export async function uploadToS3(
    fileBuffer: Buffer,
    key: string,
    contentType: string
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Cache control for better performance
        CacheControl: 'max-age=31536000',
    });
    
    await s3Client.send(command);
    
    if (CDN_URL) {
        return `${CDN_URL}/${key}`;
    }
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    await s3Client.send(command);
}

export async function generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}
```

**Update .env.example**:
```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=growth-forge-uploads
CDN_URL=https://cdn.growthforge.ai  # Optional
```

**Implementation Steps**:
- [ ] Install AWS SDK packages
- [ ] Create S3 upload service
- [ ] Update upload controller to use S3
- [ ] Add S3 configuration to .env.example
- [ ] Create migration script to move existing uploads to S3
- [ ] Update docker-compose.prod.yml with AWS credentials
- [ ] Set up S3 bucket with proper CORS and policies

---

## Phase 5: Authentication Enhancements (Priority 2)

### 5.1 Refresh Token Implementation
**File**: [`backend/src/controllers/auth.controller.ts`](backend/src/controllers/auth.controller.ts)

**Database Migration**:
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Add to auth.controller.ts**:
```typescript
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateRefreshToken(userId: number): string {
    return jwt.sign(
        { id: userId, type: 'refresh' },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
}

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token required', 400);
    }
    
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as any;
        
        // Check if token exists in database
        const tokenRecord = await pool.query(
            'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2',
            [refreshToken, decoded.id]
        );
        
        if (tokenRecord.rows.length === 0) {
            return ApiResponse.error(res, 'Invalid refresh token', 401);
        }
        
        // Check if token is expired
        if (new Date(tokenRecord.rows[0].expires_at) < new Date()) {
            await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.rows[0].id]);
            return ApiResponse.error(res, 'Refresh token expired', 401);
        }
        
        // Get user info
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (user.rows.length === 0) {
            return ApiResponse.error(res, 'User not found', 404);
        }
        
        // Delete used token (rotation)
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.rows[0].id]);
        
        // Generate new tokens
        const newAccessToken = generateToken(decoded.id, user.rows[0].role);
        const newRefreshToken = generateRefreshToken(decoded.id);
        
        // Store new refresh token
        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [decoded.id, newRefreshToken, new Date(Date.now() + REFRESH_TOKEN_EXPIRY)]
        );
        
        return ApiResponse.success(res, {
            token: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                fullName: user.rows[0].full_name,
                role: user.rows[0].role,
            }
        }, 'Token refreshed');
    } catch (error) {
        return ApiResponse.error(res, 'Invalid refresh token', 401);
    }
};

export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    
    return ApiResponse.success(res, null, 'Logged out successfully');
};
```

**Update auth.routes.ts**:
```typescript
router.post('/refresh', refreshToken);
router.post('/logout', logout);
```

**Implementation Steps**:
- [ ] Create refresh_tokens table migration
- [ ] Add REFRESH_TOKEN_SECRET to environment
- [ ] Implement refreshToken endpoint
- [ ] Implement logout endpoint
- [ ] Update login to return both access and refresh tokens
- [ ] Add cleanup job for expired refresh tokens

---

## Phase 6: Quality & Monitoring (Priority 2)

### 6.1 Audit Logging
**File**: Create [`backend/src/middleware/audit.middleware.ts`](backend/src/middleware/audit.middleware.ts)

**Database Migration**:
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
```

**Create audit middleware**:
```typescript
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

export type AuditAction = 
    | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
    | 'LOGIN' | 'LOGOUT' | 'REGISTER'
    | 'UPLOAD' | 'DOWNLOAD'
    | 'VERIFY' | 'UNVERIFY';

export const auditLog = (
    action: AuditAction,
    resourceType: string
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        
        res.send = function(body) {
            // Log successful operations only
            if (res.statusCode >= 200 && res.statusCode < 300) {
                logAudit(req, action, resourceType, body).catch(console.error);
            }
            return originalSend.call(this, body);
        };
        
        next();
    };
};

async function logAudit(
    req: Request,
    action: AuditAction,
    resourceType: string,
    body: any
) {
    // @ts-ignore
    const userId = req.user?.id;
    const resourceId = extractResourceId(req);
    
    await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            userId,
            action,
            resourceType,
            resourceId,
            JSON.stringify(req.body), // Be careful with sensitive data
            body,
            req.ip || req.socket.remoteAddress,
            req.get('user-agent'),
        ]
    );
}

function extractResourceId(req: Request): number | null {
    const idParam = req.params.id || req.params.projectId || req.params.eventId;
    return idParam ? parseInt(idParam) : null;
}

// Middleware to exclude sensitive fields from audit
export const sanitizeAuditData = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        const { password, refreshToken, ...safeBody } = req.body;
        (req as any).sanitizedBody = safeBody;
    }
    next();
};
```

**Implementation Steps**:
- [ ] Create audit_logs table migration
- [ ] Create audit middleware
- [ ] Add audit logging to all CRUD endpoints (using middleware)
- [ ] Create audit log viewing endpoint (admin only)
- [ ] Add audit log retention policy (e.g., keep 90 days)
- [ ] Add sanitization to exclude passwords from logs

---

### 6.2 Enhanced Test Coverage
**File**: `backend/__tests__/`

**Current Coverage**: Auth, RBAC, validation tests exist

**Required New Tests**:
```typescript
// __tests__/password-validation.test.ts
describe('Password Validation', () => {
    it('should reject passwords less than 8 characters', () => {
        // test
    });
    it('should reject passwords without uppercase', () => {
        // test
    });
    it('should accept valid passwords', () => {
        // test
    });
});

// __tests__/scholarship-matching.test.ts
describe('Scholarship Matching', () => {
    it('should match scholarships based on GPA', () => {
        // test
    });
    it('should match scholarships based on course', () => {
        // test
    });
    it('should calculate accurate scores', () => {
        // test
    });
});

// __tests__/rate-limiting.test.ts
describe('Rate Limiting', () => {
    it('should block after max requests', () => {
        // test
    });
    it('should reset after window expires', () => {
        // test
    });
});
```

**Implementation Steps**:
- [ ] Add password validation unit tests
- [ ] Add scholarship matching algorithm tests
- [ ] Add rate limiting integration tests
- [ ] Add API endpoint integration tests
- [ ] Add E2E tests with Playwright for critical user flows
- [ ] Achieve 80% test coverage

---

## Implementation Order

```mermaid
gantt
    title Implementation Timeline
    dateFormat YYYY-MM-DD
    section Phase 1: Security
    JWT Secret Fix      :active, sec1, 2026-02-03, 1d
    Password Validation :active, sec2, 2026-02-04, 2d
    Rate Limiting       :active, sec3, 2026-02-05, 2d
    Input Sanitization  :sec4, 2026-02-06, 1d
    section Phase 2: AI
    Scholarship Matching:crit, ai1, 2026-02-07, 5d
    Enhanced Context    :ai2, 2026-02-12, 3d
    section Phase 3: Quality
    TypeScript Types    :qual1, 2026-02-06, 4d
    section Phase 4: Production
    Swagger Docs        :prod1, 2026-02-15, 3d
    Redis Caching       :prod2, 2026-02-18, 4d
    S3 Storage          :prod3, 2026-02-22, 4d
    section Phase 5: Auth
    Refresh Tokens      :auth1, 2026-02-10, 3d
    section Phase 6: Monitoring
    Audit Logging       :mon1, 2026-02-26, 3d
    Test Coverage       :mon2, 2026-03-01, 5d
```

---

## Dependencies to Install

```json
{
    "express-rate-limit": "^7.1.5",
    "ioredis": "^5.3.2",
    "@aws-sdk/client-s3": "^3.490.0",
    "@aws-sdk/s3-request-presigner": "^3.490.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "zod": "^3.22.4"
}
```

**Install all at once**:
```bash
cd backend && npm install express-rate-limit ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner swagger-jsdoc swagger-ui-express zod
```

---

## Environment Variables Required

```env
# Security (REQUIRED)
JWT_SECRET=your-jwt-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret-key-min-32-chars

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/growth_forge

# Redis (for caching and rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# AWS S3 (for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=growth-forge-uploads
CDN_URL=https://cdn.growthforge.ai  # Optional

# AI Service
LOVABLE_API_KEY=your-lovable-api-key

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:8080
API_URL=http://localhost:3000
```

---

## Success Criteria

| Phase | Completion Criteria |
|-------|---------------------|
| Phase 1 | All security scans pass (no critical/high vulnerabilities) |
| Phase 2 | Scholarship matching returns real scores with explanations |
| Phase 3 | TypeScript compilation succeeds with no errors |
| Phase 4 | API docs accessible at /api-docs, caching reduces DB load by 50% |
| Phase 5 | Refresh tokens work, logout invalidates tokens |
| Phase 6 | Test coverage > 80%, audit logs visible in admin panel |

---

## Ready to Start

To begin implementation, switch to **Code mode** and start with **Phase 1**:
1. Fix JWT Secret configuration
2. Add password validation
3. Implement rate limiting
4. Add input sanitization
