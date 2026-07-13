import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { ClientsService } from './clients.service';
import { CreateJobDto } from './dto/clients.dto';

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
}
