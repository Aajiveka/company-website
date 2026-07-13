import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '@/config/env';
import { IS_PUBLIC } from '@/common/decorators/public.decorator';
import type { TokenPayload } from '@/modules/auth/auth.service';

/**
 * Applied globally — routes are protected by default and must opt out with @Public().
 * The Express API did the opposite: guards were remembered per-route, which is how
 * /jobs shipped unauthenticated by accident.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret: env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    // A refresh token must not be usable as an access token. It was in the old API, because
    // both were signed and verified with the same secret and carried no type claim.
    if (payload.type !== 'access') throw new UnauthorizedException('Not an access token');

    (req as Request & { user: unknown }).user = {
      userId: payload.sub,
      roleId: payload.roleId,
    };
    return true;
  }
}
