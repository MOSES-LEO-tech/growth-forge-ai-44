import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './config/database';
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';
import projectRoutes from './routes/project.routes';
import galleryRoutes from './routes/gallery.routes';
import scholarshipRoutes from './routes/scholarship.routes';
import recommendationsRoutes from './routes/recommendations.routes';
import aiRoutes from './routes/ai.routes';
import profileRoutes from './routes/profile.routes';
import settingsRoutes from './routes/settings.routes';
import achievementsRoutes from './routes/achievements.routes';
import personalGalleryRoutes from './routes/personal-gallery.routes';
import schoolGalleryRoutes from './routes/school-gallery.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check with DB status
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/scholarship', scholarshipRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/personal-gallery', personalGalleryRoutes);
app.use('/api/school-gallery', schoolGalleryRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const connectWithRetry = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await pool.connect();
            console.log('Successfully connected to PostgreSQL database');
            return;
        } catch (err) {
            console.error(`Database connection attempt ${i + 1} failed:`, err);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    console.error('Failed to connect to database after multiple attempts. Exiting...');
    process.exit(1); // Exit with error code to let Docker restart
};

const startServer = async () => {
    await connectWithRetry();

    const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    const shutdown = async () => {
        console.log('Shutting down server...');
        server.close(() => {
            console.log('HTTP server closed');
            pool.end(() => {
                console.log('Database pool closed');
                process.exit(0);
            });
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

startServer();
