import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { queryProc, queryProcSingle } from '@/db/callProc';
import { Role } from '@/shared/roles';

export const clientsRouter = Router();

/** GET /api/clients/me — company profile (spClientGetCompanyInfo). */
clientsRouter.get(
  '/me',
  requireAuth,
  requireRole(Role.Client, Role.Admin),
  asyncHandler(async (req, res) => {
    const company = await queryProcSingle('spClientGetCompanyInfo', { UserID: req.user!.userId });
    res.json(company);
  }),
);

/** GET /api/clients/me/jobs — posted jobs listing (spClientGetJoblisting). */
clientsRouter.get(
  '/me/jobs',
  requireAuth,
  requireRole(Role.Client, Role.Admin),
  asyncHandler(async (req, res) => {
    const jobs = await queryProc('spClientGetJoblisting', { UserID: req.user!.userId });
    res.json(jobs);
  }),
);
