import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  
  if (!token) {
    // console.log(`[Auth] No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tokenUser = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    const dbUser = db.prepare(
      'SELECT id, username, role, is_super_admin, is_owner FROM users WHERE id = ?'
    ).get(tokenUser.id) as any;

    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Authorization always reflects the database, never stale JWT claims.
    (req as any).user = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      isSuperAdmin: !!dbUser.is_super_admin,
      isOwner: !!dbUser.is_owner,
    };
    next();
  } catch (err) {
    console.log(`[Auth] Invalid token for ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
};
