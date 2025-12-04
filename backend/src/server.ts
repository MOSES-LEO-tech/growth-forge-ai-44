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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
    } catch (err) {
        console.error('Failed to connect to database:', err);
    }
});
