import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { notImplemented } from '@/utils/httpError';

export const jobsRouter = Router();

/**
 * Public job search — unauthenticated: it backs the home hero and the /jobs page,
 * both reachable before login.
 *
 * NOT IMPLEMENTED against the real database. These routes previously called three
 * stored procedures — spUtilGetJobFunctions, spUtilGetJobCities and
 * spClientGetJobsForPublicSearch — that do NOT exist: they were named by convention
 * and never verified against the backup. Nothing caught it because the web app runs
 * on MSW mocks (VITE_USE_MOCKS=1), so these handlers have never executed.
 *
 * The real implementation lands in the NestJS rebuild, once db_aajiveka.bak has been
 * restored and the authoritative schema + the 79 real procs are extracted. Until then
 * these return 501 rather than failing at the database with a misleading error.
 *
 * Contract (already exercised by the frontend, see apps/web/src/mocks/handlers.ts):
 *   GET /api/jobs/filters -> { functions: string[], locations: string[] }
 *   GET /api/jobs?jobFunction&location&page&pageSize -> { rows: PublicJob[], total: number }
 */

jobsRouter.get(
  '/filters',
  asyncHandler(async () => {
    throw notImplemented('Job filters are not yet backed by the database.');
  }),
);

jobsRouter.get(
  '/',
  asyncHandler(async () => {
    throw notImplemented('Job search is not yet backed by the database.');
  }),
);
