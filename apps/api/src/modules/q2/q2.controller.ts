import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { Q2Service } from './q2.service';
import { Q2AnalyticsService } from './q2-analytics.service';
import {
  ApplicantsQueryDto,
  DecisionDto,
  JobApplicantsQueryDto,
  JobsQueryDto,
  UpdateCriterionDto,
} from './dto/q2.dto';

/**
 * Q2's job-matching workspace (Figma "Q2" page).
 *
 * QC2 and Admin only, and the client guard on `/q2/*` is the same pair — the bug fixed in
 * 2eb4db7 was a client guard wider than the server's, so the two are kept identical here
 * rather than left to drift.
 */
@ApiTags('q2')
@ApiBearerAuth()
@Controller('q2')
@Roles(Role.QC2, Role.Admin)
export class Q2Controller {
  constructor(
    private readonly q2: Q2Service,
    private readonly analytics: Q2AnalyticsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'The five dashboard cards' })
  stats() {
    return this.q2.stats();
  }

  @Get('nav-counts')
  @ApiOperation({ summary: 'Sidebar badge counts' })
  navCounts() {
    return this.q2.navCounts();
  }

  @Get('sla')
  @ApiOperation({ summary: 'The Matching SLA card' })
  sla() {
    return this.q2.sla();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Employer Jobs — applicants shown job-wise' })
  jobs(@Query() query: JobsQueryDto, @CurrentUser() user: RequestUser) {
    return this.q2.jobs(query, user.userId);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Job Applicants — one job, ranked by JD match' })
  jobApplicants(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query() query: JobApplicantsQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q2.jobApplicants(jobId, query, user.userId);
  }

  @Get('applicants')
  @ApiOperation({ summary: 'All Applicants, Forwarded to Q3 and Sent back to Q1' })
  applicants(@Query() query: ApplicantsQueryDto, @CurrentUser() user: RequestUser) {
    return this.q2.applicants(query, user.userId);
  }

  @Get('applications/:mapId')
  @ApiOperation({ summary: 'Applicant detail — candidate, JD, scoring and coverage' })
  application(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.q2.application(mapId, user.userId);
  }

  @Patch('applications/:mapId/criteria')
  @ApiOperation({ summary: 'Tick one criterion to include in the match' })
  setCriterion(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: UpdateCriterionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q2.setCriterion(mapId, dto, user.userId);
  }

  @Post('applications/:mapId/forward')
  @ApiOperation({ summary: 'Forward to Q3 — creates the CV referral' })
  forward(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: DecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q2.forward(mapId, dto, user.userId);
  }

  @Post('applications/:mapId/send-back')
  @ApiOperation({ summary: 'Send back to Q1' })
  sendBack(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: DecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q2.sendBack(mapId, dto, user.userId);
  }

  @Post('applications/:mapId/reject')
  @ApiOperation({ summary: 'Reject the application' })
  reject(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: DecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.q2.reject(mapId, dto, user.userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Match Analytics' })
  analyticsOverview() {
    return this.analytics.overview();
  }
}
