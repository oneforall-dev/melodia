
import express from 'express';
import db from '../db';
import { authenticateJWT } from '../middleware/auth';
import { SpotlightConfig, SpotlightSubmission } from '../../types';

const router = express.Router();

// Get Spotlight Config
router.get('/config', (req, res) => {
  try {
    const configRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('spotlight_config') as any;
    const config: SpotlightConfig = configRow ? JSON.parse(configRow.value) : {
      enabled: true,
      prices: { day: 1, genre_language: 1, global: 2 },
      chart_limit: 0
    };
    res.json(config);
  } catch (error) {
    console.error('Failed to get spotlight config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Spotlight Config (Admin)
router.post('/config', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { enabled, prices, chart_limit } = req.body;
  
  try {
    const config: SpotlightConfig = { enabled, prices, chart_limit: chart_limit || 0 };
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('spotlight_config', JSON.stringify(config));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update spotlight config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get User Submissions
router.get('/submissions', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  try {
    const submissions = db.prepare('SELECT * FROM spotlight_submissions WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    res.json(submissions);
  } catch (error) {
    console.error('Failed to get user submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit to Spotlight
router.post('/submit', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const { trackId, type, days, scope, targetDate } = req.body; // type: 'organic' | 'paid'

  try {
    // 1. Check Config
    const configRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('spotlight_config') as any;
    const config: SpotlightConfig = configRow ? JSON.parse(configRow.value) : { enabled: true, prices: { day: 1, genre_language: 1, global: 2 } };

    if (!config.enabled) {
      return res.status(400).json({ error: 'Spotlight submissions are currently disabled.' });
    }

    // 2. Check Daily Limit (1 per user/day, unless super admin)
    if (!user.isSuperAdmin && user.role !== 'admin') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTimestamp = todayStart.getTime();

      const dailyCount = db.prepare('SELECT COUNT(*) as count FROM spotlight_submissions WHERE user_id = ? AND created_at >= ?').get(user.id, todayTimestamp) as any;
      
      if (dailyCount.count >= 1) {
        return res.status(429).json({ error: 'You have reached your daily submission limit (1 per day).' });
      }

      // 30-day cooldown for free (organic) submissions
      if (type === 'organic') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = thirtyDaysAgo.getTime();

        const recentOrganicCount = db.prepare('SELECT COUNT(*) as count FROM spotlight_submissions WHERE user_id = ? AND type = "organic" AND created_at >= ?').get(user.id, thirtyDaysAgoTimestamp) as any;
        
        if (recentOrganicCount.count >= 1) {
          return res.status(429).json({ error: 'You can only submit one free spotlight every 30 days.' });
        }
      }

      // Check Chart Position Limit
      if (config.chart_limit && config.chart_limit > 0) {
          const userSongCountRow = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE user_id = ?').get(user.id) as any;
          const userSongCount = userSongCountRow ? userSongCountRow.count : 0;

          const userSpotlightCountRow = db.prepare("SELECT COUNT(*) as count FROM spotlight_submissions WHERE user_id = ? AND status IN ('active', 'queued')").get(user.id) as any;
          const userSpotlightCount = userSpotlightCountRow ? userSpotlightCountRow.count : 0;

          const maxAllowed = Math.floor(userSongCount / config.chart_limit);

          if (userSpotlightCount >= maxAllowed) {
              return res.status(403).json({ 
                  error: `Spotlight Limit Reached. You need ${config.chart_limit} songs on the chart for each spotlight submission. You have ${userSongCount} songs and ${userSpotlightCount} active/queued submissions.` 
              });
          }
      }
    }

    // 3. Check Track Ownership
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId) as any;
    if (!track) return res.status(404).json({ error: 'Track not found' });
    if (track.user_id !== user.id && user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    let status = 'queued';
    let bidAmount = 0;
    let queuePosition = 0;
    let estimatedWaitDays = 0;
    let finalTargetDate = targetDate;

    if (type === 'paid') {
      if (!config.prices.day || config.prices.day <= 0) {
          return res.status(400).json({ error: 'Paid spotlight submissions are currently disabled.' });
      }

      const basePrice = scope === 'global' ? config.prices.global : config.prices.genre_language;
      const pricePerDay = config.prices.day;
      
      bidAmount = (basePrice + (pricePerDay * (days || 1)));
      
      // If Super Admin, free
      if (user.isSuperAdmin) {
        bidAmount = 0;
      }

      // If no target date provided for paid, default to tomorrow
      if (!finalTargetDate) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          finalTargetDate = tomorrow.toISOString().split('T')[0];
      }

    } else {
      // Organic Logic: 1 slot per day, sequential queue
      // Find the last organic submission's target date
      const lastOrganic = db.prepare('SELECT MAX(target_date) as last_date FROM spotlight_submissions WHERE type = "organic"').get() as any;
      
      let nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1); // Default to tomorrow

      if (lastOrganic && lastOrganic.last_date) {
          const lastDateObj = new Date(lastOrganic.last_date);
          // If the queue is backed up beyond tomorrow, append to the end
          if (lastDateObj >= nextDate) {
              nextDate = new Date(lastDateObj);
              nextDate.setDate(nextDate.getDate() + 1);
          }
      }

      finalTargetDate = nextDate.toISOString().split('T')[0];

      // Calculate wait days
      const today = new Date();
      const diffTime = Math.abs(nextDate.getTime() - today.getTime());
      estimatedWaitDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      // Queue Position
      const queueCount = db.prepare('SELECT COUNT(*) as count FROM spotlight_submissions WHERE type = "organic" AND status = "queued"').get() as any;
      queuePosition = queueCount.count + 1;
    }

    const id = `spotlight_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    db.prepare(`
      INSERT INTO spotlight_submissions (id, track_id, user_id, type, status, target_date, days, bid_amount, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, trackId, user.id, type, status, finalTargetDate, days || 1, bidAmount, scope || 'genre_language', Date.now());

    // Send Notification
    const notifId = `notif_${Date.now()}`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(notifId, user.id, 'Spotlight Submission Received', `Your song "${track.title}" has been submitted to spotlight (${type}). Target Date: ${finalTargetDate}`, 'success', Date.now());

    res.json({ success: true, id, bidAmount, status, queuePosition, estimatedWaitDays, targetDate: finalTargetDate });

  } catch (error: any) {
    console.error('Spotlight submission error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get Active Spotlight
router.get('/active', (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDate = new Date(todayStr);

        // 1. Get the currently active spotlight
        let activeSpotlight = db.prepare(`
            SELECT s.*, t.title, t.artist, t.spotify_url 
            FROM spotlight_submissions s
            JOIN tracks t ON s.track_id = t.id
            WHERE s.status = 'active'
        `).get() as any;

        if (activeSpotlight) {
            // Calculate expiration date: target_date + days
            const targetDate = new Date(activeSpotlight.target_date);
            const expirationDate = new Date(targetDate);
            expirationDate.setDate(expirationDate.getDate() + activeSpotlight.days);

            // If today is past the expiration date, mark it as completed
            if (todayDate >= expirationDate) {
                db.prepare('UPDATE spotlight_submissions SET status = "completed" WHERE id = ?').run(activeSpotlight.id);
                activeSpotlight = null; // Now we need a new one
            }
        }

        // 2. If no active spotlight (or it just expired), find the next queued one
        if (!activeSpotlight) {
            const nextInLine = db.prepare(`
                SELECT s.*, t.title, t.artist, t.spotify_url 
                FROM spotlight_submissions s
                JOIN tracks t ON s.track_id = t.id
                WHERE s.status = 'queued' AND s.target_date <= ?
                ORDER BY s.target_date ASC, s.created_at ASC
                LIMIT 1
            `).get(todayStr) as any;

            if (nextInLine) {
                // Activate it
                db.prepare('UPDATE spotlight_submissions SET status = "active" WHERE id = ?').run(nextInLine.id);
                
                // Mark any other active as completed (just in case of race conditions)
                db.prepare('UPDATE spotlight_submissions SET status = "completed" WHERE status = "active" AND id != ?').run(nextInLine.id);

                // Send Notification
                const notifId = `notif_live_${Date.now()}`;
                db.prepare(`
                    INSERT INTO notifications (id, user_id, title, message, type, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(notifId, nextInLine.user_id, 'Spotlight Live!', `Your song "${nextInLine.title}" is now LIVE in the Spotlight!`, 'success', Date.now());

                activeSpotlight = nextInLine;
                activeSpotlight.status = 'active'; // Reflect change
            }
        }

        res.json({ active: activeSpotlight || null });

    } catch (error) {
        console.error('Get Active Spotlight Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
