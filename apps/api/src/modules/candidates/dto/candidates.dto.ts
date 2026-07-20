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
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

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
