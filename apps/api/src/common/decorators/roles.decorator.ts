import { SetMetadata } from '@nestjs/common';
import type { RoleId } from '@/shared/roles';

export const ROLES = 'roles';
export const Roles = (...roles: RoleId[]) => SetMetadata(ROLES, roles);
