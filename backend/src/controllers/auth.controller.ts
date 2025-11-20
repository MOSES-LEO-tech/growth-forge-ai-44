import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const generateToken = (userId: number, role: string) => {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '24h' });
};

export const register = async (req: Request, res: Response) => {
    const { email, password, fullName, role } = req.body;

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, hashedPassword, fullName, role || 'student']
        );

        const token = generateToken(newUser.rows[0].id, newUser.rows[0].role);

        res.status(201).json({
            token,
            user: {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                fullName: newUser.rows[0].full_name,
                role: newUser.rows[0].role,
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
    const { email, googleId, fullName, avatarUrl } = req.body;

    try {
        let user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            // Create new user
            const newUser = await pool.query(
                'INSERT INTO users (email, google_id, full_name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
                [email, googleId, fullName, avatarUrl]
            );
            user = newUser;
        } else {
            // Update existing user with google_id if not present
            if (!user.rows[0].google_id) {
                const updatedUser = await pool.query(
                    'UPDATE users SET google_id = $1, avatar_url = $2 WHERE email = $3 RETURNING *',
                    [googleId, avatarUrl, email]
                );
                user = updatedUser;
            }
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
