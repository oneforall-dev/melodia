import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !APP_URL) {
  console.warn("Missing Google OAuth Credentials or APP_URL. Google Login will not work.");
} else {
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${APP_URL}/auth/google/callback`,
      proxy: true
    },
    (accessToken, refreshToken, profile, done) => {
      console.log('--- Google Strategy Callback ---');
      console.log('Profile ID:', profile.id);
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName;
  
        console.log('Looking up user by googleId:', googleId);
        // Check if user exists by google_id
        let existingUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as any;
        console.log('User lookup result:', existingUser ? 'Found' : 'Not Found');
  
        if (existingUser) {
          return done(null, existingUser);
        }

        // Check if user exists by email
        if (email) {
          existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
          if (existingUser) {
            // Update existing user with google_id
            db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, existingUser.id);
            existingUser.google_id = googleId;
            return done(null, existingUser);
          }
        }
  
        // Ensure username is unique
        let username = displayName || `user_${Math.random().toString(36).substr(2, 5)}`;
        let usernameExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        let counter = 1;
        while (usernameExists) {
            username = `${displayName}${counter}`;
            usernameExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
            counter++;
        }

        // Create new user
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stmt = db.prepare(`
          INSERT INTO users (id, google_id, email, username, role, created_at)
          VALUES (?, ?, ?, ?, 'user', ?)
        `);
        
        stmt.run(userId, googleId, email, username, Date.now());
        
        const newUser = {
          id: userId,
          google_id: googleId,
          email,
          username: username,
          role: 'user'
        };
        
        return done(null, newUser);
      } catch (error) {
        return done(error as any, undefined);
      }
    }
  ));
}

export default passport;
