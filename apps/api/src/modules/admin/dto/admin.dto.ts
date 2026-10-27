import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '@/shared/roles';

/** Shared by every admin listing — the same `{ page, pageSize }` contract the employer API uses. */
export class AdminPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number = 20;
}

export class AdminUsersQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsNumber() @Type(() => Number) roleId?: number;
  // A query string carries "false", and implicit conversion turns any non-empty string
  // into true — read the raw value instead.
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional() @IsNumber() roleId?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class BulkDeleteUsersDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsNumber({}, { each: true }) userIds: number[];
}

export class BulkUpdateUsersDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsNumber({}, { each: true }) userIds: number[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() roleId?: number;
}

/**
 * Staff roles an admin may create. Candidates register themselves (with OTP), and employers
 * come in through an employer registration an admin approves — neither is created here.
 */
export const STAFF_ROLES = [Role.QC1, Role.QC2, Role.Q3, Role.Admin] as const;

export class CreateStaffUserDto {
  @IsString() @MinLength(3) @MaxLength(50)
  @Matches(/^[A-Za-z0-9._@-]+$/, { message: 'Username may use letters, digits and . _ @ - only' })
  userName!: string;

  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;

  @IsEmail() @MaxLength(100) email!: string;

  @Type(() => Number) @IsIn(STAFF_ROLES as unknown as number[], { message: 'Choose a staff role' })
  roleId!: number;
}

export class AdminJobsQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['Active', 'Closed', 'Archived', 'Draft']) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() clientId?: number;
}

/**
 * The two transitions an admin owns on a job. Employers post straight to Active (or keep a
 * Draft); there is no pending-review state, so "approve" meant nothing. Draft and Archived
 * belong to the employer and are not touched from here.
 */
export const JOB_ACTIONS = ['close', 'reopen'] as const;
export type JobAction = (typeof JOB_ACTIONS)[number];

export class JobStatusActionDto {
  @IsIn(JOB_ACTIONS as unknown as string[]) action!: JobAction;
}

export class BulkModerateJobsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsNumber({}, { each: true }) jobIds: number[];
  @IsIn(JOB_ACTIONS as unknown as string[]) action: JobAction;
}

export class AdminApplicationsQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() statusId?: number;
  @IsOptional()
  @IsIn(['Screening', 'WithQ3', 'CompanyReview', 'Interview', 'Selection', 'Joined', 'Closed'])
  stage?: string;
  @IsOptional() @Type(() => Number) @IsInt() jobId?: number;
  @IsOptional() @Type(() => Number) @IsInt() subscriberId?: number;
}

export class AdminCompaniesQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

export class AdminAuditQueryDto extends AdminPageQueryDto {
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @IsOptional() @IsString() @MaxLength(60) entity?: string;
  @IsOptional() @IsString() @MaxLength(60) entityId?: string;
  @IsOptional() @Type(() => Number) @IsInt() userId?: number;
}

export class EmployerRegistrationsQueryDto {
  @IsOptional() @IsIn(['Pending', 'Approved', 'Rejected']) status?: string;
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
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(200) slug: string;
  @IsOptional() @IsString() @MaxLength(500) excerpt?: string;
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

export class ReviewEmployerDto {
  @IsIn(['Approved', 'Rejected'])
  decision!: 'Approved' | 'Rejected';

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;

  /** The company's city. Required to approve when the free-text location matches none. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  cityId?: number;
}
