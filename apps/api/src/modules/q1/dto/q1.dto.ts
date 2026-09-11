import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import {
  CHECKLIST_ITEMS,
  CONTACT_CHANNELS,
  FOLLOW_UP_TIMES,
  SCREENING_STATUSES,
  type ChecklistKey,
  type ContactChannel,
} from '@/shared/screening';

/** The eight pill tabs above the Candidate Queue. `all` is the default. */
export const QUEUE_TABS = [
  'all',
  'new',
  'screening',
  'incomplete',
  'follow-up',
  'no-response',
  'verified',
  'not-interested',
] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

export const EXPERIENCE_BANDS = ['all', 'fresher', '1-3', '4-7', '8+'] as const;
export const PRIORITY_FILTERS = ['all', 'high', 'medium', 'low'] as const;

export class QueueQueryDto {
  @ApiPropertyOptional({ enum: QUEUE_TABS, default: 'all' })
  @IsOptional()
  @IsIn(QUEUE_TABS)
  tab: QueueTab = 'all';

  @ApiPropertyOptional({ description: 'Name, designation or company' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: PRIORITY_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn(PRIORITY_FILTERS)
  priority: (typeof PRIORITY_FILTERS)[number] = 'all';

  @ApiPropertyOptional({ enum: EXPERIENCE_BANDS, default: 'all' })
  @IsOptional()
  @IsIn(EXPERIENCE_BANDS)
  experience: (typeof EXPERIENCE_BANDS)[number] = 'all';

  @ApiPropertyOptional({ description: 'Only candidates with a CV on file' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cvOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class UpdateChecklistDto {
  @ApiProperty({ enum: CHECKLIST_ITEMS })
  @IsIn(CHECKLIST_ITEMS)
  item!: ChecklistKey;

  @ApiProperty()
  @IsBoolean()
  checked!: boolean;
}

/** "Select all" / clear all — one request rather than seven. */
export class SetAllChecklistDto {
  @ApiProperty()
  @IsBoolean()
  checked!: boolean;
}

export class ContactCandidateDto {
  @ApiProperty({ enum: CONTACT_CHANNELS })
  @IsIn(CONTACT_CHANNELS)
  channel!: ContactChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Internal note, not sent to the candidate' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;
}

/**
 * The three outcomes on the Update Candidate Status modal. Each carries only its own fields;
 * the service ignores (and clears) the other two branches' columns so a candidate moved from
 * Follow-up to Not Interested does not keep a stale follow-up date.
 */
export class UpdateScreeningStatusDto {
  @ApiProperty({ enum: ['FollowUp', 'NoResponse', 'NotInterested'] })
  @IsIn(['FollowUp', 'NoResponse', 'NotInterested'])
  status!: 'FollowUp' | 'NoResponse' | 'NotInterested';

  // FollowUp
  @ApiPropertyOptional({ example: '2026-09-19' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ enum: FOLLOW_UP_TIMES })
  @IsOptional()
  @IsIn(FOLLOW_UP_TIMES)
  followUpTime?: string;

  // NoResponse
  @ApiPropertyOptional({ minimum: 0, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  contactAttempts?: number;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @IsOptional()
  @IsDateString()
  nextAttemptAt?: string;

  // NotInterested
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notInterestedReason?: string;
}

export const SCREENING_STATUS_VALUES = SCREENING_STATUSES;
