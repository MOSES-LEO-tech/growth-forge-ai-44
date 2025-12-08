import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const generateToken = (userId: number, role: string) => {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '24h' });
};

export const register = async (req: Request, res: Response) => {
    const { email, password, fullName, role, schoolId } = req.body;

    try {
        // Validate role
        const validRoles = ['student', 'parent', 'teacher', 'admin', 'school_admin'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password, full_name, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, hashedPassword, fullName, role || 'student', schoolId || null]
        );

        const token = generateToken(newUser.rows[0].id, newUser.rows[0].role);

        res.status(201).json({
            token,
            user: {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                fullName: newUser.rows[0].full_name,
                role: newUser.rows[0].role,
                schoolId: newUser.rows[0].school_id,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user.rows[0].id, user.rows[0].role);

        res.json({
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                fullName: user.rows[0].full_name,
                role: user.rows[0].role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!verifyRes.ok) return res.status(401).json({ message: 'Invalid Google token' });
        const payload = await verifyRes.json() as any;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (clientId && payload.aud !== clientId) {
            return res.status(401).json({ message: 'Token audience mismatch' });
        }

        const email = payload.email;
        const googleId = payload.sub;
        const fullName = payload.name || payload.given_name || '';
        const avatarUrl = payload.picture || null;

        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            const newUser = await pool.query(
                'INSERT INTO users (email, google_id, full_name, avatar_url, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [email, googleId, fullName, avatarUrl, 'student']
            );
            user = newUser;
        } else {
            const updatedUser = await pool.query(
                'UPDATE users SET google_id = COALESCE(google_id, $1), avatar_url = COALESCE($2, avatar_url) WHERE email = $3 RETURNING *',
                [googleId, avatarUrl, email]
            );
            user = updatedUser;
        }

        const token = generateToken(user.rows[0].id, user.rows[0].role);

        res.json({
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                fullName: user.rows[0].full_name,
                role: user.rows[0].role,
                avatarUrl: user.rows[0].avatar_url
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await pool.query('SELECT id, email, full_name, role, avatar_url FROM users WHERE id = $1', [userId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { fullName, avatarUrl } = req.body;

        const updatedUser = await pool.query(
            'UPDATE users SET full_name = $1, avatar_url = $2 WHERE id = $3 RETURNING id, email, full_name, role, avatar_url',
            [fullName, avatarUrl, userId]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
