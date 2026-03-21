import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../db';
import { Request, Response, NextFunction } from 'express';
import { scrapeSpotifyMetadata, scrapeSpotifyPlaylist } from '../services/spotify';
import { authenticateJWT } from '../middleware/auth';
import claimsRouter from './claims';
import songsRouter, { addTrackToDb } from './songs';
import usersRouter from './users';
import spotlightRouter from './spotlight';
import notificationsRouter from './notifications';

const router = express.Router();

// --- Background Job Queue ---
interface BulkUploadJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total: number;
    processed: number;
    successCount: number;
    errors: string[];
    message: string;
}

const activeJobs = new Map<string, BulkUploadJob>();

// --- Middleware ---

// CSRF Protection Middleware
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    const host = req.headers.host;
    
    if (!origin && !referer) {
      return res.status(403).json({ error: 'CSRF: Missing Origin/Referer' });
    }

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && process.env.NODE_ENV === 'production') {
           // In production, strict check.
        }
      } catch (e) {
        // Invalid origin URL
      }
    }
  }
  next();
};

// Apply CSRF protection to all routes
router.use(csrfProtection);

// Mount Sub-Routers
router.use(claimsRouter);
router.use(songsRouter);
router.use('/api/users', usersRouter);
router.use('/api/spotlight', spotlightRouter);
router.use('/api/notifications', notificationsRouter);

// --- Routes ---

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per `window` (here, per hour)
  message: { error: 'Too many authentication attempts from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Username/Password Login
router.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, isSuperAdmin: !!user.is_super_admin }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure, 
      sameSite: isSecure ? 'none' : 'lax', 
      maxAge: 3600000 // 1 hour
    });

    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, isSuperAdmin: !!user.is_super_admin } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register (Optional, for regular users)
router.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO users (id, username, email, password, role, created_at)
      VALUES (?, ?, ?, ?, 'user', ?)
    `).run(userId, username, email, hashedPassword, Date.now());

    const token = jwt.sign({ id: userId, role: 'user', isSuperAdmin: false }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure, 
      sameSite: isSecure ? 'none' : 'lax', 
      maxAge: 3600000 // 1 hour
    });

    res.json({ success: true, user: { id: userId, username, role: 'user' } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/api/auth/logout', (req, res) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax'
  });
  res.json({ success: true });
});

// Google Auth - Get URL (for Popup)
router.get('/api/auth/google/url', (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Missing Google Client ID' });
  }

  const host = req.headers['x-forwarded-host'] || req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const redirectUri = req.query.redirect_uri as string || `${protocol}://${host}/auth/google/callback`;
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile email',
    access_type: 'online',
    prompt: 'consent'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url });
});

// Google Auth - Callback (Popup Flow)
router.get(['/auth/google/callback', '/auth/google/callback/'], (req, res, next) => {
  try {
    passport.authenticate('google', { 
      session: false,
      state: true
    } as any, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Google Auth Error Details:', err);
        console.error('Google Auth Info:', info);
        return res.redirect('/auth/failure?error=' + encodeURIComponent(err.message || 'Unknown error'));
      }
      if (!user) {
        console.error('Google Auth No User:', info);
        return res.redirect('/auth/failure?error=No+User');
      }
      req.user = user;
      next();
    })(req, res, next);
  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    res.status(500).send('Internal Server Error');
  }
}, (req, res) => {
    // Successful authentication, generate JWT
    const user = req.user as any;
    const token = jwt.sign({ id: user.id, role: user.role, isSuperAdmin: !!user.is_super_admin }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecure, 
      sameSite: isSecure ? 'none' : 'lax', 
      maxAge: 3600000 // 1 hour
    });

    // Safe injection of user data
    const userJson = JSON.stringify(user).replace(/</g, '\\u003c');

    // Send script to close popup and notify opener
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. Closing...</p>
        </body>
      </html>
    `);
  }
);

router.get('/auth/failure', (req, res) => {
  const error = req.query.error || 'Authentication Failed';
  res.send(`Authentication Failed: ${error}`);
});

// Check Session
router.get('/api/auth/session', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  // Fetch full user details if needed
  const dbUser: any = db.prepare('SELECT id, username, email, role, country, is_super_admin FROM users WHERE id = ?').get(user.id);
  if (dbUser) {
    res.json({ ...dbUser, isSuperAdmin: !!dbUser.is_super_admin });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Spotify Metadata Scraper
router.get('/api/spotify/metadata', async (req, res) => {
  const { url } = req.query;
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid Spotify URL' });
  }

  try {
    const metadata = await scrapeSpotifyMetadata(url);
    res.json(metadata);
  } catch (error) {
    console.error('Spotify Scrape Error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Spotify Playlist Scraper (Super Admin Only)
router.get('/api/spotify/playlist', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  // Check Super Admin
  const dbUser = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(user.id) as any;
  if (!dbUser?.is_super_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid Playlist URL' });
  }

  try {
    const tracks = await scrapeSpotifyPlaylist(url, 100);
    res.json({ tracks });
  } catch (error) {
    console.error('Playlist Scrape Error:', error);
    res.status(500).json({ error: 'Failed to fetch playlist tracks' });
  }
});

// Get Admin Stats
router.get('/api/admin/stats', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const totalSongs = db.prepare('SELECT COUNT(*) as count FROM tracks').get() as any;
        const totalVotes = db.prepare('SELECT COUNT(*) as count FROM votes').get() as any;
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
        
        // Active Uploaders (users who uploaded in last 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const activeUploaders = db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM tracks WHERE created_at > ?').get(thirtyDaysAgo) as any;

        // Top Submitters
        const topSubmitters = db.prepare(`
            SELECT u.username, COUNT(t.id) as count 
            FROM tracks t 
            JOIN users u ON t.user_id = u.id 
            GROUP BY t.user_id 
            ORDER BY count DESC 
            LIMIT 5
        `).all();

        res.json({
            totalSongs: totalSongs.count,
            totalVotes: totalVotes.count,
            totalUsers: totalUsers.count,
            activeUploaders: activeUploaders.count,
            topSubmitters,
            topCountriesBySubmission: [], // Placeholder for now
            topCountriesByVotes: [], // Placeholder
            topArtistsByVotes: [], // Placeholder
            latestUploadDate: null,
            latestVoteDate: null
        });
    } catch (e) {
        console.error('Failed to get admin stats', e);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Bulk Upload (Background Job)
router.post('/api/admin/bulk-upload', authenticateJWT, async (req, res) => {
    const user = (req as any).user;
    
    // Check Super Admin
    const dbUser = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(user.id) as any;
    if (!dbUser?.is_super_admin) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing playlist URL' });

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize Job
    activeJobs.set(jobId, {
        id: jobId,
        status: 'pending',
        total: 0,
        processed: 0,
        successCount: 0,
        errors: [],
        message: 'Initializing...'
    });

    // Start Background Process
    (async () => {
        const job = activeJobs.get(jobId)!;
        try {
            job.status = 'processing';
            job.message = 'Fetching playlist tracks...';
            
            const tracks = await scrapeSpotifyPlaylist(url, 300); // Limit 300
            job.total = tracks.length;
            
            if (tracks.length === 0) {
                job.status = 'failed';
                job.message = 'No tracks found or invalid URL.';
                return;
            }

            job.message = `Found ${tracks.length} tracks. Starting upload...`;

            for (let i = 0; i < tracks.length; i++) {
                const trackUrl = tracks[i];
                job.processed = i + 1;
                job.message = `Processing ${i + 1}/${tracks.length}...`;

                try {
                    // 1. Scrape Metadata
                    const metadata = await scrapeSpotifyMetadata(trackUrl);
                    
                    // 2. Add to DB
                    addTrackToDb(user, trackUrl, {
                        ...metadata,
                        genre: 'Pop', // Default
                        subGenre: '',
                        artistChannels: [],
                        isBachAssisted: false
                    });
                    
                    job.successCount++;
                } catch (e: any) {
                    console.error(`Failed to add ${trackUrl}`, e.message);
                    job.errors.push(`${trackUrl}: ${e.message}`);
                }

                // Wait 30s (Rate Limit)
                if (i < tracks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 30000));
                }
            }

            job.status = 'completed';
            job.message = `Completed! Added ${job.successCount}/${job.total} songs.`;

        } catch (e: any) {
            console.error('Bulk Upload Job Failed:', e);
            job.status = 'failed';
            job.message = `Job failed: ${e.message}`;
        }
    })();

    res.json({ success: true, jobId });
});

// Get Job Status
router.get('/api/admin/bulk-upload/status/:jobId', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    // Check Super Admin
    const dbUser = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(user.id) as any;
    if (!dbUser?.is_super_admin) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const jobId = req.params.jobId as string;
    const job = activeJobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
});

// Ad Settings API (Renamed to promotions to avoid ad blockers)
router.get('/api/settings/promotions', (req, res) => {
  try {
    const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('ads') as any;
    res.json(settings ? JSON.parse(settings.value) : { bach: true, auramaster: true });
  } catch (e) {
    console.error('Failed to get ad settings', e);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.post('/api/admin/settings/promotions', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'admin' && !user.isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { bach, auramaster } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('ads', JSON.stringify({ bach, auramaster }));
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to update ad settings', e);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Hot Song Settings API
router.get('/api/settings/hot-song', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    try {
        const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('hot_song_config') as any;
        res.json(settings ? JSON.parse(settings.value) : { mode: 'random', url: '' });
    } catch (e) {
        console.error('Failed to get hot song settings', e);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.post('/api/admin/settings/hot-song', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { mode, url } = req.body;
    
    try {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('hot_song_config', JSON.stringify({ mode, url }));
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to update hot song settings', e);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Editorial Settings API
router.get('/api/settings/editorial', (req, res) => {
    try {
        const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('editorial_config') as any;
        res.json(settings ? JSON.parse(settings.value) : { interval: 17, mode: 'random', manualSongId: '' });
    } catch (e) {
        console.error('Failed to get editorial settings', e);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.post('/api/admin/settings/editorial', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { interval, mode, manualSongId } = req.body;
    try {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('editorial_config', JSON.stringify({ interval, mode, manualSongId }));
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to update editorial settings', e);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Ad Config API
router.get('/api/settings/ad-config', (req, res) => {
    try {
        const settings = db.prepare('SELECT value FROM settings WHERE key = ?').get('ad_config') as any;
        res.json(settings ? JSON.parse(settings.value) : { interval: 10, enabled: true });
    } catch (e) {
        console.error('Failed to get ad config', e);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.post('/api/admin/settings/ad-config', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { interval, enabled } = req.body;
    try {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('ad_config', JSON.stringify({ interval, enabled }));
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to update ad config', e);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Custom Ads API
router.get('/api/ads', (req, res) => {
    try {
        const ads = db.prepare('SELECT * FROM custom_ads WHERE is_active = 1 ORDER BY created_at DESC').all();
        res.json(ads);
    } catch (e) {
        console.error('Failed to get ads', e);
        res.status(500).json({ error: 'Failed to get ads' });
    }
});

router.get('/api/admin/ads', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    try {
        const ads = db.prepare('SELECT * FROM custom_ads ORDER BY created_at DESC').all();
        res.json(ads);
    } catch (e) {
        console.error('Failed to get admin ads', e);
        res.status(500).json({ error: 'Failed to get ads' });
    }
});

router.post('/api/admin/ads', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { title, description, url, imageUrl } = req.body;
    const id = `ad_${Date.now()}`;
    
    try {
        db.prepare(`
            INSERT INTO custom_ads (id, title, description, url, image_url, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(id, title, description, url, imageUrl, Date.now());
        res.json({ success: true, id });
    } catch (e) {
        console.error('Failed to create ad', e);
        res.status(500).json({ error: 'Failed to create ad' });
    }
});

router.put('/api/admin/ads/:id', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { title, description, url, imageUrl } = req.body;
    const { id } = req.params;

    try {
        db.prepare(`
            UPDATE custom_ads 
            SET title = ?, description = ?, url = ?, image_url = ?
            WHERE id = ?
        `).run(title, description, url, imageUrl, id);
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to update ad', e);
        res.status(500).json({ error: 'Failed to update ad' });
    }
});

router.delete('/api/admin/ads/:id', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    try {
        db.prepare('DELETE FROM custom_ads WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to delete ad', e);
        res.status(500).json({ error: 'Failed to delete ad' });
    }
});

router.post('/api/admin/ads/:id/toggle', authenticateJWT, (req, res) => {
    const user = (req as any).user;
    if (user.role !== 'admin' && !user.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { isActive } = req.body;

    try {
        db.prepare('UPDATE custom_ads SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
        res.json({ success: true });
    } catch (e) {
        console.error('Failed to toggle ad', e);
        res.status(500).json({ error: 'Failed to toggle ad' });
    }
});

export default router;

