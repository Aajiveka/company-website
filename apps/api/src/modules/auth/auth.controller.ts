import { Body, Controller, Get, Headers, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in and receive an access + refresh token pair' })
  @ApiResponse({ status: 200, description: 'Login successful — access and refresh tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.login(dto.userName, dto.password, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate a refresh token; the presented one is revoked' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or revoked' })
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

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Start registration — validates the form and emails a 6-digit OTP',
    description:
      'Nothing is written to the database here. The registration waits in Redis for 10 minutes ' +
      'and is created only once /auth/verify-otp proves the code. Returns a registrationToken ' +
      'that verify and resend address.',
  })
  @ApiResponse({ status: 201, description: 'OTP emailed; registrationToken returned' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email or mobile already registered' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts, or resend cooldown active' })
  @ApiResponse({ status: 503, description: 'Verification email could not be queued' })
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.auth.register({
      fullName: dto.fullName,
      email: dto.email,
      mobile: dto.mobile,
      password: dto.password,
      countryCode: dto.countryCode,
      ipAddress: ip,
    });
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(200)
  // Deliberately tighter than the per-attempt limit the OTP itself enforces (5 guesses against
  // one code). This bounds a caller cycling *many* registrations to brute-force any one of them.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify the emailed OTP, create the account, and receive a session' })
  @ApiResponse({ status: 200, description: 'Verified — account created and session returned' })
  @ApiResponse({ status: 400, description: 'Incorrect, expired, or exhausted OTP' })
  @ApiResponse({ status: 409, description: 'Email or mobile was claimed while the code was in flight' })
  @ApiResponse({ status: 429, description: 'Too many verification attempts' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Ip() ip: string) {
    return this.auth.verifyEmailOtp(dto.registrationToken, dto.code, ip);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Re-send the registration OTP',
    description:
      'Issues a new code and invalidates the previous one. Subject to a 60-second per-address ' +
      'cooldown, which responds 429 with retryAfterSeconds.',
  })
  @ApiResponse({ status: 200, description: 'A new OTP was emailed' })
  @ApiResponse({ status: 400, description: 'No registration in flight for this token' })
  @ApiResponse({ status: 429, description: 'Cooldown still active — see retryAfterSeconds' })
  @ApiResponse({ status: 503, description: 'Verification email could not be queued' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.auth.resendEmailOtp(dto.registrationToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email a password-reset link (always the same response)' })
  @ApiResponse({ status: 200, description: 'Reset link sent (always returns success to prevent enumeration)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.userName);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Consume a reset token and set a new password' })
  @ApiResponse({ status: 200, description: 'Password updated' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  me(@CurrentUser() current: RequestUser) {
    // Resolved in the service, because NodeID is polymorphic and this has to branch on role.
    return this.auth.me(current.userId, current.roleId);
  }
}
