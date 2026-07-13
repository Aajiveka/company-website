import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '@/config/env';
import { authRouter } from '@/modules/auth/auth.routes';
import { candidatesRouter } from '@/modules/candidates/candidates.routes';
import { clientsRouter } from '@/modules/clients/clients.routes';
import { jobsRouter } from '@/modules/jobs/jobs.routes';
import { recruitmentRouter } from '@/modules/recruitment/recruitment.routes';
import { errorHandler, notFoundHandler } from '@/middleware/error';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

  app.use('/api/auth', authRouter);
  app.use('/api/candidates', candidatesRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/recruitment', recruitmentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
