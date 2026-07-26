import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { CandidatesService } from './candidates.service';
import {
  ChangePasswordDto,
  CreateJobAlertDto,
  CreateSavedSearchDto,
  UpdateNotificationPrefsDto,
  UpdatePersonalDto,
  UpdateProfessionalDto,
  UpsertCertificateDto,
  UpsertEducationDto,
  UpsertEmploymentDto,
} from './dto/candidates.dto';

@ApiTags('candidates')
@ApiBearerAuth()
@Controller('candidates')
@Roles(Role.Subscriber)
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in candidate\'s CV (spSubscriberGetCVToDisplay)' })
  async profile(@CurrentUser() user: RequestUser) {
    return this.candidates.profile(await this.candidates.subscriberIdFor(user.userId));
  }

  @Get('me/cv-masters')
  @ApiOperation({ summary: 'id-backed lookup lists for the CV editor' })
  cvMasters() {
    return this.candidates.cvMasters();
  }

  @Get('me/cv-edit')
  @ApiOperation({ summary: 'The candidate\'s CV in edit-friendly shape (raw ids, not display strings)' })
  async editProfile(@CurrentUser() user: RequestUser) {
    return this.candidates.editProfile(await this.candidates.subscriberIdFor(user.userId));
  }

  @Put('me/personal')
  @ApiOperation({ summary: 'Save personal details (spSubscriberCVUpdate_Personal)' })
  async updatePersonal(@CurrentUser() user: RequestUser, @Body() dto: UpdatePersonalDto) {
    return this.candidates.updatePersonal(user.userId, await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Put('me/professional')
  @ApiOperation({ summary: 'Save professional details (spSubscriberCVUpdate_Professional)' })
  async updateProfessional(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfessionalDto) {
    return this.candidates.updateProfessional(user.userId, await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Put('me/education')
  @ApiOperation({ summary: 'Create or update one education entry (spSubscriberCVUpdate_Education)' })
  async upsertEducation(@CurrentUser() user: RequestUser, @Body() dto: UpsertEducationDto) {
    return this.candidates.upsertEducation(user.userId, await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Delete('me/education/:id')
  @ApiOperation({ summary: 'Remove an education entry' })
  async deleteEducation(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.candidates.deleteEducation(await this.candidates.subscriberIdFor(user.userId), id);
  }

  @Put('me/employment')
  @ApiOperation({ summary: 'Create or update one employment entry' })
  async upsertEmployment(@CurrentUser() user: RequestUser, @Body() dto: UpsertEmploymentDto) {
    return this.candidates.upsertEmployment(user.userId, await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Delete('me/employment/:id')
  @ApiOperation({ summary: 'Remove an employment entry' })
  async deleteEmployment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.candidates.deleteEmployment(await this.candidates.subscriberIdFor(user.userId), id);
  }

  @Put('me/certificates')
  @ApiOperation({ summary: 'Create or update one certificate entry' })
  async upsertCertificate(@CurrentUser() user: RequestUser, @Body() dto: UpsertCertificateDto) {
    return this.candidates.upsertCertificate(user.userId, await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Delete('me/certificates/:id')
  @ApiOperation({ summary: 'Remove a certificate entry' })
  async deleteCertificate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.candidates.deleteCertificate(await this.candidates.subscriberIdFor(user.userId), id);
  }

  @Get('me/applied-jobs')
  @ApiOperation({ summary: 'Jobs the candidate has applied to' })
  async appliedJobs(@CurrentUser() user: RequestUser) {
    return this.candidates.appliedJobs(await this.candidates.subscriberIdFor(user.userId));
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'Documents mapped to the candidate and their upload status' })
  async documents(@CurrentUser() user: RequestUser) {
    return this.candidates.documents(await this.candidates.subscriberIdFor(user.userId));
  }

  @Post('me/documents/:documentTypeId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a requested document (candidate-doc.aspx)' })
  async uploadDocument(
    @Param('documentTypeId', ParseIntPipe) documentTypeId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    const subscriberId = await this.candidates.subscriberIdFor(user.userId);
    return this.candidates.uploadDocument(user.userId, subscriberId, documentTypeId, file);
  }

  @Get('me/job-alerts')
  @ApiOperation({ summary: 'Saved job alerts (new table — no legacy equivalent)' })
  async jobAlerts(@CurrentUser() user: RequestUser) {
    return this.candidates.jobAlerts(await this.candidates.subscriberIdFor(user.userId));
  }

  @Post('me/job-alerts')
  @ApiOperation({ summary: 'Create a job alert' })
  async createJobAlert(@CurrentUser() user: RequestUser, @Body() dto: CreateJobAlertDto) {
    return this.candidates.createJobAlert(await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Get('me/saved-jobs')
  @ApiOperation({ summary: 'Saved / bookmarked jobs' })
  async savedJobs(@CurrentUser() user: RequestUser) {
    return this.candidates.savedJobs(await this.candidates.subscriberIdFor(user.userId));
  }

  @Get('me/saved-job-ids')
  @ApiOperation({ summary: 'Just the job IDs the candidate has saved (for bookmark icons)' })
  async savedJobIds(@CurrentUser() user: RequestUser) {
    return this.candidates.savedJobIds(await this.candidates.subscriberIdFor(user.userId));
  }

  @Post('me/saved-jobs/:jobId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save / bookmark a job' })
  async saveJob(@Param('jobId', ParseIntPipe) jobId: number, @CurrentUser() user: RequestUser) {
    return this.candidates.saveJob(await this.candidates.subscriberIdFor(user.userId), jobId);
  }

  @Delete('me/saved-jobs/:jobId')
  @ApiOperation({ summary: 'Remove a saved job bookmark' })
  async unsaveJob(@Param('jobId', ParseIntPipe) jobId: number, @CurrentUser() user: RequestUser) {
    return this.candidates.unsaveJob(await this.candidates.subscriberIdFor(user.userId), jobId);
  }

  @Post('me/change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password (verified against the Argon2 hash)' })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.candidates.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NEW ENDPOINTS
  // ────────────────────────────────────────────────────────────────────────────

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Dashboard summary (applied, saved, interview counts, profile completion)' })
  async dashboard(@CurrentUser() user: RequestUser) {
    return this.candidates.dashboard(await this.candidates.subscriberIdFor(user.userId));
  }

  @Get('me/notification-prefs')
  @ApiOperation({ summary: 'Get notification preferences' })
  async notificationPrefs(@CurrentUser() user: RequestUser) {
    return this.candidates.notificationPrefs(await this.candidates.subscriberIdFor(user.userId));
  }

  @Put('me/notification-prefs')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPrefs(@CurrentUser() user: RequestUser, @Body() dto: UpdateNotificationPrefsDto) {
    return this.candidates.updateNotificationPrefs(await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Get('me/saved-searches')
  @ApiOperation({ summary: 'List saved searches' })
  async savedSearches(@CurrentUser() user: RequestUser) {
    return this.candidates.savedSearches(await this.candidates.subscriberIdFor(user.userId));
  }

  @Post('me/saved-searches')
  @ApiOperation({ summary: 'Create a saved search' })
  async createSavedSearch(@CurrentUser() user: RequestUser, @Body() dto: CreateSavedSearchDto) {
    return this.candidates.createSavedSearch(await this.candidates.subscriberIdFor(user.userId), dto);
  }

  @Delete('me/saved-searches/:id')
  @ApiOperation({ summary: 'Delete a saved search' })
  async deleteSavedSearch(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.candidates.deleteSavedSearch(await this.candidates.subscriberIdFor(user.userId), id);
  }

  @Get('me/recommendations')
  @ApiOperation({ summary: 'Recommended jobs based on candidate profile' })
  async recommendations(@CurrentUser() user: RequestUser) {
    return this.candidates.recommendations(await this.candidates.subscriberIdFor(user.userId));
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Activity timeline (audit log + recent applications)' })
  async activity(@CurrentUser() user: RequestUser) {
    return this.candidates.activity(user.userId, await this.candidates.subscriberIdFor(user.userId));
  }
}
