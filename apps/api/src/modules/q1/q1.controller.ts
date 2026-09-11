import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { Q1Service } from './q1.service';
import { Q1AnalyticsService } from './q1-analytics.service';
import {
  ContactCandidateDto,
  QueueQueryDto,
  SetAllChecklistDto,
  UpdateChecklistDto,
  UpdateScreeningStatusDto,
} from './dto/q1.dto';

/**
 * Q1's screening workspace (Figma "Q1 Flow").
 *
 * QC1 and Admin only — deliberately narrower than /recruitment, which is shared with QC2.
 * Every screen in the Q1 designs is Q1's alone, and the mirror-image bug fixed in 2eb4db7
 * (a client guard wider than the server's) is avoided by keeping both at QC1 + Admin.
 */
@ApiTags('q1')
@ApiBearerAuth()
@Controller('q1')
@Roles(Role.QC1, Role.Admin)
export class Q1Controller {
  constructor(
    private readonly q1: Q1Service,
    private readonly analytics: Q1AnalyticsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'The five dashboard cards' })
  stats() {
    return this.q1.stats();
  }

  @Get('nav-counts')
  @ApiOperation({ summary: 'Sidebar badge counts' })
  navCounts() {
    return this.q1.navCounts();
  }

  @Get('candidates')
  @ApiOperation({ summary: 'Candidate Queue — tab, search, filters, pagination' })
  queue(@Query() query: QueueQueryDto) {
    return this.q1.queue(query);
  }

  @Get('candidates/:id')
  @ApiOperation({ summary: 'Candidate Profile. Opening a New candidate starts screening.' })
  profile(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.q1.profile(id, user.userId);
  }

  @Get('candidates/:id/contact-log')
  @ApiOperation({ summary: 'Contact history for one candidate' })
  contactLog(@Param('id', ParseIntPipe) id: number) {
    return this.q1.contactLog(id);
  }

  @Patch('candidates/:id/checklist')
  @ApiOperation({ summary: 'Toggle one Q1 Initial Screening checklist item' })
  setChecklistItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChecklistDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.setChecklistItem(id, dto, user.userId);
  }

  @Patch('candidates/:id/checklist/all')
  @ApiOperation({ summary: 'Select all / clear all' })
  setAllChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetAllChecklistDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.setAllChecklist(id, dto, user.userId);
  }

  @Post('candidates/:id/verify')
  @ApiOperation({ summary: 'Mark as Verified' })
  verify(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.q1.verify(id, user.userId);
  }

  @Post('candidates/:id/contact')
  @ApiOperation({ summary: 'Contact Candidate' })
  contact(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ContactCandidateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.contact(id, dto, 'Contact', user.userId);
  }

  @Post('candidates/:id/request-update')
  @ApiOperation({ summary: 'Request Profile Update' })
  requestUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ContactCandidateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.contact(id, dto, 'ProfileUpdateRequest', user.userId);
  }

  @Post('candidates/:id/request-cv')
  @ApiOperation({ summary: 'Request CV' })
  requestCv(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ContactCandidateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.contact(id, dto, 'CvRequest', user.userId);
  }

  @Post('candidates/:id/status')
  @ApiOperation({ summary: 'Save & Update Status — Follow-up, No Response or Not Interested' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScreeningStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q1.updateStatus(id, dto, user.userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Analytics & Reports' })
  analyticsOverview() {
    return this.analytics.overview();
  }
}
