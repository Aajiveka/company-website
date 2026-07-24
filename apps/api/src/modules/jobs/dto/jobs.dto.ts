import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class JobSearchQueryDto {
  @ApiPropertyOptional({ description: 'Designation / role (tblMstrDesignation.Descr)' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ description: 'Industry (tblMstrIndustryType.IndustryType)' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'City (tblMstrCily.Descr)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Work mode (tblMstrWorkMode.Descr)' })
  @IsOptional()
  @IsString()
  workMode?: string;

  @ApiPropertyOptional({ description: 'Employment type (tblMstrEmpType.Descr)' })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({ description: 'Minimum experience (years)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minExp?: number;

  @ApiPropertyOptional({ description: 'Maximum experience (years)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxExp?: number;

  @ApiPropertyOptional({ description: 'Minimum CTC floor (rupees)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minCtc?: number;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['newest', 'salary_high', 'salary_low'] })
  @IsOptional()
  @IsIn(['newest', 'salary_high', 'salary_low'])
  sortBy?: 'newest' | 'salary_high' | 'salary_low';

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
