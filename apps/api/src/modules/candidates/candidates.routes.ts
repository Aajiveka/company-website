import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { queryProcSingle } from '@/db/callProc';
import { Role } from '@/shared/roles';

export const candidatesRouter = Router();

/** GET /api/candidates/me — logged-in candidate CV (spSubscriberGetCVToDisplay). */
candidatesRouter.get(
  '/me',
  requireAuth,
  requireRole(Role.Subscriber),
  asyncHandler(async (req, res) => {
    const profile = await queryProcSingle('spSubscriberGetCVToDisplay', { SubscriberID: req.user!.userId });
    res.json(profile);
  }),
);
