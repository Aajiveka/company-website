import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { JobsService } from './jobs.service';
import { JobSearchQueryDto } from './dto/jobs.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get('filters')
  @ApiOperation({ summary: 'Master lists for the public job search' })
  filters() {
    return this.jobs.filters();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search public job openings' })
  search(@Query() query: JobSearchQueryDto) {
    return this.jobs.search(query);
  }
}
