import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { requireRole } from '@/middleware/rbac';
import { queryProc, queryProcSingle } from '@/db/callProc';
import { Role } from '@/shared/roles';

export const recruitmentRouter = Router();

/** GET /api/recruitment/candidates — paginated listing (spSubscriberGetSubscriberForListing). */
recruitmentRouter.get(
  '/candidates',
  requireAuth,
  requireRole(Role.QC1, Role.QC2, Role.Admin),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    const rows = await queryProc('spSubscriberGetSubscriberForListing', {
      UserID: req.user!.userId,
      Search: req.query.search ?? '',
      Status: req.query.status ?? '',
      PageNo: page,
      PageSize: pageSize,
    });
    // The proc is expected to return a `Total` column; fall back to row count.
    const total = (rows[0] as { Total?: number } | undefined)?.Total ?? rows.length;
    res.json({ rows, total });
  }),
);

/** GET /api/recruitment/qc1/stats — dashboard counts (spQC1GetDashboardData). */
recruitmentRouter.get(
  '/qc1/stats',
  requireAuth,
  requireRole(Role.QC1, Role.Admin),
  asyncHandler(async (req, res) => {
    const stats = await queryProcSingle('spQC1GetDashboardData', { UserID: req.user!.userId });
    res.json(stats);
  }),
);
