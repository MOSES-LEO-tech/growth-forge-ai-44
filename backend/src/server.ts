import express, { Request } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { pool } from './config/database';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';
import projectRoutes from './routes/project.routes';
import achievementsRoutes from './routes/achievements.routes';
import galleryRoutes from './routes/gallery.routes';
import recommendationsRoutes from './routes/recommendations.routes';
import profileRoutes from './routes/profile.routes';
import settingsRoutes from './routes/settings.routes';
import personalGalleryRoutes from './routes/personal-gallery.routes';
import schoolGalleryRoutes from './routes/school-gallery.routes';
import schoolsRoutes from './routes/schools.routes';
import teacherRoutes from './routes/teacher.routes';
import schoolAdminRoutes from './routes/school-admin.routes';
import { sanitizeInput } from './middleware/sanitization.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// IP key generator wrapper for rate limiter (handles IPv4/IPv6 properly)
const ipKeyGeneratorWrapper = (req: Request): string => {
    const ip = req.ip ||
        req.socket.remoteAddress ||
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        'unknown';
    return ipKeyGenerator(ip);
};

// Helper function to get consistent IP address (handles IPv4/IPv6)
const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
        return ips[0].trim();
    }
    return req.socket?.remoteAddress ||
        req.ip ||
        (req.connection as any).remoteAddress ||
        'unknown';
};

// Swagger Configuration
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
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
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
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string', format: 'email' },
                        fullName: { type: 'string' },
                        role: { type: 'string', enum: ['student', 'parent', 'teacher', 'admin', 'school_admin'] },
                        schoolId: { type: 'integer', nullable: true },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        token: { type: 'string' },
                        user: { type: 'object', $ref: '#/components/schemas/User' },
                        message: { type: 'string' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', default: false },
                        error: { type: 'string' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const allowedOrigins = new Set<string>([
    process.env.FRONTEND_URL || 'http://localhost:8080',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://localhost:3000'
]);

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window per IP
    message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGeneratorWrapper,
    skipFailedRequests: false,
});

// General API rate limiter for all other endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: ipKeyGeneratorWrapper,
    skipFailedRequests: false,
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Apply sanitization to all routes (XSS prevention)
app.use(sanitizeInput);

// Apply auth rate limiter to authentication routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);

// Apply general rate limiter to all other API routes
app.use('/api/', apiLimiter);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route - API information
app.get('/', (req, res) => {
    res.json({
        name: 'Growth Forge AI API',
        version: '1.0.0',
        description: 'API for student portfolio and scholarship matching platform in Africa',
        documentation: '/api-docs',
        health: '/health',
        auth: '/api/auth',
        endpoints: {
            auth: {
                login: '/api/auth/login',
                register: '/api/auth/register',
                refresh: '/api/auth/refresh',
                logout: '/api/auth/logout',
                me: '/api/auth/me',
                verifyEmail: '/api/auth/verify-email',
                forgotPassword: '/api/auth/forgot-password',
                resetPassword: '/api/auth/reset-password'
            },
            dashboard: '/api/dashboard',
            projects: '/api/projects',
            gallery: '/api/gallery',
            upload: '/api/upload',
            recommendations: '/api/recommendations'
        }
    });
});

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/personal-gallery', personalGalleryRoutes);
app.use('/api/school-gallery', schoolGalleryRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/school-admin', schoolAdminRoutes);

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`API Documentation: http://localhost:${port}/api-docs`);
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
    } catch (err) {
        console.error('Failed to connect to database:', err);
    }
});

