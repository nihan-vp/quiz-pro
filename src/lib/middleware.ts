import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth.ts';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ message: 'Invalid token' });

  req.user = payload;
  next();
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    next();
    return;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    next();
    return;
  }

  req.user = payload;
  next();
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
