import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

  @ApiPropertyOptional({ description: 'Maximum CTC ceiling (rupees)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCtc?: number;

  @ApiPropertyOptional({ description: 'Multiple work modes (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  workModes?: string[];

  @ApiPropertyOptional({ description: 'Multiple employment types (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional({ description: 'Multiple cities (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({ description: 'Multiple states (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ description: 'Skills filter (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Posted within period', enum: ['24h', '7d', '30d'] })
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  postedWithin?: '24h' | '7d' | '30d';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['newest', 'salary_high', 'salary_low', 'relevance'] })
  @IsOptional()
  @IsIn(['newest', 'salary_high', 'salary_low', 'relevance'])
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'relevance';

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

export class FullTextSearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query string' })
  @IsOptional()
  @IsString()
  q?: string;

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

  // All the same filter fields
  @ApiPropertyOptional({ description: 'Minimum CTC floor (rupees)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minCtc?: number;

  @ApiPropertyOptional({ description: 'Maximum CTC ceiling (rupees)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCtc?: number;

  @ApiPropertyOptional({ description: 'Multiple work modes (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  workModes?: string[];

  @ApiPropertyOptional({ description: 'Multiple employment types (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional({ description: 'Multiple cities (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({ description: 'Skills filter (comma-separated)', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

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

  @ApiPropertyOptional({ description: 'Posted within period', enum: ['24h', '7d', '30d'] })
  @IsOptional()
  @IsIn(['24h', '7d', '30d'])
  postedWithin?: '24h' | '7d' | '30d';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['newest', 'salary_high', 'salary_low', 'relevance'] })
  @IsOptional()
  @IsIn(['newest', 'salary_high', 'salary_low', 'relevance'])
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'relevance';
}

export class SuggestionsQueryDto {
  @ApiPropertyOptional({ description: 'Autocomplete query string' })
  @IsOptional()
  @IsString()
  q?: string;
}
