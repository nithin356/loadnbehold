import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
}

export function requireAdminRole(...adminRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (req.user.role !== 'admin') {
      sendError(res, 'FORBIDDEN', 'Admin access required', 403);
      return;
    }

    // Super admin can access everything
    if (req.user.adminRole === 'super_admin') {
      next();
      return;
    }

    if (!req.user.adminRole || !adminRoles.includes(req.user.adminRole)) {
      sendError(res, 'FORBIDDEN', 'Insufficient admin permissions', 403);
      return;
    }

    next();
  };
}
