import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { RecruitmentService } from './recruitment.service';
import {
  ApproveRejectCandidateDto,
  AssignDocumentsDto,
  AssignJobDto,
  CandidatesQueryDto,
  ReviewDocumentDto,
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
} from './dto/recruitment.dto';

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

  @Get('interviews/eligible')
  @ApiOperation({ summary: 'Mapped applications with no interview yet — the schedule-interview picker' })
  eligibleForInterview() {
    return this.recruitment.eligibleForInterview();
  }

  @Get('interview-modes')
  @ApiOperation({ summary: 'Interview mode master list (tblMstrInterviewMode)' })
  interviewModes() {
    return this.recruitment.interviewModes();
  }

  @Post('interviews')
  @ApiOperation({ summary: 'Schedule an interview (schedule-Interview.aspx)' })
  scheduleInterview(@CurrentUser() user: RequestUser, @Body() dto: ScheduleInterviewDto) {
    return this.recruitment.scheduleInterview(user.userId, dto);
  }

  @Post('interviews/:id/status')
  @ApiOperation({ summary: 'Mark an interview Completed or Cancelled (Interview-status.aspx)' })
  updateInterviewStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateInterviewStatusDto,
  ) {
    return this.recruitment.updateInterviewStatus(user.userId, id, dto);
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

  @Post('candidates/:id/decision')
  @Roles(Role.QC1, Role.Admin)
  @ApiOperation({ summary: 'Approve or reject a candidate registration (spQC1ApproveRejectCandidate)' })
  decide(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ApproveRejectCandidateDto,
  ) {
    return this.recruitment.decideCandidate(user.userId, id, dto.decision);
  }

  @Post('candidates/:id/assign-job')
  @ApiOperation({ summary: 'Assign a candidate to a job (assign-job.aspx)' })
  assignJob(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignJobDto,
  ) {
    return this.recruitment.assignToJob(user.userId, id, dto.jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Active jobs, for the assign-job picker' })
  activeJobs() {
    return this.recruitment.activeJobs();
  }

  @Get('document-types')
  @Roles(Role.QC1, Role.QC2, Role.Admin)
  @ApiOperation({ summary: 'Candidate-uploadable document types (tblMstrDocuments)' })
  documentTypes() {
    return this.recruitment.documentTypes();
  }

  @Post('candidates/:id/documents')
  @Roles(Role.QC2, Role.Admin)
  @ApiOperation({ summary: 'Assign required documents to a candidate (mark-documents.aspx)' })
  assignDocuments(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: AssignDocumentsDto,
  ) {
    return this.recruitment.assignDocuments(user.userId, id, dto.documentTypeIds);
  }
}
