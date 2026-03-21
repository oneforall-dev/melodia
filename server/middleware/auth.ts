import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  
  if (!token) {
    // console.log(`[Auth] No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (req as any).user = user;
    next();
  } catch (err) {
    console.log(`[Auth] Invalid token for ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
};
