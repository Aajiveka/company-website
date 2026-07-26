import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUsersQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsNumber() @Type(() => Number) roleId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional() @IsNumber() roleId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkDeleteUsersDto {
  @IsArray() @IsNumber({}, { each: true }) userIds: number[];
}

export class BulkUpdateUsersDto {
  @IsArray() @IsNumber({}, { each: true }) userIds: number[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() roleId?: number;
}

export class AdminJobsQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() company?: string;
}

export class BulkModerateJobsDto {
  @IsArray() @IsNumber({}, { each: true }) jobIds: number[];
  @IsEnum(['approve', 'reject']) action: 'approve' | 'reject';
}

export class UpdateSettingsDto {
  @IsOptional() @IsString() siteName?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() supportEmail?: string;
  @IsOptional() @IsString() tollFreeNumber?: string;
  @IsOptional() @IsBoolean() enableJobAlerts?: boolean;
  @IsOptional() @IsBoolean() enableAssessments?: boolean;
  @IsOptional() @IsBoolean() enableReferrals?: boolean;
  @IsOptional() @IsBoolean() enableMessaging?: boolean;
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
  @IsOptional() @IsBoolean() registrationOpen?: boolean;
  @IsOptional() @IsBoolean() enableEmailNotifications?: boolean;
  @IsOptional() @IsString() smtpHost?: string;
  @IsOptional() @IsNumber() smtpPort?: number;
  @IsOptional() @IsString() senderEmail?: string;
  @IsOptional() @IsString() senderName?: string;
  @IsOptional() @IsNumber() maxJobsPerEmployer?: number;
  @IsOptional() @IsNumber() maxApplicationsPerCandidate?: number;
  @IsOptional() @IsNumber() maxFileUploadSizeMb?: number;
}

export class CreateBlogPostDto {
  @IsString() title: string;
  @IsString() slug: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsString() body: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
}

export class UpdateBlogPostDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
}
