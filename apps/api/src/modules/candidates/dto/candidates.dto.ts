import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateJobAlertDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  keyword!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ enum: ['Daily', 'Weekly'] })
  @IsIn(['Daily', 'Weekly'])
  frequency!: 'Daily' | 'Weekly';
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword!: string;
}
