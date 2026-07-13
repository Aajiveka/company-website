import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from '@/utils/jwt';
import { unauthorized } from '@/utils/httpError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Requires a valid Bearer access token; attaches the decoded payload to req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized('Missing access token'));
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}
