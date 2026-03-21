import { Request, Response } from 'express';
import { pool } from '../config/database';

export const getStats = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const achievementsCount = await pool.query('SELECT COUNT(*) FROM achievements WHERE user_id = $1', [userId]);
        const projectsCount = await pool.query('SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND status = $2', [userId, 'ongoing']);

        // Mock data for events and growth score for now
        const stats = {
            achievements: parseInt(achievementsCount.rows[0].count),
            projects: parseInt(projectsCount.rows[0].count),
            events: 12,
            growthScore: 85
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAchievements = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const achievements = await pool.query('SELECT * FROM achievements WHERE user_id = $1 ORDER BY date_earned DESC LIMIT 5', [userId]);
        res.json(achievements.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProjects = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const projects = await pool.query('SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]);
        res.json(projects.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
