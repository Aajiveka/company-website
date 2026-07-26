import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class CsrfController {
  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Get a CSRF token (set as cookie + returned in body)' })
  csrfToken(@Res({ passthrough: true }) res: Response) {
    const token = randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,   // JS must read it to put in X-XSRF-TOKEN header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 3600_000,  // 1 hour
    });
    return { csrfToken: token };
  }
}
