import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** Prisma known-request errors that mean "bad input", by error code. */
const PRISMA_ERRORS: Record<string, { status: number; message: string; error: string }> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'A value is too long for its field', error: 'Bad Request' },
  P2002: { status: HttpStatus.CONFLICT, message: 'A record with these details already exists', error: 'Conflict' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'A referenced record does not exist', error: 'Bad Request' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found', error: 'Not Found' },
};

/** Duck-typed so the filter does not depend on the generated client's runtime path. */
function prismaClientError(e: unknown): e is { code: string } {
  return (
    typeof e === 'object' && e !== null &&
    (e as { name?: string }).name === 'PrismaClientKnownRequestError' &&
    typeof (e as { code?: unknown }).code === 'string' &&
    (e as { code: string }).code in PRISMA_ERRORS
  );
}

/**
 * Global exception filter that enforces a consistent error response shape
 * for every HTTP error the API returns.
 *
 * Shape:
 * ```json
 * {
 *   "statusCode": 400,
 *   "message": "Bad Request" | ["field must be a string"],
 *   "error": "BadRequestException",
 *   "timestamp": "2026-07-26T12:00:00.000Z",
 *   "path": "/api/auth/login"
 * }
 * ```
 *
 * A thrower may attach extra machine-readable keys to the exception body (for example
 * `retryAfterSeconds` on a 429); those are merged into the response alongside the fields
 * above, which always win on a name clash.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;
    /**
     * Machine-readable fields the thrower attached alongside the message — e.g.
     * `retryAfterSeconds` on a 429, or `attemptsRemaining` on a rejected OTP. Without this
     * they were silently dropped here, leaving clients to parse them back out of English
     * prose.
     */
    let extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? exception.message;
        error = (obj.error as string) ?? exception.name;
        extra = Object.fromEntries(
          Object.entries(obj).filter(([k]) => !['statusCode', 'message', 'error'].includes(k)),
        );
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (prismaClientError(exception)) {
      // Constraint violations are the caller's input, not a server fault. They used to fall
      // through to the 500 branch, so an unknown city id or an over-long field read as an outage.
      const mapped = PRISMA_ERRORS[exception.code];
      statusCode = mapped.status;
      message = mapped.message;
      error = mapped.error;
      this.logger.warn(`${req.method} ${req.url} → ${statusCode} (Prisma ${exception.code})`);
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      this.logger.error(
        `Unhandled exception on ${req.method} ${req.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(statusCode).json({
      ...extra,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
