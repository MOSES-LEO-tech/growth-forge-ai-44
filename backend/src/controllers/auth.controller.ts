import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { ApiResponse } from '../utils/api.response';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const generateToken = (userId: number, role: string) => {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '24h' });
};

export const register = async (req: Request, res: Response) => {
    const { email, password, role } = req.body;
    const fullName = (req.body.fullName ?? req.body.full_name) as string | undefined;
    const schoolId = (req.body.schoolId ?? req.body.school_id) as number | null;

    try {
        // Validate role
        const validRoles = ['student', 'parent', 'teacher', 'admin', 'school_admin'];
        if (role && !validRoles.includes(role)) {
            return ApiResponse.error(res, 'Invalid role', 400);
        }

        // Basic email format validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return ApiResponse.error(res, 'Invalid email format', 400);
        }

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return ApiResponse.error(res, 'User already exists', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            'INSERT INTO users (email, password, full_name, role, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [email, hashedPassword, fullName || null, role || 'student', schoolId || null]
        );

        const token = generateToken(newUser.rows[0].id, newUser.rows[0].role);

        return ApiResponse.success(res, {
            token,
            user: {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                fullName: newUser.rows[0].full_name,
                role: newUser.rows[0].role,
                schoolId: newUser.rows[0].school_id,
            }
        }, 'User registered successfully', 201);
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return ApiResponse.error(res, 'Invalid credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return ApiResponse.error(res, 'Invalid credentials', 401);
        }

        const token = generateToken(user.rows[0].id, user.rows[0].role);

        return ApiResponse.success(res, {
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                fullName: user.rows[0].full_name,
                role: user.rows[0].role,
            }
        }, 'Login successful');
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, 'Server error', 500, error);
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

        return ApiResponse.success(res, {
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                fullName: user.rows[0].full_name,
                role: user.rows[0].role,
                avatarUrl: user.rows[0].avatar_url
            }
        }, 'Login successful');
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};

export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await pool.query('SELECT id, email, full_name, role, avatar_url FROM users WHERE id = $1', [userId]);

        if (user.rows.length === 0) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        return ApiResponse.success(res, user.rows[0], 'Profile fetched successfully');
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, 'Server error', 500, error);
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
            return ApiResponse.error(res, 'User not found', 404);
        }

        return ApiResponse.success(res, updatedUser.rows[0], 'Profile updated successfully');
    } catch (error) {
        console.error(error);
        return ApiResponse.error(res, 'Server error', 500, error);
    }
};
