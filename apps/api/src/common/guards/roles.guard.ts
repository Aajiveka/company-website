import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '@/common/decorators/public.decorator';
import { ROLES } from '@/common/decorators/roles.decorator';
import type { RequestUser } from '@/common/decorators/current-user.decorator';
import type { RoleId } from '@/shared/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RoleId[]>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user || !required.includes(user.roleId)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
