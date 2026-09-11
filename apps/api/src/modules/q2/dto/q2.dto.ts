import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MATCH_CRITERION_KEYS, type MatchCriterionKey } from '@/shared/matching';

/** `?relevantOnly=true` arrives as the string "true" on a query string. */
const toBool = () =>
  Transform(({ value }) => (typeof value === 'string' ? value === 'true' : !!value));

/** The "All / Relevant / Not Relevant" segmented control on All Applicants. */
export const APPLICANT_TABS = ['all', 'relevant', 'notRelevant'] as const;
export type ApplicantTab = (typeof APPLICANT_TABS)[number];

/**
 * Which sidebar screen is asking. "queue" is All Applicants — everything still awaiting a
 * decision plus the decided rows, exactly as the Figma's All Applicants table shows all 10
 * applications; "forwarded" and "sentBack" are the two decision buckets below it.
 */
export const APPLICANT_BUCKETS = ['queue', 'forwarded', 'sentBack', 'rejected'] as const;
export type ApplicantBucket = (typeof APPLICANT_BUCKETS)[number];

export class ApplicantsQueryDto {
  @ApiPropertyOptional({ enum: APPLICANT_TABS, default: 'all' })
  @IsOptional()
  @IsIn(APPLICANT_TABS)
  tab: ApplicantTab = 'all';

  @ApiPropertyOptional({ enum: APPLICANT_BUCKETS, default: 'queue' })
  @IsOptional()
  @IsIn(APPLICANT_BUCKETS)
  bucket: ApplicantBucket = 'queue';

  @ApiPropertyOptional({ description: 'Candidate name, job title or company' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

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

export class JobsQueryDto {
  @ApiPropertyOptional({ description: 'Job title or company' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class JobApplicantsQueryDto {
  @ApiPropertyOptional({
    description: 'The "Relevant only" switch on Applicants — Match Ranking',
    default: false,
  })
  @IsOptional()
  @toBool()
  @IsBoolean()
  relevantOnly = false;
}

export class UpdateCriterionDto {
  @ApiPropertyOptional({ enum: MATCH_CRITERION_KEYS })
  @IsIn(MATCH_CRITERION_KEYS)
  criterion!: MatchCriterionKey;

  @IsBoolean()
  included!: boolean;
}

export class DecisionDto {
  @ApiPropertyOptional({ description: 'Optional note stored with the decision' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
