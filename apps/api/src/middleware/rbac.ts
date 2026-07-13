import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '@/utils/httpError';

/** Role-based access guard. Use after requireAuth. */
export function requireRole(...roleIds: number[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roleIds.includes(req.user.roleId)) return next(forbidden('Insufficient role'));
    next();
  };
}
