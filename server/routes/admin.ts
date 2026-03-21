import express from 'express';
import db from '../db';

const router = express.Router();

router.get('/stats', (req, res) => {
  try {
    const totalSongs = (db.prepare('SELECT COUNT(*) as count FROM tracks').get() as any).count;
    const totalVotes = (db.prepare('SELECT COUNT(*) as count FROM votes').get() as any).count;
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    
    const activeUploaders = (db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM tracks').get() as any).count;

    // Top Submitters
    const topSubmitters = db.prepare(`
      SELECT u.username, COUNT(t.id) as count 
      FROM tracks t 
      JOIN users u ON t.user_id = u.id 
      GROUP BY t.user_id 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    // Top Artists by Votes
    const topArtists = db.prepare(`
      SELECT t.artist as username, SUM(t.rating_count) as count 
      FROM tracks t 
      GROUP BY t.artist 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    // Top Countries (Submissions)
    const topCountriesSub = db.prepare(`
      SELECT u.country, COUNT(t.id) as count 
      FROM tracks t 
      JOIN users u ON t.user_id = u.id 
      WHERE u.country IS NOT NULL 
      GROUP BY u.country 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    // Top Countries (Votes)
    const topCountriesVote = db.prepare(`
      SELECT u.country, COUNT(v.id) as count 
      FROM votes v 
      JOIN users u ON v.user_id = u.id 
      WHERE u.country IS NOT NULL 
      GROUP BY u.country 
      ORDER BY count DESC 
      LIMIT 5
    `).all();

    const latestUpload = (db.prepare('SELECT MAX(created_at) as ts FROM tracks').get() as any).ts;

    res.json({
      totalSongs,
      totalVotes,
      totalUsers,
      activeUploaders,
      topSubmitters,
      topArtistsByVotes: topArtists,
      topCountriesBySubmission: topCountriesSub,
      topCountriesByVotes: topCountriesVote,
      latestUploadDate: latestUpload,
      latestVoteDate: Date.now()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

export default router;
