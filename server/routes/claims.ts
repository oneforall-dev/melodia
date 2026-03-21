import express from 'express';
import db from '../db';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Create Claim
router.post('/api/songs/:id/claim', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const trackId = req.params.id;
  const { proof } = req.body;

  // 1. Validate Proof
  if (!proof || typeof proof !== 'string') {
      return res.status(400).json({ error: 'Proof is required' });
  }

  const cleanProof = proof.trim();
  
  // Min Length: 20 chars
  if (cleanProof.length < 20) {
      return res.status(400).json({ error: 'Proof must be at least 20 characters long.' });
  }

  // Must contain a URL (Social Media, Official Site, etc.)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  if (!urlRegex.test(cleanProof)) {
      return res.status(400).json({ error: 'Proof must contain a valid link (e.g., social media profile, official website).' });
  }

  try {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId) as any;
    if (!track) return res.status(404).json({ error: 'Track not found' });

    if (track.user_id === user.id) {
      return res.status(400).json({ error: 'You already own this track' });
    }

    const existingClaim = db.prepare('SELECT * FROM claims WHERE track_id = ? AND user_id = ? AND status = "pending"').get(trackId, user.id);
    if (existingClaim) {
      return res.status(400).json({ error: 'Pending claim already exists' });
    }

    db.prepare('INSERT INTO claims (track_id, user_id, proof_text, status, timestamp) VALUES (?, ?, ?, "pending", ?)').run(trackId, user.id, cleanProof, Date.now());

    // Notify Super Admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' OR is_super_admin = 1").all() as any[];
    admins.forEach(admin => {
      const notifId = `notif_claim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, admin.id, 'New Ownership Claim', `User ${user.username} has claimed ownership of "${track.title}".`, 'info', Date.now());
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Claim Error:', e);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// Get Claims (Admin)
router.get('/api/admin/claims', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

  try {
    const claims = db.prepare(`
      SELECT c.*, t.title as song_title, t.artist as song_artist, u.username as claimant_name, u.email as claimant_email
      FROM claims c
      JOIN tracks t ON c.track_id = t.id
      JOIN users u ON c.user_id = u.id
      WHERE c.status = 'pending'
      ORDER BY c.timestamp DESC
    `).all();
    res.json(claims);
  } catch (e) {
    console.error('Get Claims Error:', e);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// Approve/Reject Claim (Admin)
router.post('/api/admin/claims/:id/:action', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

  const claimId = req.params.id as string;
  const action = req.params.action as string; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId) as any;
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    if (action === 'approve') {
      // Get track info before update
      const track = db.prepare('SELECT title FROM tracks WHERE id = ?').get(claim.track_id) as any;
      const originalUploaderId = db.prepare('SELECT user_id FROM tracks WHERE id = ?').get(claim.track_id) as any;

      // Update Track Owner
      db.prepare('UPDATE tracks SET user_id = ? WHERE id = ?').run(claim.user_id, claim.track_id);
      // Update Claim Status
      db.prepare('UPDATE claims SET status = "approved" WHERE id = ?').run(claimId);
      // Reject other pending claims for this track
      db.prepare('UPDATE claims SET status = "rejected" WHERE track_id = ? AND id != ? AND status = "pending"').run(claim.track_id, claimId);

      // Notify Claimant
      const notifId1 = `notif_claim_app_${Date.now()}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId1, claim.user_id, 'Claim Approved', `Your claim for "${track?.title || 'a track'}" has been approved!`, 'success', Date.now());

      // Notify Original Uploader
      if (originalUploaderId && originalUploaderId.user_id !== claim.user_id) {
        const notifId2 = `notif_claim_trans_${Date.now()}`;
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(notifId2, originalUploaderId.user_id, 'Track Transferred', `Ownership of your track "${track?.title || 'a track'}" has been transferred to another user following a successful claim.`, 'warning', Date.now());
      }

    } else {
      db.prepare('UPDATE claims SET status = "rejected" WHERE id = ?').run(claimId);

      // Notify Claimant
      const track = db.prepare('SELECT title FROM tracks WHERE id = ?').get(claim.track_id) as any;
      const notifId = `notif_claim_rej_${Date.now()}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(notifId, claim.user_id, 'Claim Rejected', `Your claim for "${track?.title || 'a track'}" has been rejected.`, 'error', Date.now());
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Process Claim Error:', e);
    res.status(500).json({ error: 'Failed to process claim' });
  }
});

export default router;
