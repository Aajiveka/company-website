import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in and receive an access + refresh token pair' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.userName, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token; the presented one is revoked' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: Partial<RefreshDto>) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The authenticated user' })
  async me(@CurrentUser() current: RequestUser) {
    const user = await this.prisma.client.secUser.findUnique({
      where: { userID: current.userId },
      select: { userID: true, userName: true, nodeID: true },
    });
    const person = user?.nodeID
      ? await this.prisma.client.mstrPerson.findUnique({
          where: { personNodeID: user.nodeID },
          select: { descr: true, emailID: true },
        })
      : null;
    return {
      userId: Number(user?.userID ?? current.userId),
      userName: user?.userName ?? '',
      fullName: person?.descr?.trim() || user?.userName || '',
      email: person?.emailID ?? '',
      roleId: current.roleId,
    };
  }
}
