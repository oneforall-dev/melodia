import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// --- Rate Limiting ---

export const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 login/register requests per windowMs
  message: 'Too many login attempts from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// --- CSRF Protection ---

// Simple Double-Submit Cookie Pattern
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Generate token if not present
    if (!req.cookies['X-CSRF-Token']) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('X-CSRF-Token', token, { 
        httpOnly: false, // Must be readable by JS to send in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    return next();
  }

  // Verify token for mutable methods
  const tokenFromHeader = req.headers['x-csrf-token'];
  const tokenFromCookie = req.cookies['X-CSRF-Token'];

  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({ error: 'Invalid CSRF Token' });
  }

  next();
};

// --- AI Guardrails ---
// (Removed as AI features are disabled)
