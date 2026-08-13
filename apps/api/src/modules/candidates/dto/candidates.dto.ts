import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/* ------------------------------------------------------------------------- *
 * Fixed vocabularies.
 *
 * These would each be a master table in the legacy schema, but none of them exists there —
 * and they are closed sets a candidate picks from, not data an admin curates. Validating
 * against a constant keeps the stored values stable enough to filter on later; free text
 * would make "Full Time", "full-time" and "FT" three different values.
 * ------------------------------------------------------------------------- */

/**
 * Optional single-choice fields accept '' as well as a listed value: without it a candidate
 * could set a choice but never unset it, since an omitted key means "leave unchanged".
 */
const orBlank = <T extends readonly string[]>(values: T) => ['', ...values];

export const COURSE_MODES = ['Full Time', 'Part Time', 'Correspondence'] as const;
export const JOB_TYPES = ['Permanent', 'Contractual'] as const;
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time'] as const;
export const SHIFTS = ['Day', 'Night', 'Flexible'] as const;
/// Where the candidate wants to work, which is a different question from which shift.
export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'] as const;
export const MARITAL_STATUSES = ['Single / unmarried', 'Married', 'Widowed', 'Divorced', 'Separated', 'Other'] as const;
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'] as const;
export const PROJECT_STATUSES = ['In Progress', 'Finished'] as const;
export const PROJECT_SITES = ['Onsite', 'Offsite'] as const;
export const ACCOMPLISHMENT_KINDS = [
  'ONLINE_PROFILE',
  'WORK_SAMPLE',
  'PUBLICATION',
  'PRESENTATION',
  'PATENT',
] as const;
export const DISABILITY_STATUSES = ['Do not have disability', 'Have disability'] as const;
export const MILITARY_STATUSES = ['Not applicable', 'Currently serving', 'Veteran'] as const;
export const CAREER_BREAK_STATUSES = ['Have not taken', 'Have taken'] as const;
/** Read / write / speak are stored as the legacy 'Y'/'N' chars, so they are booleans here. */
export const LANGUAGE_PROFICIENCIES = [1, 2, 3] as const;

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

export class UpdatePersonalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiProperty({ enum: ['M', 'F'] })
  @IsIn(['M', 'F'])
  gender!: 'M' | 'F';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'tblMstrCily.CityID' })
  @IsOptional()
  @IsInt()
  cityId?: number;
}

export class UpdateProfessionalDto {
  @ApiPropertyOptional({ description: 'tblMstrSubFunctions.SubFunctionID' })
  @IsOptional()
  @IsInt()
  subFunctionId?: number;

  @ApiPropertyOptional({ description: 'tblMstrSkills.SkillID' })
  @IsOptional()
  @IsInt()
  skillId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  totalExp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentCtc?: number;

  @ApiPropertyOptional({ description: 'tblMstrCily.CityID' })
  @IsOptional()
  @IsInt()
  currentCityId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flgReadyToRelocate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriod?: number;

  @ApiPropertyOptional({ description: 'tblMstrIndustryType.IndustryTypeID' })
  @IsOptional()
  @IsInt()
  industryTypeId?: number;

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrCily.CityID — replaces the whole set' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preferredCityIds?: number[];

  @ApiPropertyOptional({ type: [String], description: 'Matched against tblMstrTags.TagName; unmatched names are dropped' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagNames?: string[];
}

export class UpsertEducationDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberEducationId?: number;

  @ApiPropertyOptional({
    description:
      'tblMstrCourseType.CourseTypeID — nullable column; no real master data was recovered for this table, so the UI has nothing to offer here yet',
  })
  @IsOptional()
  @IsInt()
  courseTypeId?: number;

  @ApiProperty({ description: 'tblMstrEducationDegree.DegreeID' })
  @IsInt()
  degreeId!: number;

  @ApiPropertyOptional({ description: 'University / board / school' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instituteName?: string;

  @ApiPropertyOptional({ description: 'Year the course was completed' })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  passingYear?: number;

  @ApiPropertyOptional({ enum: COURSE_MODES })
  @IsOptional()
  @IsIn(orBlank(COURSE_MODES))
  courseMode?: string;

  @ApiPropertyOptional({ description: 'Percentage, CGPA or grade, as the candidate states it' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marks?: string;
}

export class UpsertEmploymentDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberEmployerId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employer!: string;

  @ApiPropertyOptional({ description: 'tblMstrDesignation.DesignationID' })
  @IsOptional()
  @IsInt()
  designationId?: number;

  @ApiPropertyOptional({ description: 'tblMstrEmpType.EmployeeTypeID' })
  @IsOptional()
  @IsInt()
  employeeTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  releavingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flgCurrent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  noticePeriodDays?: number;
}

export class UpsertCertificateDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberCertificateId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  certificateName!: string;

  @ApiPropertyOptional({ description: 'Link to the issued credential' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'Credential id printed on the certificate' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  certificationId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  validFromMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  validFromYear?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  validTillMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  validTillYear?: number;

  @ApiPropertyOptional({ description: 'Set when the credential never expires — not the same as "expiry unknown"' })
  @IsOptional()
  @IsBoolean()
  neverExpires?: boolean;
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

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsAlerts?: boolean;

  @ApiPropertyOptional({ enum: ['Daily', 'Weekly', 'Instant'] })
  @IsOptional()
  @IsIn(['Daily', 'Weekly', 'Instant'])
  jobAlertFrequency?: 'Daily' | 'Weekly' | 'Instant';
}

/* ------------------------------------------------------------------------- *
 * Profile sections (tblSubscriberProfileExtra and friends)
 * ------------------------------------------------------------------------- */

export class UpdateHeadlineDto {
  @ApiProperty({ description: 'The one-line pitch shown under the candidate\'s name' })
  @IsString()
  @MaxLength(500)
  resumeHeadline!: string;
}

export class UpdateSummaryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  profileSummary!: string;
}

export class UpdateKeySkillsDto {
  @ApiProperty({ type: [String], description: 'Matched against tblMstrTags.TagName; unmatched names are dropped' })
  @IsArray()
  @IsString({ each: true })
  tagNames!: string[];
}

export class UpdateCareerProfileDto {
  @ApiPropertyOptional({ description: 'tblMstrIndustryType.IndustryTypeID' })
  @IsOptional()
  @IsInt()
  industryTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  roleCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobRole?: string;

  @ApiPropertyOptional({ enum: JOB_TYPES, isArray: true, description: 'A candidate can be open to more than one' })
  @IsOptional()
  @IsArray()
  @IsIn(JOB_TYPES, { each: true })
  desiredJobType?: string[];

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(EMPLOYMENT_TYPES, { each: true })
  desiredEmploymentType?: string[];

  @ApiPropertyOptional({ enum: SHIFTS })
  @IsOptional()
  @IsIn(orBlank(SHIFTS))
  preferredShift?: string;

  @ApiPropertyOptional({ enum: WORK_MODES, isArray: true, description: 'A candidate can accept more than one' })
  @IsOptional()
  @IsArray()
  @IsIn(WORK_MODES, { each: true })
  preferredWorkModes?: string[];

  @ApiPropertyOptional({ description: 'Annual, in rupees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preferredSalary?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredJobRoles?: string[];

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrCily.CityID — replaces the whole set' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  preferredCityIds?: number[];
}

export class UpdatePersonalDetailsDto {
  @ApiPropertyOptional({ enum: MARITAL_STATUSES })
  @IsOptional()
  @IsIn(orBlank(MARITAL_STATUSES))
  maritalStatus?: string;

  @ApiPropertyOptional({ type: [String], description: 'Free-form extras shown beside marital status' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personalTraits?: string[];

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(orBlank(CATEGORIES))
  category?: string;

  @ApiPropertyOptional({ type: [String], description: 'Countries the candidate holds a work permit for' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workPermitCountries?: string[];

  @ApiPropertyOptional({ description: 'US permit type, which is asked for separately (e.g. "Have US H1 Visa")' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  usWorkPermit?: string;
}

export class UpdateDiversityDto {
  @ApiPropertyOptional({ enum: DISABILITY_STATUSES })
  @IsOptional()
  @IsIn(orBlank(DISABILITY_STATUSES))
  disabilityStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  disabilityType?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  disabilityPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  assistanceRequired?: string;

  @ApiPropertyOptional({ enum: MILITARY_STATUSES })
  @IsOptional()
  @IsIn(orBlank(MILITARY_STATUSES))
  militaryStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  militaryServiceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  militaryRank?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  militaryEnrolmentDate?: string;

  @ApiPropertyOptional({ enum: CAREER_BREAK_STATUSES })
  @IsOptional()
  @IsIn(orBlank(CAREER_BREAK_STATUSES))
  careerBreakStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  careerBreakReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  careerBreakFrom?: string;

  @ApiPropertyOptional({ description: 'Omit while the break is ongoing — the profile prints "Present"' })
  @IsOptional()
  @IsDateString()
  careerBreakTo?: string;
}

export class UpsertItSkillDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberItSkillId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  skillName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  lastUsedYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  expYears?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 11 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  expMonths?: number;
}

export class UpsertProjectDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberProjectId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clientName?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(orBlank(PROJECT_STATUSES))
  projectStatus?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  workedFromMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  workedFromYear?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  workedTillMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  workedTillYear?: number;

  @ApiPropertyOptional({ enum: PROJECT_SITES })
  @IsOptional()
  @IsIn(orBlank(PROJECT_SITES))
  projectSite?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(orBlank(EMPLOYMENT_TYPES))
  natureOfEmployment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  teamSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleDescr?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsUsed?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}

export class UpsertAccomplishmentDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberAccomplishmentId?: number;

  @ApiProperty({ enum: ACCOMPLISHMENT_KINDS })
  @IsIn(ACCOMPLISHMENT_KINDS)
  kind!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descr?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  eventMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  eventYear?: number;

  @ApiPropertyOptional({ description: 'Patents only' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  patentStatus?: string;

  @ApiPropertyOptional({ description: 'Patents only — office and application number' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  patentOffice?: string;
}

export class UpsertLanguageDto {
  @ApiPropertyOptional({ description: 'Omit to create a new entry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriberLanguageId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  languageName!: string;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES, description: '1 = Beginner, 2 = Proficient, 3 = Expert' })
  @IsIn(LANGUAGE_PROFICIENCIES)
  proficiencyId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canWrite?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canSpeak?: boolean;
}

export class CreateSavedSearchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;

  @ApiPropertyOptional({ description: 'Arbitrary filter object, stored as JSON' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

/* ------------------------------------------------------------------------- *
 * Referrals & privacy
 * ------------------------------------------------------------------------- */

/** One "Refer a Friend" invite. Either an email or a mobile is enough to send it. */
export class CreateReferralDto {
  @ApiProperty({ example: 'Priya Mehta' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'priya.m@email.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  mobile?: string;
}

/** Privacy toggles on the Account Settings screen. Both are optional so one can be saved alone. */
export class UpdatePrivacyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCurrentEmployer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowRecruiterMessages?: boolean;
}
