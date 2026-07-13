import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { queryProc } from '@/db/callProc';

export const jobsRouter = Router();

/**
 * Public job search — deliberately unauthenticated: it backs the home hero and the
 * /jobs page, both of which are reachable before login.
 */

/** GET /api/jobs/filters — master lists for the function/location dropdowns. */
jobsRouter.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    const [functions, locations] = await Promise.all([
      queryProc('spUtilGetJobFunctions', {}),
      queryProc('spUtilGetJobCities', {}),
    ]);
    res.json({
      functions: (functions as { FunctionName: string }[]).map((r) => r.FunctionName),
      locations: (locations as { CityName: string }[]).map((r) => r.CityName),
    });
  }),
);

/** GET /api/jobs — paginated public listing filtered by function + city. */
jobsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    const rows = await queryProc('spClientGetJobsForPublicSearch', {
      JobFunction: req.query.jobFunction ?? '',
      City: req.query.location ?? '',
      PageNo: page,
      PageSize: pageSize,
    });
    // The proc is expected to return a `Total` column; fall back to row count.
    const total = (rows[0] as { Total?: number } | undefined)?.Total ?? rows.length;
    res.json({ rows, total });
  }),
);
