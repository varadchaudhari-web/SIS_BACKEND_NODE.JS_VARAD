import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth.service';
import { sendError } from '../utils/response.util';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : (req.headers['x-access-token'] as string) || (req.query.token as string);

  if (!token) {
    return sendError(res, 'Authentication token required', 401);
  }

  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return sendError(res, 'Invalid or expired authentication token', 401);
  }

  req.user = decoded;
  next();
}

/**
 * Optional authentication middleware (populates req.user if token is valid, but does not block)
 */
export function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : (req.headers['x-access-token'] as string) || (req.query.token as string);

  if (token) {
    const decoded = AuthService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

/**
 * Authorize specific roles
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized access', 401);
    }

    const userRole = (req.user.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole || userRole === 'super admin' || userRole === 'admin');

    if (!hasRole) {
      return sendError(res, 'Forbidden: insufficient permissions', 403);
    }

    next();
  };
}
