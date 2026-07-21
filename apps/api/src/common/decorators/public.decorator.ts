import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Marks a route as reachable without a bearer token (login, register, job search). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
