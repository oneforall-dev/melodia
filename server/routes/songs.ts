import express from 'express';
import { z } from 'zod';
import db from '../db';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// --- Helper: Add Track to DB ---
export function addTrackToDb(user: any, url: string, metadata: any, language: string = 'English') {
    // Check if track already exists (Globally)
    const existing = db.prepare('SELECT id FROM tracks WHERE spotify_url = ?').get(url);
    if (existing) {
        throw new Error('Track already exists');
    }

    const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.prepare(`
      INSERT INTO tracks (
        id, user_id, spotify_url, title, artist, genre, sub_genre, language, artist_channels, is_bach_assisted, is_auramaster_assisted, average_rating, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Calculate Initial Rating Bonus
    let initialRating = 0;
    if (metadata?.isBachAssisted) initialRating += 0.25;
    if (metadata?.isAuramasterAssisted) initialRating += 0.25;

    stmt.run(
      trackId, 
      user.id, 
      url, 
      metadata?.title || 'Unknown Title',
      metadata?.artist || 'Unknown Artist',
      metadata?.genre || 'Pop',
      metadata?.subGenre || '',
      language,
      JSON.stringify(metadata?.artistChannels || []),
      metadata?.isBachAssisted ? 1 : 0,
      metadata?.isAuramasterAssisted ? 1 : 0,
      initialRating,
      Date.now()
    );
    
    return trackId;
}

// Get available filters (languages and genres that have tracks)
router.get('/api/metadata/filters', (req, res) => {
  try {
    const { uploaderFilterId } = req.query;
    let querySuffix = "WHERE language IS NOT NULL AND language != ''";
    let genreQuerySuffix = "WHERE genre IS NOT NULL AND genre != ''";
    const params: any[] = [];

    if (uploaderFilterId) {
        querySuffix += ' AND user_id = ?';
        genreQuerySuffix += ' AND user_id = ?';
        params.push(uploaderFilterId);
    }

    const languagesResult = db.prepare(`SELECT DISTINCT language FROM tracks ${querySuffix}`).all(...params) as { language: string }[];
    const genresResult = db.prepare(`SELECT DISTINCT genre FROM tracks ${genreQuerySuffix}`).all(...params) as { genre: string }[];

    const languages = languagesResult.map(r => r.language);
    const genres = genresResult.map(r => r.genre);

    res.json({ languages, genres });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Public Chart API (Get Tracks formatted as Songs)
router.get('/api/songs', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { genre, language, uploaderFilterId, searchQuery, sortMode } = req.query;

    console.log(`GET /api/songs params:`, { page, limit, genre, language, uploaderFilterId, searchQuery, sortMode });

    // Build Query
    let query = `
      SELECT t.*, u.username as uploader_name 
      FROM tracks t 
      LEFT JOIN users u ON t.user_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (genre && genre !== 'All') {
      query += ` AND t.genre = ?`;
      params.push(genre);
    }

    if (language && language !== 'All') {
      query += ` AND t.language = ?`;
      params.push(language);
    }

    if (uploaderFilterId) {
      query += ` AND t.user_id = ?`;
      params.push(uploaderFilterId);
    }

    if (searchQuery) {
      query += ` AND (t.title LIKE ? OR t.artist LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Sort
    if (sortMode === 'fresh') {
        query += ` ORDER BY t.created_at DESC`;
    } else {
        // Default to Top Rated (Chart Order)
        // Sort by Average Rating (High to Low), then by Vote Count (High to Low)
        query += ` ORDER BY t.average_rating DESC, t.rating_count DESC`;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute Query
    const tracks = db.prepare(query).all(...params);
    
    // Get Total Count (for pagination)
    let countQuery = `SELECT COUNT(*) as count FROM tracks t WHERE 1=1`;
    const countParams: any[] = [];
    if (genre && genre !== 'All') { countQuery += ` AND t.genre = ?`; countParams.push(genre); }
    if (language && language !== 'All') { countQuery += ` AND t.language = ?`; countParams.push(language); }
    if (uploaderFilterId) { countQuery += ` AND t.user_id = ?`; countParams.push(uploaderFilterId); }
    if (searchQuery) { countQuery += ` AND (t.title LIKE ? OR t.artist LIKE ?)`; countParams.push(`%${searchQuery}%`, `%${searchQuery}%`); }
    
    const total = db.prepare(countQuery).get(...countParams) as any;
    console.log(`Found ${tracks.length} tracks. Total in DB matching criteria: ${total.count}`);

    // Pre-fetch votes for all retrieved tracks to avoid N+1 query
    const trackIds = tracks.map((t: any) => t.id);
    let votesByTrack: Record<string, string[]> = {};
    if (trackIds.length > 0) {
      const placeholders = trackIds.map(() => '?').join(',');
      const votes = db.prepare(`SELECT track_id, user_id FROM votes WHERE track_id IN (${placeholders})`).all(...trackIds) as { track_id: string, user_id: string }[];
      votesByTrack = votes.reduce((acc, v) => {
        if (!acc[v.track_id]) acc[v.track_id] = [];
        acc[v.track_id].push(v.user_id);
        return acc;
      }, {} as Record<string, string[]>);
    }

    // Map to Song interface expected by frontend
    const songs = tracks.map((t: any, index: number) => {
      let channels = [];
      try {
        channels = t.artist_channels ? JSON.parse(t.artist_channels) : [];
      } catch (e) {
        console.error('Failed to parse artist_channels', e);
      }

      const votedUserIds = votesByTrack[t.id] || [];

      return {
        id: t.id,
        title: t.title || 'Track ' + t.id.substr(0, 4),
        artist: t.artist || 'Unknown Artist',
        coverUrl: `https://picsum.photos/seed/${t.id}/300/300`,
        spotifyUrl: t.spotify_url,
        genre: t.genre,
        subGenre: t.sub_genre,
        language: t.language,
        artistChannels: channels,
        uploader: {
          id: t.user_id,
          username: t.uploader_name || 'Unknown'
        },
        ratingCount: t.rating_count || 0,
        averageRating: t.average_rating || 0,
        votedUserIds: votedUserIds,
        rank: offset + index + 1, // Calculate Rank
        lastWeekRank: 0,
        peakRank: 0,
        weeksOnChart: 1,
        isBachAssisted: !!t.is_bach_assisted,
        isAuramasterAssisted: !!t.is_auramaster_assisted,
        hasBeenEdited: !!t.has_been_edited,
        timestamp: t.created_at,
        debutDate: t.created_at, // Default to creation date for now
        debutRank: 0 // Default
      };
    });

    res.json({
      data: songs,
      hasMore: (offset + limit) < total.count
    });
  } catch (err) {
    console.error('GET /api/songs Error:', err);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
});

// Submit Track API
router.post('/api/songs', authenticateJWT, async (req, res) => {
  const user = (req as any).user;
  const { url, language, metadata, subGenre, artistChannels, isBachAssisted, isAuramasterAssisted } = req.body;
  const spotify_url = url;

  console.log(`POST /api/songs user=${user.username} url=${url}`);

  // 1. Rate Limiting (Anti-Spam)
  // Check if user is admin/superadmin (bypass limit)
  const dbUser = db.prepare('SELECT role, is_super_admin FROM users WHERE id = ?').get(user.id) as any;
  const isAdmin = dbUser?.role === 'admin' || !!dbUser?.is_super_admin;

  if (!isAdmin) {
      const oneHourAgo = Date.now() - 3600000;
      const recentUploads = db.prepare('SELECT COUNT(*) as count FROM tracks WHERE user_id = ? AND created_at > ?').get(user.id, oneHourAgo) as any;
      
      if (recentUploads.count >= 5) {
          return res.status(429).json({ error: 'Rate limit exceeded. You can only upload 5 songs per hour.' });
      }
  }

  // Zod Validation
  const schema = z.object({
    spotify_url: z.string().url().refine(val => val.includes('open.spotify.com') && (val.includes('/track/') || val.includes('/album/')), {
        message: "Must be a valid Spotify Track or Album URL"
    })
  });

  try {
    schema.parse({ spotify_url });
    
    // Check if track already exists (Globally)
    const existing = db.prepare('SELECT id FROM tracks WHERE spotify_url = ?').get(spotify_url);
    if (existing) {
        console.log('Track already exists in database');
        return res.status(400).json({ error: 'This track has already been submitted by someone else.' });
    }

    // Use Helper
    const trackId = addTrackToDb(user, spotify_url, {
        title: metadata?.title,
        artist: metadata?.artist,
        genre: metadata?.genre,
        subGenre: subGenre,
        artistChannels: artistChannels,
        isBachAssisted: isBachAssisted,
        isAuramasterAssisted: isAuramasterAssisted
    }, language);
    
    console.log(`Track submitted successfully: ${trackId}`);
    res.json({ success: true, id: trackId });
  } catch (error: any) {
    console.error('POST /api/songs Error:', error);
    res.status(400).json({ error: error.message || 'Invalid Spotify URL or Data' });
  }
});

// Update Track Metadata API
router.put('/api/songs/:id', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const trackId = req.params.id;
  const { genre, language, artistChannels } = req.body;

  try {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId) as any;
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Check Ownership
    if (track.user_id !== user.id && user.role !== 'admin' && !user.isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if already edited (unless admin)
    if (track.has_been_edited && user.role !== 'admin' && !user.isSuperAdmin) {
      return res.status(403).json({ error: 'You can only edit a submission once.' });
    }

    const stmt = db.prepare(`
      UPDATE tracks 
      SET genre = ?, language = ?, artist_channels = ?, has_been_edited = 1 
      WHERE id = ?
    `);
    
    stmt.run(genre, language, JSON.stringify(artistChannels || []), trackId);

    res.json({ success: true });
  } catch (e) {
    console.error('Update Track Error:', e);
    res.status(500).json({ error: 'Failed to update track' });
  }
});

// Delete Track API
router.delete('/api/dashboard/delete/:id', authenticateJWT, (req, res) => {
  const tokenUser = (req as any).user;
  const trackId = req.params.id;

  console.log(`[Delete Track] Request by user ${tokenUser.username} (${tokenUser.id}) for track ${trackId}`);

  try {
      // Fetch fresh user data to ensure we have the latest role/permissions
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenUser.id) as any;
      
      if (!user) {
          return res.status(401).json({ error: 'User not found' });
      }

      const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId) as any;

      if (!track) {
        console.log(`[Delete Track] Track ${trackId} not found`);
        return res.status(404).json({ error: 'Track not found' });
      }

      // Admin Bypass or Ownership Check
      const isOwner = track.user_id === user.id;
      const isAdmin = user.role === 'admin' || !!user.is_super_admin;

      console.log(`[Delete Track] Check: isOwner=${isOwner} (TrackUser:${track.user_id} vs ReqUser:${user.id}), isAdmin=${isAdmin}`);

      if (!isOwner && !isAdmin) {
        console.log(`[Delete Track] Forbidden: User ${user.username} is not owner or admin`);
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this track.' });
      }

      const stmt = db.prepare('DELETE FROM tracks WHERE id = ?');
      const info = stmt.run(trackId);
      
      console.log(`[Delete Track] Success. Changes: ${info.changes}`);
      res.json({ success: true });
  } catch (error: any) {
      console.error('[Delete Track] Error:', error);
      res.status(500).json({ error: 'Failed to delete track: ' + error.message });
  }
});

// Rate Song API
router.post('/api/songs/:id/rate', authenticateJWT, (req, res) => {
  const user = (req as any).user;
  const trackId = req.params.id;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating (1-5)' });
  }

  try {
    // Check User Privileges (Fetch fresh from DB)
    const dbUser = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(user.id) as any;
    const isSuperAdmin = !!dbUser?.is_super_admin;

    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(trackId) as any;
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // 1. Prevent Self-Voting (unless Super Admin)
    if (track.user_id === user.id && !isSuperAdmin) {
      return res.status(403).json({ error: 'You cannot vote for your own song.' });
    }

    // 2. Prevent Multiple Votes (unless Super Admin)
    const existingVote = db.prepare('SELECT id FROM votes WHERE track_id = ? AND user_id = ?').get(trackId, user.id);
    if (existingVote && !isSuperAdmin) {
      return res.status(403).json({ error: 'You have already voted for this song.' });
    }

    // Insert Vote
    db.prepare('INSERT INTO votes (track_id, user_id, rating, timestamp) VALUES (?, ?, ?, ?)').run(trackId, user.id, rating, Date.now());

    // Recalculate Stats
    const stats = db.prepare('SELECT COUNT(*) as count, AVG(rating) as avg FROM votes WHERE track_id = ?').get(trackId) as any;
    
    // Calculate Bonus
    let bonus = 0;
    if (track.is_bach_assisted) bonus += 0.25;
    if (track.is_auramaster_assisted) bonus += 0.25;

    const newAverage = (stats.avg || 0) + bonus;

    // Update Track
    db.prepare('UPDATE tracks SET rating_count = ?, average_rating = ? WHERE id = ?').run(stats.count, newAverage, trackId);

    // Return updated stats
    res.json({ success: true, ratingCount: stats.count, averageRating: newAverage });

  } catch (e) {
    console.error('Rate Song Error:', e);
    res.status(500).json({ error: 'Failed to rate song' });
  }
});

// Get Hot Song (Configurable)
router.get('/api/songs/hot', (req, res) => {
  try {
    // 1. Get Config
    const configRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('hot_song_config') as any;
    const config = configRow ? JSON.parse(configRow.value) : { mode: 'random', url: '' };

    let hotSong: any = null;

    if (config.mode === 'manual' && config.url) {
        // Manual Mode: Try to find the song by URL
        hotSong = db.prepare(`
            SELECT t.*, u.username as uploader_name 
            FROM tracks t 
            LEFT JOIN users u ON t.user_id = u.id 
            WHERE t.spotify_url = ?
        `).get(config.url);
    }

    // Fallback to Random if Manual failed or Mode is Random
    if (!hotSong) {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        hotSong = db.prepare(`
        SELECT t.*, u.username as uploader_name 
        FROM tracks t 
        LEFT JOIN users u ON t.user_id = u.id 
        WHERE t.created_at > ? 
        ORDER BY RANDOM() 
        LIMIT 1
        `).get(sevenDaysAgo);

        if (!hotSong) {
            // Fallback to any random song
            hotSong = db.prepare(`
                SELECT t.*, u.username as uploader_name 
                FROM tracks t 
                LEFT JOIN users u ON t.user_id = u.id 
                ORDER BY RANDOM() 
                LIMIT 1
            `).get();
        }
    }

    if (!hotSong) {
      return res.json({ song: null });
    }

    // Map to frontend format
    const song = {
      id: hotSong.id,
      title: hotSong.title || 'Unknown Track',
      artist: hotSong.artist || 'Unknown Artist',
      coverUrl: `https://picsum.photos/seed/${hotSong.id}/300/300`,
      spotifyUrl: hotSong.spotify_url,
      genre: hotSong.genre,
      subGenre: hotSong.sub_genre,
      language: hotSong.language,
      artistChannels: hotSong.artist_channels ? JSON.parse(hotSong.artist_channels) : [],
      uploader: {
        id: hotSong.user_id,
        username: hotSong.uploader_name || 'Unknown'
      },
      ratingCount: hotSong.rating_count || 0,
      averageRating: hotSong.average_rating || 0,
      rank: 0,
      lastWeekRank: 0,
      peakRank: 0,
      weeksOnChart: 1,
      isBachAssisted: !!hotSong.is_bach_assisted,
      hasBeenEdited: false,
      timestamp: hotSong.created_at,
      debutDate: hotSong.created_at,
      debutRank: 0
    };

    res.json({ song });

  } catch (e) {
    console.error('Get Hot Song Error:', e);
    res.status(500).json({ error: 'Failed to get hot song' });
  }
});

export default router;
