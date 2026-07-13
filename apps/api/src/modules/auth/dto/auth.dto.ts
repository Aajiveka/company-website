import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'anuj' })
  @IsString()
  @IsNotEmpty()
  userName!: string;

  @ApiProperty({ example: 'anuj' })
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

export class RegisterDto {
  @ApiProperty({ example: '9876543210', description: 'tblSubscriberRegistration is mobile-first' })
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Mobile must be 10 digits' })
  mobile!: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[0-9]{10}$/)
  mobile!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Code must be 6 digits' })
  code!: string;
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
