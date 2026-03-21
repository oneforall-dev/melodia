import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, '../melodia.db');
const envDbPath = process.env.DATABASE_PATH;
const dbPath = envDbPath ? path.resolve(process.cwd(), envDbPath) : defaultDbPath;

console.log('Opening database at:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  // Users Table - strictly as requested + keeping compatibility where possible
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      username TEXT,
      password TEXT,
      country TEXT,
      created_at INTEGER,
      is_super_admin INTEGER DEFAULT 0,
      last_username_update INTEGER DEFAULT 0
    )
  `);

  // Tracks Table - New Requirement
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      spotify_url TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      genre TEXT,
      sub_genre TEXT,
      language TEXT,
      artist_channels TEXT,
      is_bach_assisted INTEGER DEFAULT 0,
      created_at INTEGER,
      rating_count INTEGER DEFAULT 0,
      average_rating REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Votes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      timestamp INTEGER,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Claims Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      proof_text TEXT,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected
      timestamp INTEGER,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Custom Ads Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_ads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER
    )
  `);

  // Spotlight Submissions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS spotlight_submissions (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'organic' | 'paid'
      status TEXT DEFAULT 'queued', -- 'queued' | 'active' | 'completed' | 'rejected'
      target_date TEXT, -- YYYY-MM-DD
      days INTEGER DEFAULT 1,
      bid_amount REAL DEFAULT 0,
      scope TEXT DEFAULT 'global', -- 'global' | 'genre_language'
      created_at INTEGER,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Notifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT, -- NULL for global notifications
      title TEXT,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'error'
      is_read INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Initialize default settings if not exists
  const defaultAds = {
    bach: true,
    auramaster: true
  };
  
  const defaultHotSong = {
    mode: 'random', // 'random' | 'manual'
    url: ''
  };

  const defaultEditorial = {
    interval: 17,
    mode: 'random',
    manualSongId: ''
  };

  const defaultAdConfig = {
    interval: 10,
    enabled: true
  };

  const defaultSpotlightConfig = {
    enabled: true,
    prices: {
      day: 1,
      genre_language: 1,
      global: 2
    }
  };

  try {
    const existingAds = db.prepare('SELECT value FROM settings WHERE key = ?').get('ads');
    if (!existingAds) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('ads', JSON.stringify(defaultAds));
    }

    const existingHot = db.prepare('SELECT value FROM settings WHERE key = ?').get('hot_song_config');
    if (!existingHot) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('hot_song_config', JSON.stringify(defaultHotSong));
    }

    const existingEditorial = db.prepare('SELECT value FROM settings WHERE key = ?').get('editorial_config');
    if (!existingEditorial) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('editorial_config', JSON.stringify(defaultEditorial));
    }

    const existingAdConfig = db.prepare('SELECT value FROM settings WHERE key = ?').get('ad_config');
    if (!existingAdConfig) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('ad_config', JSON.stringify(defaultAdConfig));
    }

    const existingSpotlightConfig = db.prepare('SELECT value FROM settings WHERE key = ?').get('spotlight_config');
    if (!existingSpotlightConfig) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('spotlight_config', JSON.stringify(defaultSpotlightConfig));
    }
  } catch (e) {
    console.error('Failed to init settings', e);
  }

  // Attempt to add columns if they don't exist (Migration logic)
  try {
    db.exec("ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE");
  } catch (e) { /* Column likely exists */ }

  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))");
  } catch (e) { /* Column likely exists */ }

  // Tracks Migrations
  const trackColumns = [
    "title TEXT", "artist TEXT", "genre TEXT", "sub_genre TEXT", 
    "language TEXT", "artist_channels TEXT", "is_bach_assisted INTEGER DEFAULT 0",
    "rating_count INTEGER DEFAULT 0", "average_rating REAL DEFAULT 0",
    "has_been_edited INTEGER DEFAULT 0", "is_auramaster_assisted INTEGER DEFAULT 0"
  ];
  
  trackColumns.forEach(col => {
    try {
      db.exec(`ALTER TABLE tracks ADD COLUMN ${col}`);
    } catch (e) { /* Column likely exists */ }
  });

  // Create Indexes for Performance
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tracks_user_id ON tracks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
      CREATE INDEX IF NOT EXISTS idx_tracks_language ON tracks(language);
      CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tracks_rating ON tracks(average_rating DESC, rating_count DESC);
      
      CREATE INDEX IF NOT EXISTS idx_votes_track_id ON votes(track_id);
      CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_track_user ON votes(track_id, user_id);
      
      CREATE INDEX IF NOT EXISTS idx_claims_track_id ON claims(track_id);
      CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
      CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
      
      CREATE INDEX IF NOT EXISTS idx_spotlight_user_id ON spotlight_submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_spotlight_status ON spotlight_submissions(status);
      CREATE INDEX IF NOT EXISTS idx_spotlight_target_date ON spotlight_submissions(target_date);
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);
    console.log('Database indexes created successfully.');
  } catch (e) {
    console.error('Failed to create indexes', e);
  }

  // Admin Seeding
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminUsername && adminPassword) {
    try {
      const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get(adminUsername) as any;
      const hashedPassword = bcrypt.hashSync(adminPassword, 10);
      
      if (existingAdmin) {
        // Update existing admin
        db.prepare(`
          UPDATE users 
          SET password = ?, role = 'admin', is_super_admin = 1 
          WHERE username = ?
        `).run(hashedPassword, adminUsername);
        console.log(`Admin user '${adminUsername}' updated from environment variables.`);
      } else {
        // Create new admin
        const adminId = `admin_${Date.now()}`;
        db.prepare(`
          INSERT INTO users (id, username, password, role, is_super_admin, created_at)
          VALUES (?, ?, ?, 'admin', 1, ?)
        `).run(adminId, adminUsername, hashedPassword, Date.now());
        console.log(`Admin user '${adminUsername}' created from environment variables.`);
      }
    } catch (error) {
      console.error('Failed to seed admin user:', error);
    }
  }

  console.log('Database initialized with users and tracks tables.');
}

export default db;
