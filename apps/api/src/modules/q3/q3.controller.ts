import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import type { HiringStage } from '@/shared/hiring';
import { Q3ReadService } from './q3-read.service';
import { Q3ReferralsService } from './q3-referrals.service';
import { Q3InterviewsService } from './q3-interviews.service';
import { Q3DocumentsService } from './q3-documents.service';
import {
  COMPANY_REVIEW_TABS,
  ChecklistDto,
  ConfirmSlotDto,
  ContactDto,
  DecisionDto,
  DocumentRequestDto,
  ForwardDto,
  InterviewsQueryDto,
  OfferDto,
  PipelineQueryDto,
  RETURNED_TABS,
  ReturnDto,
  RoundSetupDto,
  SendBackDto,
  type CompanyReviewTab,
  type ReturnedTab,
} from './dto/q3.dto';

/** Which stages each detail screen's queue switcher walks through. */
const QUEUES: Record<string, HiringStage[]> = {
  scheduling: ['Scheduling'],
  decisions: ['Decision'],
  documents: ['Documents'],
  offers: ['Offer'],
};

/**
 * Q3's hiring-ops workspace (Figma "Q3" page).
 *
 * Q3 and Admin only, and the client guard on `/q3/*` is the same pair — a client guard wider
 * than the server's is the bug fixed in 2eb4db7, so the two are kept identical.
 */
@ApiTags('q3')
@ApiBearerAuth()
@Controller('q3')
@Roles(Role.Q3, Role.Admin)
export class Q3Controller {
  constructor(
    private readonly read: Q3ReadService,
    private readonly referrals: Q3ReferralsService,
    private readonly interviews: Q3InterviewsService,
    private readonly documents: Q3DocumentsService,
  ) {}

  // ── Shell + dashboard ──────────────────────────────────────────────────

  @Get('nav-counts')
  @ApiOperation({ summary: 'Sidebar badge counts' })
  navCounts() {
    return this.read.navCounts();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'KPI cards and Needs your action' })
  dashboard() {
    return this.read.dashboard();
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Candidate Pipeline — sorted by next due' })
  pipeline(@Query() q: PipelineQueryDto) {
    return this.read.pipeline(q);
  }

  @Get('report')
  @ApiOperation({ summary: 'Quarterly hiring report (?quarter=2026-Q3; defaults to this quarter)' })
  report(@Query('quarter') quarter?: string) {
    return this.read.report(quarter);
  }

  @Get('queues/:name')
  @ApiOperation({ summary: 'The applications one detail screen walks through' })
  queue(@Param('name') name: string) {
    return this.read.queue(QUEUES[name] ?? []);
  }

  // ── 02 · Referred CVs ──────────────────────────────────────────────────

  @Get('referrals')
  @ApiOperation({ summary: 'Referred CVs awaiting validation, by batch' })
  referred() {
    return this.referrals.referred();
  }

  @Post('referrals/forward')
  @HttpCode(200)
  @ApiOperation({ summary: 'Forward valid CVs to the company (starts the 14-day window)' })
  forward(@Body() dto: ForwardDto, @CurrentUser() user: RequestUser) {
    return this.referrals.forward(dto.referralIds, user.userId);
  }

  @Post('referrals/return')
  @HttpCode(200)
  @ApiOperation({ summary: 'Return CVs to Q2 with a reason' })
  returnToQ2(@Body() dto: ReturnDto, @CurrentUser() user: RequestUser) {
    return this.referrals.returnToQ2(dto, user.userId);
  }

  // ── 03 · Company Review ────────────────────────────────────────────────

  @Get('company-review')
  @ApiOperation({ summary: 'Review window tracker' })
  companyReview(@Query('tab', new DefaultValuePipe('all')) tab: string) {
    const t = (COMPANY_REVIEW_TABS as readonly string[]).includes(tab) ? (tab as CompanyReviewTab) : 'all';
    return this.referrals.companyReview(t);
  }

  @Post('company-review/remind-expiring')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remind every company whose CVs expire within 2 days' })
  remindExpiring(@CurrentUser() user: RequestUser) {
    return this.referrals.remindExpiring(user.userId);
  }

  @Get('applications/:mapId/shortlist')
  @ApiOperation({ summary: 'Shortlist received — the company\'s details for one CV' })
  shortlist(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.referrals.shortlist(mapId);
  }

  @Put('applications/:mapId/round-setup')
  @ApiOperation({ summary: 'Capture a shortlist, or a round\'s slots, interviewers and mode' })
  setupRound(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: RoundSetupDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.referrals.setupRound(mapId, dto, user.userId);
  }

  // ── 04 · Slot Scheduling ───────────────────────────────────────────────

  @Get('applications/:mapId/scheduling')
  @ApiOperation({ summary: 'Schedule Interview — slots, contact log, invite preview' })
  scheduling(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.scheduling(mapId, user.userId);
  }

  @Post('applications/:mapId/contact')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log a call, mail or message with the candidate' })
  contact(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: ContactDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.interviews.contact(mapId, dto, user.userId);
  }

  @Post('rounds/:roundId/slots/:slotId/availability')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark a company slot as unavailable for the candidate (or available again)' })
  slotAvailability(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Query('unavailable', new DefaultValuePipe(true), ParseBoolPipe) unavailable: boolean,
    @CurrentUser() user: RequestUser,
  ) {
    return this.interviews.setSlotUnavailable(roundId, slotId, unavailable, user.userId);
  }

  @Post('rounds/:roundId/request-slots')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask the company for fresh slots' })
  requestSlots(@Param('roundId', ParseIntPipe) roundId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.requestSlots(roundId, user.userId);
  }

  @Post('meeting-link')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate a meeting room link' })
  meetingLink() {
    return this.interviews.meetingLink();
  }

  @Post('rounds/:roundId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm the slot and send the invites' })
  confirm(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: ConfirmSlotDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.interviews.confirm(roundId, dto, user.userId);
  }

  // ── 04b · Interviews ───────────────────────────────────────────────────

  @Get('interviews')
  @ApiOperation({ summary: 'The week\'s interview schedule, KPIs and Up next' })
  interviewsWeek(@Query() q: InterviewsQueryDto) {
    return this.interviews.interviews(q.week);
  }

  @Post('rounds/:roundId/remind')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send the candidate a reminder' })
  remind(@Param('roundId', ParseIntPipe) roundId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.remind(roundId, user.userId);
  }

  @Post('rounds/:roundId/checklist')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tick a day-of checklist item' })
  checklist(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: ChecklistDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.interviews.checklist(roundId, dto, user.userId);
  }

  @Post('rounds/:roundId/reschedule')
  @HttpCode(200)
  @ApiOperation({ summary: 'Release the slot — a reschedule, or a no-show once the start has passed' })
  reschedule(@Param('roundId', ParseIntPipe) roundId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.reschedule(roundId, user.userId);
  }

  @Post('rounds/:roundId/conducted')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark the interview conducted' })
  conducted(@Param('roundId', ParseIntPipe) roundId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.conducted(roundId, user.userId);
  }

  // ── 05 · Interview Rounds ──────────────────────────────────────────────

  @Get('applications/:mapId/rounds')
  @ApiOperation({ summary: 'Interview Rounds — the stepper and round history' })
  rounds(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.interviews.rounds(mapId);
  }

  @Post('applications/:mapId/nudge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Chase the company for an overdue result' })
  nudge(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.nudge(mapId, user.userId);
  }

  @Post('rounds/:roundId/decision')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record the company decision for a round' })
  decide(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Body() dto: DecisionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.interviews.decide(roundId, dto, user.userId);
  }

  @Post('rounds/:roundId/decision-mail')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send the decision mail for a round that has not had one' })
  decisionMail(@Param('roundId', ParseIntPipe) roundId: number, @CurrentUser() user: RequestUser) {
    return this.interviews.sendDecisionMail(roundId, user.userId);
  }

  // ── 06 · Documents & Offer ─────────────────────────────────────────────

  @Get('applications/:mapId/documents')
  @ApiOperation({ summary: 'Candidate documents, the request panel and Offer & joining' })
  documentsFor(@Param('mapId', ParseIntPipe) mapId: number) {
    return this.documents.documents(mapId);
  }

  @Post('documents/:docUploadId/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify an uploaded document' })
  verify(@Param('docUploadId', ParseIntPipe) docUploadId: number, @CurrentUser() user: RequestUser) {
    return this.documents.verify(docUploadId, user.userId);
  }

  @Post('documents/:docUploadId/send-back')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a document back to the candidate for correction' })
  sendBack(
    @Param('docUploadId', ParseIntPipe) docUploadId: number,
    @Body() dto: SendBackDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.sendBack(docUploadId, dto.comment, user.userId);
  }

  @Get('documents/:docUploadId/file')
  @ApiOperation({ summary: 'The uploaded file, for preview and download' })
  async file(
    @Param('docUploadId', ParseIntPipe) docUploadId: number,
    @Query('preview', new DefaultValuePipe(false), ParseBoolPipe) preview: boolean,
    @Res() res: Response,
  ) {
    const { body, fileName, previewType } = await this.documents.file(docUploadId);
    // Inline only for the handful of types a browser renders without running anything — PDF
    // and raster images. Everything else, and every download, goes out as an attachment.
    const inline = preview && previewType;
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`,
    );
    res.setHeader('Content-Type', inline ? previewType : 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
    res.send(body);
  }

  @Post('applications/:mapId/documents/request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request missing or corrected documents from the candidate' })
  requestDocuments(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: DocumentRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.request(mapId, dto, user.userId);
  }

  @Post('applications/:mapId/documents/forward')
  @HttpCode(200)
  @ApiOperation({ summary: 'Forward the verified documents to the company' })
  forwardDocuments(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.documents.forward(mapId, user.userId);
  }

  @Post('applications/:mapId/documents/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Record the company\'s approval of the documents' })
  approveDocuments(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.documents.approve(mapId, user.userId);
  }

  @Post('applications/:mapId/offer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate and send the offer letter' })
  offer(
    @Param('mapId', ParseIntPipe) mapId: number,
    @Body() dto: OfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.generateOffer(mapId, dto, user.userId);
  }

  @Post('applications/:mapId/joined')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark the candidate as joined' })
  joined(@Param('mapId', ParseIntPipe) mapId: number, @CurrentUser() user: RequestUser) {
    return this.documents.joined(mapId, user.userId);
  }

  // ── 07 · Returned to Q2 ────────────────────────────────────────────────

  @Get('returned')
  @ApiOperation({ summary: 'CVs returned to Q2 with a status update' })
  returned(@Query('tab', new DefaultValuePipe('all')) tab: string) {
    const t = (RETURNED_TABS as readonly string[]).includes(tab) ? (tab as ReturnedTab) : 'all';
    return this.referrals.returned(t);
  }

  @Get('returned/:referralId/mail')
  @ApiOperation({ summary: 'The status mail Q2 received for one returned CV' })
  returnMail(@Param('referralId', ParseIntPipe) referralId: number) {
    return this.referrals.returnMail(referralId);
  }

  @Post('returned/:referralId/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-send the status mail to Q2' })
  resend(@Param('referralId', ParseIntPipe) referralId: number, @CurrentUser() user: RequestUser) {
    return this.referrals.resendMail(referralId, user.userId);
  }
}
