import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../notifications.types';

export class NotificationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter unread only (1 = unread only)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unread?: number;
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user ID' })
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'Deep-link path' })
  @IsOptional()
  @IsString()
  link?: string;
}
