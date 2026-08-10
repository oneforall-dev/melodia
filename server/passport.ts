import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db, { OWNER_EMAIL } from './db';

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
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const displayName = profile.displayName;
        const isOwner = email === OWNER_EMAIL;
  
        console.log('Looking up user by googleId:', googleId);
        // Check if user exists by google_id
        let existingUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as any;
        console.log('User lookup result:', existingUser ? 'Found' : 'Not Found');
  
        if (existingUser) {
          if (isOwner) {
            db.prepare('UPDATE users SET is_owner = 0 WHERE id != ?').run(existingUser.id);
            db.prepare("UPDATE users SET email = ?, role = 'admin', is_super_admin = 1, is_owner = 1 WHERE id = ?")
              .run(OWNER_EMAIL, existingUser.id);
            existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id);
          }
          return done(null, existingUser);
        }

        // Check if user exists by email
        if (email) {
          existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
          if (existingUser) {
            // Update existing user with google_id
            if (isOwner) db.prepare('UPDATE users SET is_owner = 0 WHERE id != ?').run(existingUser.id);
            db.prepare(`UPDATE users SET google_id = ?, role = ?, is_super_admin = ?, is_owner = ? WHERE id = ?`)
              .run(googleId, isOwner ? 'admin' : existingUser.role, isOwner ? 1 : existingUser.is_super_admin, isOwner ? 1 : existingUser.is_owner, existingUser.id);
            existingUser.google_id = googleId;
            existingUser.role = isOwner ? 'admin' : existingUser.role;
            existingUser.is_super_admin = isOwner ? 1 : existingUser.is_super_admin;
            existingUser.is_owner = isOwner ? 1 : existingUser.is_owner;
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
          INSERT INTO users (id, google_id, email, username, role, is_super_admin, is_owner, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(userId, googleId, email, username, isOwner ? 'admin' : 'user', isOwner ? 1 : 0, isOwner ? 1 : 0, Date.now());
        
        const newUser = {
          id: userId,
          google_id: googleId,
          email,
          username: username,
          role: isOwner ? 'admin' : 'user',
          is_super_admin: isOwner ? 1 : 0,
          is_owner: isOwner ? 1 : 0
        };
        
        return done(null, newUser);
      } catch (error) {
        return done(error as any, undefined);
      }
    }
  ));
}

export default passport;
