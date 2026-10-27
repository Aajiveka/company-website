import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CONTACT_CHANNELS,
  INTERVIEW_MODE_LABELS,
  MANUAL_RETURN_REASONS,
  RoundDecision,
  type ContactChannel,
  type InterviewModeLabel,
  type ReturnReasonValue,
  type RoundDecisionValue,
} from '@/shared/hiring';

/** The Candidate Pipeline's stage tabs. */
export const PIPELINE_TABS = [
  'all',
  'Referred',
  'CompanyReview',
  'Scheduling',
  'Interview',
  'Decision',
  'Documents',
  'Offer',
] as const;
export type PipelineTab = (typeof PIPELINE_TABS)[number];

export class PipelineQueryDto {
  @ApiPropertyOptional({ enum: PIPELINE_TABS, default: 'all' })
  @IsOptional()
  @IsIn(PIPELINE_TABS)
  stage: PipelineTab = 'all';

  @ApiPropertyOptional({ description: 'Candidate name, company or role' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Only this company (Filters popover)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
}

export class ForwardDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  referralIds!: number[];
}

export class ReturnItemDto {
  @IsInt()
  referralId!: number;

  @ApiProperty({ enum: MANUAL_RETURN_REASONS })
  @IsIn(MANUAL_RETURN_REASONS)
  reason!: ReturnReasonValue;
}

export class ReturnDto {
  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @ApiPropertyOptional({ description: 'NOTE TO Q2' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiProperty({ description: 'Email the status update to the referring Q2 user' })
  @IsBoolean()
  emailQ2!: boolean;
}

export const COMPANY_REVIEW_TABS = ['all', 'inReview', 'shortlisted', 'expiring', 'expired'] as const;
export type CompanyReviewTab = (typeof COMPANY_REVIEW_TABS)[number];

export class InterviewerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;
}

/**
 * "Capture shortlist details from companies": the interviewers, HR contact, slots and mode
 * the company sent for a round. Creates Round 1 on a CV that has none yet.
 */
export class RoundSetupDto {
  @ApiPropertyOptional({ description: 'The pending round to update. Omit to create Round 1.' })
  @IsOptional()
  @IsInt()
  roundId?: number;

  @ApiPropertyOptional({ description: '"System design", "Coding", "Screening"…' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roundName?: string;

  @ApiProperty({ type: [InterviewerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => InterviewerDto)
  interviewers!: InterviewerDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hrName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  hrTitle?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  hrEmail?: string;

  @ApiProperty({ type: [String], description: 'ISO date-times of the company slots' })
  @IsArray()
  @ArrayMaxSize(8)
  @IsDateString({}, { each: true })
  slots!: string[];

  @ApiProperty({ enum: INTERVIEW_MODE_LABELS })
  @IsIn(INTERVIEW_MODE_LABELS)
  mode!: InterviewModeLabel;

  @ApiPropertyOptional({ default: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMins?: number;
}

export class ContactDto {
  @ApiProperty({ enum: CONTACT_CHANNELS })
  @IsIn(CONTACT_CHANNELS)
  channel!: ContactChannel;

  @ApiProperty({ description: 'What happened — "Called Nishu — no answer"' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  note!: string;

  @IsOptional()
  @IsInt()
  roundId?: number;
}

export class RecipientsDto {
  @IsBoolean()
  candidate!: boolean;

  @IsBoolean()
  interviewers!: boolean;

  @IsBoolean()
  hr!: boolean;

  @IsBoolean()
  q3!: boolean;
}

export class ConfirmSlotDto {
  @IsInt()
  slotId!: number;

  @ApiPropertyOptional({ description: 'Google Meet / Teams link — required for Virtual rounds' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^https?:\/\/\S+$/i, { message: 'Enter a full meeting link starting with https://' })
  meetingLink?: string;

  @ValidateNested()
  @Type(() => RecipientsDto)
  recipients!: RecipientsDto;
}

export class InterviewsQueryDto {
  @ApiPropertyOptional({ description: 'Any day in the week to show (YYYY-MM-DD). Defaults to this week.' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  week?: string;
}

export const CHECKLIST_ITEMS = ['candidateConfirmed', 'candidateJoined'] as const;
export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];

export class ChecklistDto {
  @ApiProperty({ enum: CHECKLIST_ITEMS })
  @IsIn(CHECKLIST_ITEMS)
  item!: ChecklistItem;

  @IsBoolean()
  done!: boolean;
}

export class Q3RoundDecisionDto {
  @ApiProperty({ enum: Object.values(RoundDecision) })
  @IsIn(Object.values(RoundDecision))
  decision!: RoundDecisionValue;

  @ApiProperty({ description: 'Q3 sends the matching mail to the candidate' })
  @IsBoolean()
  sendMail!: boolean;

  @ApiPropertyOptional({ description: 'Request the next round\'s slots from the company right away' })
  @IsOptional()
  @IsBoolean()
  requestSlots?: boolean;

  @ApiPropertyOptional({ description: 'Company feedback (internal)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class SendBackDto {
  @ApiProperty({ description: 'What the candidate has to fix — "blurry scan"' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  comment!: string;
}

export class DocumentRequestDto {
  @ApiProperty({ type: [Number], description: 'tblMstrDocuments ids to ask for' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  documentTypeIds!: number[];

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsBoolean()
  email!: boolean;

  @IsBoolean()
  whatsapp!: boolean;
}

export class OfferDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  designation!: string;

  @ApiProperty({ description: 'Annual CTC as the offer letter states it — "₹6,00,000"' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  ctc!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  joiningDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export const RETURNED_TABS = ['all', 'awaiting', 'expired', 'returned'] as const;
export type ReturnedTab = (typeof RETURNED_TABS)[number];
