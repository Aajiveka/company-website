import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { RecruitmentService } from './recruitment.service';
import { ScoringService } from './scoring.service';
import { CvReferralService } from './cv-referral.service';
import { InterviewRoundService } from './interview-round.service';
import { OfferLetterService } from './offer-letter.service';
import {
  ApproveRejectCandidateDto,
  AssignDocumentsDto,
  AssignJobDto,
  CandidatesQueryDto,
  CreateInterviewRoundDto,
  CreateOfferDto,
  ForwardToCompanyDto,
  ReferToQ3Dto,
  RespondToOfferDto,
  ReviewDocumentDto,
  ScheduleInterviewDto,
  SelectSlotDto,
  SubmitRoundResultDto,
  UpdateInterviewStatusDto,
  UpdatePipelineDto,
} from './dto/recruitment.dto';

@ApiTags('recruitment')
@ApiBearerAuth()
@Controller('recruitment')
@Roles(Role.QC1, Role.QC2, Role.Admin)
export class RecruitmentController {
  constructor(
    private readonly recruitment: RecruitmentService,
    private readonly scoring: ScoringService,
    private readonly referrals: CvReferralService,
    private readonly rounds: InterviewRoundService,
    private readonly offers: OfferLetterService,
  ) {}

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
    return this.recruitment.decideCandidate(user.userId, id, dto.decision, dto.reason);
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

  @Patch('pipeline/:id')
  @ApiOperation({ summary: 'Update pipeline stage for an application' })
  updatePipeline(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.recruitment.updatePipelineStage(user.userId, id, dto);
  }

  @Post('applications/:id/score')
  @Roles(Role.QC1, Role.Admin)
  @ApiOperation({ summary: 'Compute match score for a candidate–job application' })
  scoreApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.scoring.scoreApplication(id, user.userId);
  }

  // ── CV Referral pipeline (Q2 → Q3 → Company) ──────────────────────────

  @Post('referrals')
  @Roles(Role.QC2, Role.Admin)
  @ApiOperation({ summary: 'Q2 refers candidate-job mappings to Q3' })
  referToQ3(@CurrentUser() user: RequestUser, @Body() dto: ReferToQ3Dto) {
    return this.referrals.referToQ3(dto.jobSubscriberMapIds, user.userId);
  }

  @Get('referrals')
  @Roles(Role.QC2, Role.Q3, Role.Admin)
  @ApiOperation({ summary: 'List CV referrals (Q2 sees own, Q3 sees all)' })
  listReferrals(@Query('status') status?: string) {
    return this.referrals.listReferrals(status ? { status } : undefined);
  }

  @Post('referrals/forward')
  @Roles(Role.Q3, Role.Admin)
  @ApiOperation({ summary: 'Q3 validates and forwards CVs to the company (14-day expiry)' })
  forwardToCompany(@CurrentUser() user: RequestUser, @Body() dto: ForwardToCompanyDto) {
    return this.referrals.forwardToCompany(dto.referralIds, user.userId);
  }

  // ── Multi-round interview management ──────────────────────────────────

  @Post('interview-rounds')
  @Roles(Role.Q3, Role.Client, Role.Admin)
  @ApiOperation({ summary: 'Create an interview round with optional slot offers' })
  createRound(@CurrentUser() user: RequestUser, @Body() dto: CreateInterviewRoundDto) {
    return this.rounds.createRound({ ...dto, userId: user.userId });
  }

  @Get('interview-rounds/:mapId')
  @Roles(Role.QC2, Role.Q3, Role.Client, Role.Subscriber, Role.Admin)
  @ApiOperation({ summary: 'List interview rounds for a job-subscriber mapping' })
  listRounds(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.rounds.listRounds(mapId);
  }

  @Post('interview-rounds/:roundId/select-slot')
  @Roles(Role.Subscriber, Role.Q3, Role.Admin)
  @ApiOperation({ summary: 'Candidate selects a time slot for an interview round' })
  selectSlot(
    @Param('roundId', ParseIntPipe) roundId: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: SelectSlotDto,
  ) {
    return this.rounds.selectSlot(roundId, dto.slotId, user.userId);
  }

  @Post('interview-rounds/:roundId/result')
  @Roles(Role.Q3, Role.Client, Role.Admin)
  @ApiOperation({ summary: 'Submit interview round result (Passed/Failed/Hold)' })
  submitRoundResult(
    @Param('roundId', ParseIntPipe) roundId: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: SubmitRoundResultDto,
  ) {
    return this.rounds.submitResult(roundId, dto.result, user.userId, dto.feedback);
  }

  // ── Offer letter management ─────────────────────────────────────────

  @Post('offers')
  @Roles(Role.Q3, Role.Client, Role.Admin)
  @ApiOperation({ summary: 'Create a draft offer letter' })
  createOffer(@CurrentUser() user: RequestUser, @Body() dto: CreateOfferDto) {
    return this.offers.createOffer({ ...dto, userId: user.userId });
  }

  @Post('offers/:id/send')
  @Roles(Role.Q3, Role.Client, Role.Admin)
  @ApiOperation({ summary: 'Send an offer letter to the candidate' })
  sendOffer(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.offers.sendOffer(id, user.userId);
  }

  @Post('offers/:id/respond')
  @Roles(Role.Subscriber, Role.Admin)
  @ApiOperation({ summary: 'Candidate accepts or rejects an offer' })
  respondToOffer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RespondToOfferDto,
  ) {
    return this.offers.respondToOffer(id, dto.accept, user.userId);
  }

  @Get('offers/:mapId')
  @Roles(Role.QC2, Role.Q3, Role.Client, Role.Subscriber, Role.Admin)
  @ApiOperation({ summary: 'Get offer letter for a job-subscriber mapping' })
  getOffer(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.offers.getOffer(mapId);
  }
}
