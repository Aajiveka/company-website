import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { verifyToken } from '@/utils/jwt';
import { unauthorized } from '@/utils/httpError';

export const authController = {
  async login(req: Request, res: Response) {
    const session = await authService.login(req.body, {
      ip: req.ip ?? '',
      ua: req.headers['user-agent'] ?? '',
    });
    res.json(session);
  },

  me(req: Request, res: Response) {
    // requireAuth has populated req.user from the access token.
    const u = req.user!;
    res.json({ userId: u.userId, userName: u.userName, roleId: u.roleId });
  },

  refresh(req: Request, res: Response) {
    let payload;
    try {
      payload = verifyToken(req.body.refreshToken);
    } catch {
      throw unauthorized('Invalid refresh token');
    }
    const session = authService.refresh(payload, {
      userId: payload.userId,
      userName: payload.userName,
      fullName: payload.userName,
      email: '',
      roleId: payload.roleId,
    });
    res.json(session);
  },

  logout(_req: Request, res: Response) {
    // Stateless JWT: client discards tokens. (Server-side session end handled by proc on next login.)
    res.json({ ok: true });
  },

  async register(req: Request, res: Response) {
    res.json(await authService.register(req.body));
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'If the email exists, a reset link was sent.' });
  },
};
