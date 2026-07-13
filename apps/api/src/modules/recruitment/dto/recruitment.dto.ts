import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
