import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/apiResponse';

export interface AuthPayload {
  userId: string;
  role: string;
  adminRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Access token required', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'TOKEN_EXPIRED', 'Access token has expired', 401);
      return;
    }
    sendError(res, 'INVALID_TOKEN', 'Invalid access token', 401);
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    } catch {
      // Token invalid, continue without auth
    }
  }

  next();
}

// requireRole is exported from middleware/roleGuard.ts — import from there
export { requireRole } from './roleGuard';
