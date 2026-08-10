import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Validation Schemas
const updateProfileSchema = z.object({
  name: z.string().min(3).max(30),
  country: z.string()
});

const toggleAdminSchema = z.object({
  isAdmin: z.boolean()
});

const updatePasswordSchema = z.object({
  newPassword: z.string().min(6)
});

// Search Users
router.get('/search', authenticateJWT, (req, res) => {
  const requestingUser = (req as any).user;
  if (requestingUser.role !== 'admin' && !requestingUser.isSuperAdmin && !requestingUser.isOwner) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    res.json([]);
    return;
  }

  const query = `%${q.toLowerCase()}%`;
  const stmt = db.prepare('SELECT id, username, email, country, is_super_admin, is_owner FROM users WHERE lower(username) LIKE ? OR lower(email) LIKE ? LIMIT 5');
  const users = stmt.all(query, query) as any[];
  
  const mappedUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    country: u.country,
    isSuperAdmin: !!u.is_super_admin,
    isOwner: !!u.is_owner
  }));

  res.json(mappedUsers);
});

// Update Profile
router.put('/:id', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  const target = db.prepare('SELECT is_owner FROM users WHERE id = ?').get(id) as any;
  if (target?.is_owner && !user.isOwner) {
    return res.status(403).json({ error: 'The owner can only modify their own profile' });
  }

  if (user.id !== id && user.role !== 'admin' && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: (validation.error as any).errors });
    return;
  }
  const { name, country } = validation.data;

  try {
    const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let lastUpdate = dbUser.last_username_update;
    if (dbUser.username !== name) {
      lastUpdate = Date.now();
    }

    const stmt = db.prepare('UPDATE users SET username = ?, country = ?, last_username_update = ? WHERE id = ?');
    stmt.run(name, country, lastUpdate, id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      country: updatedUser.country,
      isLoggedIn: true,
      isSuperAdmin: !!updatedUser.is_super_admin,
      lastUsernameUpdate: updatedUser.last_username_update
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Toggle Admin Status
router.post('/:id/toggle-admin', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!user.isOwner) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const target = db.prepare('SELECT is_owner FROM users WHERE id = ?').get(id) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.is_owner) return res.status(400).json({ error: 'The owner cannot be demoted' });

  const validation = toggleAdminSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: (validation.error as any).errors });
    return;
  }
  const { isAdmin } = validation.data;

  try {
    const stmt = db.prepare('UPDATE users SET is_super_admin = ? WHERE id = ?');
    stmt.run(isAdmin ? 1 : 0, id);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      country: updatedUser.country,
      isLoggedIn: true,
      isSuperAdmin: !!updatedUser.is_super_admin,
      lastUsernameUpdate: updatedUser.last_username_update
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

// Update Password
router.post('/:id/password', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  const target = db.prepare('SELECT is_owner FROM users WHERE id = ?').get(id) as any;
  if (target?.is_owner && !user.isOwner) {
    return res.status(403).json({ error: 'Only the owner can change the owner password' });
  }

  if (user.id !== id && user.role !== 'admin' && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const validation = updatePasswordSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ error: (validation.error as any).errors });
    return;
  }
  const { newPassword } = validation.data;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    stmt.run(hashedPassword, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Get User Stats
router.get('/:id/stats', (req, res) => {
  const { id } = req.params;

  try {
    const totalSongs = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE user_id = ?').get(id) as any;
    
    // Total Votes Received across all tracks
    const totalVotes = db.prepare(`
        SELECT COUNT(*) as count 
        FROM votes v
        JOIN tracks t ON v.track_id = t.id
        WHERE t.user_id = ?
    `).get(id) as any;

    // Top Countries (Votes received from)
    const topCountries = db.prepare(`
        SELECT u.country, COUNT(*) as count
        FROM votes v
        JOIN tracks t ON v.track_id = t.id
        JOIN users u ON v.user_id = u.id
        WHERE t.user_id = ?
        GROUP BY u.country
        ORDER BY count DESC
        LIMIT 5
    `).all(id) as any[];

    // Top Artist (Most popular artist name uploaded by this user)
    const topArtist = db.prepare(`
        SELECT artist, COUNT(*) as count
        FROM tracks
        WHERE user_id = ?
        GROUP BY artist
        ORDER BY count DESC
        LIMIT 1
    `).get(id) as any;

    res.json({
        totalSongs: totalSongs.count,
        totalVotes: totalVotes.count,
        topCountries,
        topArtist: topArtist ? topArtist.artist : 'N/A'
    });
  } catch (e) {
    console.error('Get User Stats Error:', e);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get User Claims (Claims made by user)
router.get('/:id/claims', (req, res) => {
    const { id } = req.params;
    try {
        const claims = db.prepare(`
            SELECT c.*, t.title as song_title, t.artist as song_artist
            FROM claims c
            JOIN tracks t ON c.track_id = t.id
            WHERE c.user_id = ?
            ORDER BY c.timestamp DESC
        `).all(id);
        res.json(claims);
    } catch (e) {
        console.error('Get User Claims Error:', e);
        res.status(500).json({ error: 'Failed to get claims' });
    }
});

export default router;
