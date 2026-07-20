import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { ClientsService } from './clients.service';
import { ApplicantDecisionDto, CreateJobDto, UpdateJobDto } from './dto/clients.dto';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
@Roles(Role.Client, Role.Admin)
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in employer’s company (spClientGetCompanyInfo)' })
  profile(@CurrentUser() user: RequestUser) {
    return this.clients.profile(user.userId);
  }

  @Get('me/jobs')
  @ApiOperation({ summary: 'The company’s job openings (spClientGetJoblisting)' })
  jobs(@CurrentUser() user: RequestUser) {
    return this.clients.jobs(user.userId);
  }

  @Post('me/jobs')
  @ApiOperation({ summary: 'Post a job (spClientManageJob — but transactional)' })
  createJob(@CurrentUser() user: RequestUser, @Body() dto: CreateJobDto) {
    return this.clients.createJob(user.userId, dto);
  }

  @Get('me/applicants')
  @ApiOperation({ summary: 'Candidates who applied to the company’s jobs' })
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
}
