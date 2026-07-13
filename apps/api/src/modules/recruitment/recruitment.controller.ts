import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { RecruitmentService } from './recruitment.service';
import { CandidatesQueryDto, ReviewDocumentDto } from './dto/recruitment.dto';

@ApiTags('recruitment')
@ApiBearerAuth()
@Controller('recruitment')
@Roles(Role.QC1, Role.QC2, Role.Admin)
export class RecruitmentController {
  constructor(private readonly recruitment: RecruitmentService) {}

  @Get('candidates')
  @ApiOperation({ summary: 'Paginated candidate listing (spSubscriberGetSubscriberForListing)' })
  candidates(@Query() query: CandidatesQueryDto) {
    return this.recruitment.candidateList(query);
  }

  @Get('candidates/:id')
  @ApiOperation({ summary: 'A single candidate’s CV' })
  candidate(@Param('id', ParseIntPipe) id: number) {
    return this.recruitment.candidateDetail(id);
  }

  @Get('qc1/stats')
  @Roles(Role.QC1, Role.Admin)
  @ApiOperation({ summary: 'QC1 completeness dashboard (spQC1GetDashboardData)' })
  qc1Stats() {
    return this.recruitment.qc1Stats();
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Scheduled interviews' })
  interviews() {
    return this.recruitment.interviews();
  }

  @Get('documents')
  @ApiOperation({ summary: 'Uploaded documents awaiting review (spQC2GetMappedDocuments)' })
  documents() {
    return this.recruitment.documentReviews();
  }

  @Post('documents/review')
  @ApiOperation({ summary: 'Approve or reject a document (spClientUpdateMapDocumentStatus)' })
  review(@CurrentUser() user: RequestUser, @Body() dto: ReviewDocumentDto) {
    return this.recruitment.reviewDocument(user.userId, dto);
  }
}
