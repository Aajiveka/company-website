import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CandidatesQueryDto {
  @ApiPropertyOptional({ description: 'Match on the candidate’s full name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'tblMstrJobMappingStatus.Descr' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export class ReviewDocumentDto {
  @ApiProperty()
  @IsInt()
  documentId!: number;

  @ApiProperty({ enum: ['Verified', 'Rejected'] })
  @IsIn(['Verified', 'Rejected'])
  status!: 'Verified' | 'Rejected';
}

export type CandidateDecision =
  | 'Approved'
  | 'Rejected'
  | 'OnHold'
  | 'NeedMoreInfo'
  | 'Duplicate'
  | 'Withdrawn';

const CANDIDATE_DECISIONS: CandidateDecision[] = [
  'Approved',
  'Rejected',
  'OnHold',
  'NeedMoreInfo',
  'Duplicate',
  'Withdrawn',
];

export class ApproveRejectCandidateDto {
  @ApiProperty({ enum: CANDIDATE_DECISIONS })
  @IsIn(CANDIDATE_DECISIONS)
  decision!: CandidateDecision;

  @ApiPropertyOptional({ description: 'Reason for hold/reject/etc.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignJobDto {
  @ApiProperty({ description: 'tblClientJobs.JobID' })
  @IsInt()
  jobId!: number;
}

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'tblJobSubscriberMapping.JobSubscriberMapID' })
  @IsInt()
  jobSubscriberMapId!: number;

  @ApiProperty({ description: 'tblMstrInterviewMode.InterviewModeID' })
  @IsInt()
  interviewModeId!: number;

  @ApiProperty({ description: 'ISO timestamp' })
  @IsDateString()
  interviewTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

export class AssignDocumentsDto {
  @ApiProperty({ type: [Number], description: 'tblMstrDocuments.DocumentID' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  documentTypeIds!: number[];
}

export class UpdateInterviewStatusDto {
  @ApiProperty({ enum: ['Completed', 'Cancelled'] })
  @IsIn(['Completed', 'Cancelled'])
  status!: 'Completed' | 'Cancelled';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdatePipelineDto {
  @ApiProperty({ description: 'tblMstrJobMappingStatus.JobMapStatusID' })
  @IsNumber()
  stageId!: number;
}

export class ReferToQ3Dto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  jobSubscriberMapIds!: number[];
}

export class ForwardToCompanyDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  referralIds!: number[];
}

export class CreateInterviewRoundDto {
  @ApiProperty()
  @IsInt()
  jobSubscriberMapId!: number;

  @ApiProperty()
  @IsInt()
  roundNumber!: number;

  @ApiProperty()
  @IsString()
  roundName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hrName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hrEmail?: string;

  @ApiProperty()
  @IsString()
  interviewMode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  slots?: string[];
}

export class SelectSlotDto {
  @ApiProperty()
  @IsInt()
  slotId!: number;
}

export class SubmitRoundResultDto {
  @ApiProperty({ enum: ['Passed', 'Failed', 'Hold'] })
  @IsIn(['Passed', 'Failed', 'Hold'])
  result!: 'Passed' | 'Failed' | 'Hold';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class CreateOfferDto {
  @ApiProperty({ description: 'tblJobSubscriberMapping.JobSubscriberMapID' })
  @IsInt()
  jobSubscriberMapId!: number;

  @ApiProperty({ description: 'Structured offer details (designation, CTC, etc.)' })
  @IsObject()
  offerDetails!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ISO date for joining' })
  @IsOptional()
  @IsDateString()
  joiningDate?: string;
}

export class RespondToOfferDto {
  @ApiProperty({ description: 'true = Accept, false = Reject' })
  @IsBoolean()
  accept!: boolean;
}
