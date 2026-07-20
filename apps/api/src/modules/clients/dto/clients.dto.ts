import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrSkills.SkillID' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
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

  @ApiPropertyOptional({ type: [Number], description: 'tblMstrSkills.SkillID' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
}

export class ApplicantDecisionDto {
  @ApiProperty({ enum: ['Shortlisted', 'Rejected'] })
  @IsIn(['Shortlisted', 'Rejected'])
  decision!: 'Shortlisted' | 'Rejected';
}
