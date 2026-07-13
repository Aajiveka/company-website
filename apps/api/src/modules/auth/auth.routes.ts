import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { authController } from './auth.controller';
import {
  forgotSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from './auth.schemas';

// Throttle credential endpoints to blunt brute-force attempts.
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30 });

export const authRouter = Router();

authRouter.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validateBody(refreshSchema), asyncHandler(async (req, res) => authController.refresh(req, res)));
authRouter.post('/logout', asyncHandler(async (req, res) => authController.logout(req, res)));
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => authController.me(req, res)));
authRouter.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(authController.register));
authRouter.post('/forgot-password', authLimiter, validateBody(forgotSchema), asyncHandler(authController.forgotPassword));
