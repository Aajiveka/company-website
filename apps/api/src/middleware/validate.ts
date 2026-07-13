import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { badRequest } from '@/utils/httpError';

/** Validates req.body against a Zod schema, replacing it with the parsed value. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(badRequest(result.error.issues[0]?.message ?? 'Invalid request body'));
    }
    req.body = result.data;
    next();
  };
}
