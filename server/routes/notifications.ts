
import express from 'express';
import db from '../db';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Get User Notifications
router.get('/', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC').all(user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as Read
router.post('/:id/read', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Notification (Admin)
router.post('/create', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { userId, title, message, type } = req.body;
  
  try {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, title, message, type || 'info', Date.now());
    res.json({ success: true, id });
  } catch (error) {
    console.error('Failed to create notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
