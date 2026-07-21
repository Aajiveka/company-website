import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RoleId } from '@/shared/roles';

export interface RequestUser {
  userId: number;
  roleId: RoleId;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest<{ user: RequestUser }>().user,
);
