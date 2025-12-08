import { Request, Response } from 'express';
import { pool } from '../config/database';

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Fetch user details and profile
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.role, u.school_id, u.avatar_url, u.bio, u.grade,
              p.date_of_birth, p.phone, p.address, p.portfolio_visibility, p.subjects, p.intended_course, p.gpa, p.location, p.graduation_year,
              s.name as school_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update current user profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const {
            bio, grade, date_of_birth, phone, address, portfolio_visibility,
            subjects, intended_course, gpa, location, graduation_year
        } = req.body;

        // Update users table fields
        await pool.query(
            `UPDATE users SET bio = $1, grade = $2 WHERE id = $3`,
            [bio, grade, userId]
        );

        // Upsert into profiles table
        await pool.query(
            `INSERT INTO profiles (user_id, date_of_birth, phone, address, portfolio_visibility, subjects, intended_course, gpa, location, graduation_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         date_of_birth = EXCLUDED.date_of_birth,
         phone = EXCLUDED.phone,
         address = EXCLUDED.address,
         portfolio_visibility = EXCLUDED.portfolio_visibility,
         subjects = EXCLUDED.subjects,
         intended_course = EXCLUDED.intended_course,
         gpa = EXCLUDED.gpa,
         location = EXCLUDED.location,
         graduation_year = EXCLUDED.graduation_year,
         updated_at = CURRENT_TIMESTAMP`,
            [userId, date_of_birth, phone, address, portfolio_visibility, JSON.stringify(subjects), intended_course, gpa, location, graduation_year]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get public profile by ID
export const getPublicProfile = async (req: Request, res: Response) => {
    try {
        const targetUserId = parseInt(req.params.id);

        const result = await pool.query(
            `SELECT u.id, u.full_name, u.role, u.school_id, u.avatar_url, u.bio, u.grade,
              p.portfolio_visibility, p.subjects, p.intended_course, p.location, p.graduation_year,
              s.name as school_name
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
            [targetUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profile = result.rows[0];

        // Check visibility
        if (profile.portfolio_visibility === 'private') {
            return res.status(403).json({ message: 'This profile is private' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching public profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Link parent account
export const linkParent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { parentEmail, relationship } = req.body;

        // Find parent user by email
        const parentResult = await pool.query(
            `SELECT id FROM users WHERE email = $1 AND role = 'parent'`,
            [parentEmail]
        );

        if (parentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Parent account not found with this email' });
        }

        const parentId = parentResult.rows[0].id;

        // Create link request
        await pool.query(
            `INSERT INTO parent_student_links (parent_id, student_id, relationship, verified)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (parent_id, student_id) DO NOTHING`,
            [parentId, userId, relationship || 'Parent']
        );

        res.json({ message: 'Parent linked successfully' });
    } catch (error) {
        console.error('Error linking parent:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get linked children for parent
export const getChildren = async (req: Request, res: Response) => {
    try {
        const parentId = (req as any).user.id;
        const userRole = (req as any).user.role;

        if (userRole !== 'parent') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.grade, u.avatar_url, p.gpa, p.intended_course,
             (SELECT COUNT(*) FROM achievements WHERE user_id = u.id AND verified = true) as achievement_count
             FROM parent_student_links psl
             JOIN users u ON psl.student_id = u.id
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE psl.parent_id = $1`,
            [parentId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching children:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
