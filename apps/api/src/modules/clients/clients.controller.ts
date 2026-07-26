import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { ClientsService } from './clients.service';
import { ApplicantDecisionDto, ApplicantNoteDto, CreateJobDto, UpdateBrandingDto, UpdateJobDto } from './dto/clients.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
@Roles(Role.Client, Role.Admin)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in employer\u2019s company (spClientGetCompanyInfo)' })
  profile(@CurrentUser() user: RequestUser) {
    return this.clients.profile(user.userId);
  }

  @Get('me/jobs')
  @ApiOperation({ summary: 'The company\u2019s job openings (spClientGetJoblisting)' })
  jobs(@CurrentUser() user: RequestUser) {
    return this.clients.jobs(user.userId);
  }

  @Post('me/jobs')
  @ApiOperation({ summary: 'Post a job (spClientManageJob \u2014 but transactional)' })
  createJob(@CurrentUser() user: RequestUser, @Body() dto: CreateJobDto) {
    return this.clients.createJob(user.userId, dto);
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
  @ApiOperation({ summary: 'Edit a job posting' })
  updateJob(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateJobDto,
  ) {
    return this.clients.updateJob(user.userId, id, dto);
  }

  @Post('me/jobs/:id/deactivate')
  @ApiOperation({ summary: 'Close a job posting (spClientMarkJobInactive)' })
  deactivateJob(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.clients.deactivateJob(user.userId, id);
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
