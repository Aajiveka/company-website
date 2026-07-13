import type { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { HttpError } from '@/utils/httpError';

/** 404 fallthrough. */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

/** Centralised error handler — normalises HttpError and unexpected errors. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : String((err as Error)?.message ?? err);
  res.status(500).json({ message });
}
