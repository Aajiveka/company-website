import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ListJobsQueryDto {
  @ApiPropertyOptional({ description: 'Search designation, department, location, description' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'City name exact match' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Closed', 'Draft', 'Archived'] })
  @IsOptional()
  @IsIn(['Active', 'Closed', 'Draft', 'Archived'])
  status?: 'Active' | 'Closed' | 'Draft' | 'Archived';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, enum: [10, 25, 50] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;
}

export class InterviewRoundDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  round!: number;

  @ApiProperty()
  @IsString()
  process!: string;
}

export class CreateJobDto {
  @ApiProperty({ description: 'tblMstrDesignation.DesignationID' })
  @IsInt()
  designationId!: number;

  @ApiProperty({ description: 'tblMstrEmpType.EmployeeTypeID' })
  @IsInt()
  employmentTypeId!: number;

  @ApiProperty({ description: 'tblMstrWorkMode.WorkModeID' })
  @IsInt()
  workModeId!: number;

  @ApiProperty({ description: 'tblMstrCily.CityID' })
  @IsInt()
  cityId!: number;

  @ApiPropertyOptional({ description: 'tblMstrIndustryType.IndustryTypeID' })
  @IsOptional()
  @IsInt()
  industryTypeId?: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  minCtc!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  maxCtc!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minExp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExp?: number;

  @ApiPropertyOptional({ description: 'Number of openings (tblClientJobs.MaxEmp)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  openings?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateProfile?: string;

  /** One responsibility per line — the job page numbers whatever lines it finds. */
  @ApiPropertyOptional({ description: 'Key responsibilities, one per line' })
  @IsOptional()
  @IsString()
  keyResponsibilities?: string;

  @ApiPropertyOptional({ description: 'Preferred (nice-to-have) qualifications, one per line' })
  @IsOptional()
  @IsString()
  preferredQualifications?: string;

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrSkills.SkillID' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  teamSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subDepartment?: string;

  @ApiPropertyOptional({ type: [InterviewRoundDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewRoundDto)
  interviewProcess?: InterviewRoundDto[];
}

/** Every field optional — a job edit only sends what changed. */
export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'tblMstrDesignation.DesignationID' })
  @IsOptional()
  @IsInt()
  designationId?: number;

  @ApiPropertyOptional({ description: 'tblMstrEmpType.EmployeeTypeID' })
  @IsOptional()
  @IsInt()
  employmentTypeId?: number;

  @ApiPropertyOptional({ description: 'tblMstrWorkMode.WorkModeID' })
  @IsOptional()
  @IsInt()
  workModeId?: number;

  @ApiPropertyOptional({ description: 'tblMstrCily.CityID' })
  @IsOptional()
  @IsInt()
  cityId?: number;

  @ApiPropertyOptional({ description: 'tblMstrIndustryType.IndustryTypeID' })
  @IsOptional()
  @IsInt()
  industryTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minCtc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCtc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minExp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExp?: number;

  @ApiPropertyOptional({ description: 'Number of openings (tblClientJobs.MaxEmp)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  openings?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  candidateProfile?: string;

  /** One responsibility per line — the job page numbers whatever lines it finds. */
  @ApiPropertyOptional({ description: 'Key responsibilities, one per line' })
  @IsOptional()
  @IsString()
  keyResponsibilities?: string;

  @ApiPropertyOptional({ description: 'Preferred (nice-to-have) qualifications, one per line' })
  @IsOptional()
  @IsString()
  preferredQualifications?: string;

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrSkills.SkillID' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  educationDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  teamSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subDepartment?: string;

  @ApiPropertyOptional({ type: [InterviewRoundDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewRoundDto)
  interviewProcess?: InterviewRoundDto[];
}

export class SetJobStatusDto {
  @ApiProperty({ enum: ['Active', 'Closed', 'Archived'] })
  @IsIn(['Active', 'Closed', 'Archived'])
  status!: 'Active' | 'Closed' | 'Archived';
}

export class ApplicantDecisionDto {
  @ApiProperty({ enum: ['Shortlisted', 'Rejected'] })
  @IsIn(['Shortlisted', 'Rejected'])
  decision!: 'Shortlisted' | 'Rejected';
}

export class UpdateBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional({ description: 'JSON string of benefits array' })
  @IsOptional()
  @IsString()
  benefits?: string;
}

export class ApplicantNoteDto {
  @ApiProperty()
  @IsString()
  note!: string;
}
