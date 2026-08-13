import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { EmployersService } from './employers.service';
import {
  ApplicantDecisionDto,
  ApplicantNoteDto,
  CreateJobDto,
  ListJobsQueryDto,
  SetJobStatusDto,
  UpdateBrandingDto,
  UpdateJobDto,
} from './dto/employers.dto';

/** ?draft=true|1 → true; ?draft=false|0 → false; omitted → undefined (leave status alone on update). */
function parseDraftQuery(draft?: string): boolean | undefined {
  if (draft == null || draft === '') return undefined;
  const v = draft.toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
}
@ApiTags('employers')
@ApiBearerAuth()
@Controller('clients')
@Roles(Role.Client, Role.Admin)
export class EmployersController {
  constructor(private readonly clients: EmployersService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in employer\u2019s company (spClientGetCompanyInfo)' })
  profile(@CurrentUser() user: RequestUser) {
    return this.clients.profile(user.userId);
  }

  @Get('me/jobs')
  @ApiOperation({ summary: 'The company\u2019s job openings (paginated + filters)' })
  jobs(@CurrentUser() user: RequestUser, @Query() query: ListJobsQueryDto) {
    return this.clients.jobs(user.userId, query);
  }

  @Post('me/jobs')
  @ApiOperation({ summary: 'Post a job (spClientManageJob \u2014 but transactional). Pass ?draft=true to save as Draft.' })
  createJob(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateJobDto,
    @Query('draft') draft?: string,
  ) {
    return this.clients.createJob(user.userId, dto, parseDraftQuery(draft));
  }

  @Get('me/applicants')
  @ApiOperation({ summary: 'Candidates who applied to the company\u2019s jobs' })
  applicants(@CurrentUser() user: RequestUser) {
    return this.clients.applicants(user.userId);
  }

  @Get('masters')
  @ApiOperation({ summary: 'id-backed lookup lists for the job post/edit form' })
  masters() {
    return this.clients.masters();
  }

  @Patch('me/jobs/:id')
  @ApiOperation({
    summary: 'Edit a job posting. Pass ?draft=true to keep/set Draft, ?draft=false to publish Active.',
  })
  updateJob(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateJobDto,
    @Query('draft') draft?: string,
  ) {
    return this.clients.updateJob(user.userId, id, dto, parseDraftQuery(draft));
  }

  @Post('me/jobs/:id/deactivate')
  @ApiOperation({ summary: 'Close a job posting (spClientMarkJobInactive)' })
  deactivateJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.deactivateJob(user.userId, id);
  }

  @Get('me/jobs/:id')
  @ApiOperation({ summary: 'Get one company job (view)' })
  getJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.getJob(user.userId, id);
  }

  @Post('me/jobs/:id/status')
  @ApiOperation({ summary: 'Set job status Active / Closed / Archived' })
  setJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: SetJobStatusDto,
  ) {
    return this.clients.setJobStatus(user.userId, id, dto.status);
  }

  @Post('me/jobs/:id/archive')
  @ApiOperation({ summary: 'Archive a job posting' })
  archiveJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.archiveJob(user.userId, id);
  }

  @Post('me/jobs/:id/activate')
  @ApiOperation({ summary: 'Activate (re-open) a job posting' })
  activateJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.activateJob(user.userId, id);
  }

  @Delete('me/jobs/:id')
  @ApiOperation({ summary: 'Delete a job with no applicants' })
  deleteJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.deleteJob(user.userId, id);
  }

  @Post('me/applicants/:jobSubscriberMapId/decision')
  @ApiOperation({ summary: 'Shortlist or reject an applicant (spClientShortListRejectSubscriber)' })
  decideApplicant(
    @Param('jobSubscriberMapId', ParseIntPipe) jobSubscriberMapId: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ApplicantDecisionDto,
  ) {
    return this.clients.decideApplicant(user.userId, jobSubscriberMapId, dto);
  }

  // ---------------------------------------------------------------------------
  // New endpoints
  // ---------------------------------------------------------------------------

  @Post('me/jobs/:jobId/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing job posting' })
  duplicateJob(
    @Param('jobId', ParseIntPipe) jobId: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.clients.duplicateJob(user.userId, jobId);
  }

  @Post('me/jobs/bulk-upload')
  @ApiOperation({ summary: 'Bulk upload jobs from a CSV file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  bulkUploadJobs(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clients.bulkUploadJobs(user.userId, file);
  }

  @Get('me/analytics')
  @ApiOperation({ summary: 'Company analytics — job counts and pipeline funnel' })
  analytics(@CurrentUser() user: RequestUser) {
    return this.clients.analytics(user.userId);
  }

  @Get('me/branding')
  @ApiOperation({ summary: 'Get company branding data' })
  getBranding(@CurrentUser() user: RequestUser) {
    return this.clients.getBranding(user.userId);
  }

  @Patch('me/branding')
  @ApiOperation({ summary: 'Update company branding data' })
  updateBranding(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.clients.updateBranding(user.userId, dto);
  }

  @Get('me/applicants/:id/notes')
  @ApiOperation({ summary: 'Get notes on an applicant' })
  getApplicantNotes(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.clients.getApplicantNotes(user.userId, id);
  }

  @Put('me/applicants/:id/notes')
  @ApiOperation({ summary: 'Save a note on an applicant' })
  saveApplicantNote(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ApplicantNoteDto,
  ) {
    return this.clients.saveApplicantNote(user.userId, id, dto);
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({ summary: 'Public company page — no auth required' })
  publicCompanyInfo(@Param('id', ParseIntPipe) id: number) {
    return this.clients.publicCompanyInfo(id);
  }
}
