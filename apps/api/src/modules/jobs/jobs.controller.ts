import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { JobsService } from './jobs.service';
import { JobSearchQueryDto, FullTextSearchQueryDto, SuggestionsQueryDto } from './dto/jobs.dto';

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
  @Get('search')
  @ApiOperation({ summary: 'Full-text search across jobs with ranking' })
  fullTextSearch(@Query() query: FullTextSearchQueryDto) {
    return this.jobs.fullTextSearch(query);
  }

  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Autocomplete suggestions for job search' })
  suggestions(@Query() query: SuggestionsQueryDto) {
    return this.jobs.suggestions(query);
  }

  @Get('recommended')
  @Roles(Role.Subscriber)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommended jobs for the signed-in candidate' })
  recommended(@CurrentUser() user: RequestUser) {
    return this.jobs.recommended(user.userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search public job openings' })
  search(@Query() query: JobSearchQueryDto) {
    return this.jobs.search(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'A single public job listing' })
  byId(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.byId(id);
  }

  @Post(':id/apply')
  @Roles(Role.Subscriber)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to a job as the signed-in candidate' })
  apply(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.jobs.apply(user.userId, id);
  }
}
