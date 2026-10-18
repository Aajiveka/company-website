import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** 1000 lakhs. CTC is stored in rupees. */
const MAX_CTC_RUPEES = 100_000_000;

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

  @ApiPropertyOptional({
    description: 'Interview mode: Telephonic | Face to face | Video call',
    enum: ['Telephonic', 'Face to face', 'Video call'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Telephonic', 'Face to face', 'Video call'])
  mode?: string;
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

  @ApiProperty({ description: 'Annual CTC in rupees (max 1000 lakhs)' })
  @IsInt()
  @Min(0)
  @Max(MAX_CTC_RUPEES)
  minCtc!: number;

  @ApiProperty({ description: 'Annual CTC in rupees (max 1000 lakhs)' })
  @IsInt()
  @Min(0)
  @Max(MAX_CTC_RUPEES)
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

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
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

  @ApiPropertyOptional({
    type: [String],
    description: 'Skill labels — matched or created in tblMstrSkills, then linked to the job',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills?: string[];

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
  @Max(MAX_CTC_RUPEES)
  minCtc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CTC_RUPEES)
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

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
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

  @ApiPropertyOptional({
    type: [String],
    description: 'Skill labels — matched or created in tblMstrSkills, then linked to the job',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  skills?: string[];

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

export class RequestDocumentsDto {
  @ApiPropertyOptional({ type: [Number], description: 'tblMstrDocumentType ids' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  documentTypeIds?: number[];

  @ApiPropertyOptional({ type: [String], description: 'Free-text document names; new ones join the master list' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  documentNames?: string[];
}

/** Interviews go through ScheduleInterviewDto, not a bare status change. */
export class ApplicantDecisionDto {
  @ApiProperty({ enum: ['Shortlisted', 'Hired', 'Rejected'] })
  @IsIn(['Shortlisted', 'Hired', 'Rejected'])
  decision!: 'Shortlisted' | 'Hired' | 'Rejected';
}

export const INTERVIEW_MODES = ['Telephonic', 'Face to face', 'Video call'] as const;

/** What Q3 needs to schedule a round with the candidate. */
export class InterviewScheduleDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  hrName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(200)
  hrEmail!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  interviewerName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(200)
  interviewerEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  guestName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o: InterviewScheduleDetailsDto) => Boolean(o.guestEmail?.trim()))
  @IsEmail()
  @MaxLength(200)
  guestEmail?: string;

  @ApiProperty({ enum: INTERVIEW_MODES })
  @IsIn(INTERVIEW_MODES)
  mode!: (typeof INTERVIEW_MODES)[number];

  @ApiPropertyOptional({ description: 'Video call link, if the employer already has one' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Venue — required for face-to-face rounds' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiProperty({ type: [String], description: 'Exactly 3 ISO datetimes the employer can do' })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsDateString({}, { each: true })
  slots!: string[];
}

export class ScheduleInterviewDto extends InterviewScheduleDetailsDto {
  @ApiPropertyOptional({ enum: ['Round1', 'Final'], description: 'First round of the process' })
  @IsOptional()
  @IsIn(['Round1', 'Final'])
  round?: 'Round1' | 'Final';
}

export class InterviewResultDto {
  @ApiProperty({ enum: ['Select', 'Reject', 'Hold'] })
  @IsIn(['Select', 'Reject', 'Hold'])
  decision!: 'Select' | 'Reject' | 'Hold';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;

  @ApiPropertyOptional({
    enum: ['Round2', 'Round3', 'Final', 'Hire'],
    description: 'Required with Select: schedule another round, or hire',
  })
  @ValidateIf((o: InterviewResultDto) => o.decision === 'Select')
  @IsIn(['Round2', 'Round3', 'Final', 'Hire'])
  next?: 'Round2' | 'Round3' | 'Final' | 'Hire';

  @ApiPropertyOptional({ type: InterviewScheduleDetailsDto })
  @ValidateIf((o: InterviewResultDto) => o.decision === 'Select' && o.next !== 'Hire')
  @ValidateNested()
  @Type(() => InterviewScheduleDetailsDto)
  nextRound?: InterviewScheduleDetailsDto;
}

export class ListApplicantsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'New',
      'Shortlisted',
      'Interview',
      'Hired',
      'Rejected',
      'SentToCompany',
      'Referred',
      'Expired',
      'Offer',
      'Joined',
      'OnHold',
    ],
  })
  @IsOptional()
  @IsIn([
    'New',
    'Shortlisted',
    'Interview',
    'Hired',
    'Rejected',
    'SentToCompany',
    'Referred',
    'Expired',
    'Offer',
    'Joined',
    'OnHold',
  ])
  status?:
    | 'New'
    | 'Shortlisted'
    | 'Interview'
    | 'Hired'
    | 'Rejected'
    | 'SentToCompany'
    | 'Referred'
    | 'Expired'
    | 'Offer'
    | 'Joined'
    | 'OnHold';

  @ApiPropertyOptional({ description: 'Search name, designation, city, company, skills' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by job opening id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jobId?: number;

  @ApiPropertyOptional({ description: 'Filter by candidate city (case-insensitive contains)' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Minimum total experience in years' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minExp?: number;

  @ApiPropertyOptional({ description: 'Maximum notice period in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxNotice?: number;

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

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ description: 'Company name (e.g. Maruti)' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: 'Company email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Company contact number' })
  @IsOptional()
  @IsString()
  contactNo?: string;

  @ApiPropertyOptional({ description: 'HR contact email' })
  @IsOptional()
  @IsString()
  hrEmail?: string;

  @ApiPropertyOptional({ description: 'HR contact number' })
  @IsOptional()
  @IsString()
  hrContactNo?: string;

  @ApiPropertyOptional({ description: 'HR contact person name' })
  @IsOptional()
  @IsString()
  hrContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Company location / address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'About company' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cityId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  industryTypeId?: number;

  @ApiPropertyOptional({ description: 'Stored logo filename/path under uploads' })
  @IsOptional()
  @IsString()
  companyLogo?: string;
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
