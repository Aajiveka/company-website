import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { CandidatesService } from './candidates.service';
import { ChangePasswordDto, CreateJobAlertDto } from './dto/candidates.dto';

@ApiTags('candidates')
@ApiBearerAuth()
@Controller('candidates')
@Roles(Role.Subscriber)
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get('me')
  @ApiOperation({ summary: 'The signed-in candidate’s CV (spSubscriberGetCVToDisplay)' })
  async profile(@CurrentUser() user: RequestUser) {
    return this.candidates.profile(await this.candidates.subscriberIdFor(user.userId));
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

  @Post('me/change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password (verified against the Argon2 hash)' })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.candidates.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }
}
