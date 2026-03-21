import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db';
import { User } from '../../types';
import { authLimiter } from '../middleware/security';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'melodia-secret-key-change-in-prod';

// Validation Schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email().optional(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Register
router.post('/register', authLimiter, async (req, res) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: (validation.error as any).errors });
    return;
  }

  const { username, email, password } = validation.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password, country, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(userId, username, email || null, hashedPassword, 'United States', now);

    const token = jwt.sign({ id: userId, username, isSuperAdmin: false }, JWT_SECRET, { expiresIn: '7d' });

    // Set Cookie
    res.cookie('melodia_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const user: User = {
      id: userId,
      username,
      email,
      country: 'United States',
      isLoggedIn: true,
      isSuperAdmin: false,
      lastUsernameUpdate: 0
    };

    res.json({ user });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const { username, password } = validation.data;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    const userRow = stmt.get(username, username) as any;

    if (!userRow) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, userRow.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: userRow.id, username: userRow.username, isSuperAdmin: !!userRow.is_super_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set Cookie
    res.cookie('melodia_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      country: userRow.country,
      isLoggedIn: true,
      isSuperAdmin: !!userRow.is_super_admin,
      lastUsernameUpdate: userRow.last_username_update
    };

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Session
router.get('/session', (req, res) => {
  const token = req.cookies.melodia_token;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const userRow = stmt.get(decoded.id) as any;

    if (!userRow) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      country: userRow.country,
      isLoggedIn: true,
      isSuperAdmin: !!userRow.is_super_admin,
      lastUsernameUpdate: userRow.last_username_update
    };

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('melodia_token');
  res.json({ success: true });
});

export default router;
