import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { redisProvider } from './redis.provider';

// No global secret is registered: access and refresh tokens are signed with different
// keys, so each sign/verify passes its own.
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, OtpService, redisProvider],
  exports: [AuthService],
})
export class AuthModule {}
