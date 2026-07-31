import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

/**
 * The whole signup form. Every field is required and validated here, before the service is
 * reached — nothing is persisted until the emailed code is verified, but a registration that
 * cannot produce a valid account should fail now rather than ten minutes from now.
 *
 * MaxLength values mirror the column widths on tblSubscriberCVDetails (FullName varchar(100),
 * EmailID varchar(100)) so an over-long value is a 400 rather than a truncation or a 500.
 */
export class RegisterDto {
  @ApiProperty({ example: 'Rahul Sharma', maxLength: 100 })
  @IsString()
  @MinLength(2, { message: 'Enter your full name' })
  @MaxLength(100, { message: 'Full name must be 100 characters or fewer' })
  fullName!: string;

  @ApiProperty({ example: 'rahul@example.com', maxLength: 100 })
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(100, { message: 'Email must be 100 characters or fewer' })
  email!: string;

  /**
   * The national number only — no country code, no separators. `countryCode` carries the rest.
   *
   * 4–15 digits is the E.164 envelope rather than India's fixed 10: the signup form offers every
   * country's dial code, and national number lengths vary (UAE 9, US 10, Germany up to 11).
   * 15 is both the standard's ceiling and the width of RegistrationMobileNo.
   */
  @ApiProperty({ example: '9876543210', description: 'UserName on tblSecUser for candidates' })
  @IsString()
  @Matches(/^[0-9]{4,15}$/, { message: 'Mobile must be 4 to 15 digits' })
  mobile!: string;

  /**
   * Length is the only rule enforced. A composition rule ("one upper, one digit, one symbol")
   * shrinks the search space to whatever satisfies it and pushes people toward `Password1!`;
   * length is what actually costs an attacker. The 72-byte ceiling is bcrypt's — Argon2id has
   * no such limit, but capping input keeps a megabyte password from becoming a CPU DoS.
   */
  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be 72 characters or fewer' })
  password!: string;

  /** E.164 calling code, with or without '+'. Stored without it, in varchar(5). */
  @ApiPropertyOptional({ example: '+91', default: '+91' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{1,4}$/, { message: 'Country code must be 1 to 4 digits' })
  countryCode?: string;
}

/**
 * Verification addresses the registration by its handle, not by email. The handle is the
 * 256-bit secret returned from /auth/register; see AuthService.register for why the email
 * address on its own is not safe to key on.
 */
export class VerifyOtpDto {
  @ApiProperty({ description: 'The registrationToken returned by /auth/register' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Invalid registration token' })
  registrationToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Code must be 6 digits' })
  code!: string;
}

export class ResendOtpDto {
  @ApiProperty({ description: 'The registrationToken returned by /auth/register' })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'Invalid registration token' })
  registrationToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userName!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword!: string;
}
