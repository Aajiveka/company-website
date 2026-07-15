import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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

export class ApproveRejectCandidateDto {
  @ApiProperty({ enum: ['Approved', 'Rejected'] })
  @IsIn(['Approved', 'Rejected'])
  decision!: 'Approved' | 'Rejected';
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
