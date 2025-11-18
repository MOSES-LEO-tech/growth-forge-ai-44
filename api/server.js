const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, ensureTables } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8081';

app.use(express.json());
app.use(cookieParser());

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM sessions WHERE user_id = $1 AND token = $2', [decoded.userId, token]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      req.user = { id: decoded.userId };
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Signup
app.post('/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash]
    );
    const userId = userRows[0].id;

    await client.query('INSERT INTO profiles (id, full_name) VALUES ($1, $2)', [userId, fullName]);

    // Assign default role (student)
    const { rows: roleRows } = await client.query('SELECT id FROM roles WHERE name = $1', ['student']);
    const roleId = roleRows[0].id;
    await client.query('INSERT INTO role_assignments (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const client = await pool.connect();
  try {
    const { rows: userRows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRows[0];

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ message: 'Login successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Logout
app.post('/auth/logout', authMiddleware, async (req, res) => {
  const token = req.cookies.session;
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.clearCookie('session');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get user profile
app.get('/me', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT u.id, u.email, p.full_name, r.name as role
       FROM users u
       JOIN profiles p ON u.id = p.id
       JOIN role_assignments ra ON u.id = ra.user_id
       JOIN roles r ON ra.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

ensureTables().then(() => {
  app.listen(PORT, () => {
    console.log(`API listening on http://0.0.0.0:${PORT}`);
  });
});