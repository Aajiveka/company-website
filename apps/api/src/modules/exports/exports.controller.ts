import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/shared/roles';
import { AuditService } from '@/modules/audit/audit.service';
import { RecruitmentService } from '@/modules/recruitment/recruitment.service';
import { ClientsService } from '@/modules/clients/clients.service';
import { ExportsService, type Column } from './exports.service';

type Format = 'csv' | 'xlsx' | 'pdf';

const CONTENT_TYPE: Record<Format, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

interface CandidateRow {
  subscriberId: number;
  fullName: string;
  designation: string;
  city: string;
  experience: string;
  jobStatus: string;
  appliedOn: string;
}

const CANDIDATE_COLUMNS: Column<CandidateRow>[] = [
  { header: 'Candidate', value: (r) => r.fullName },
  { header: 'Designation', value: (r) => r.designation },
  { header: 'Location', value: (r) => r.city },
  { header: 'Experience', value: (r) => r.experience },
  { header: 'Status', value: (r) => r.jobStatus },
  { header: 'Applied On', value: (r) => r.appliedOn },
];

/* ------------------------------------------------------------------ */
/*  Column definitions for the new admin exports                      */
/* ------------------------------------------------------------------ */

interface UserRow {
  userId: number;
  userName: string;
  email: string;
  roleId: number;
  active: string;
}

const USER_COLUMNS: Column<UserRow>[] = [
  { header: 'User ID', value: (r) => r.userId },
  { header: 'Username', value: (r) => r.userName },
  { header: 'Email', value: (r) => r.email },
  { header: 'Role ID', value: (r) => r.roleId },
  { header: 'Active', value: (r) => r.active },
];

interface JobRow {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  workMode: string;
  employmentType: string;
  industry: string;
  minCtc: number;
  maxCtc: number;
  minExp: number;
  status: string;
  postedOn: string;
}

const JOB_COLUMNS: Column<JobRow>[] = [
  { header: 'Job ID', value: (r) => r.jobId },
  { header: 'Designation', value: (r) => r.designation },
  { header: 'Company', value: (r) => r.company },
  { header: 'City', value: (r) => r.city },
  { header: 'Work Mode', value: (r) => r.workMode },
  { header: 'Employment Type', value: (r) => r.employmentType },
  { header: 'Industry', value: (r) => r.industry },
  { header: 'Min CTC', value: (r) => r.minCtc },
  { header: 'Max CTC', value: (r) => r.maxCtc },
  { header: 'Min Exp', value: (r) => r.minExp },
  { header: 'Status', value: (r) => r.status },
  { header: 'Posted On', value: (r) => r.postedOn },
];

interface ApplicationRow {
  applicationId: number;
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedOn: string;
}

const APPLICATION_COLUMNS: Column<ApplicationRow>[] = [
  { header: 'Application ID', value: (r) => r.applicationId },
  { header: 'Candidate', value: (r) => r.candidateName },
  { header: 'Email', value: (r) => r.candidateEmail },
  { header: 'Mobile', value: (r) => r.candidateMobile },
  { header: 'Job Title', value: (r) => r.jobTitle },
  { header: 'Company', value: (r) => r.company },
  { header: 'Status', value: (r) => r.status },
  { header: 'Applied On', value: (r) => r.appliedOn },
];

interface PaymentRow {
  orderId: number;
  orderRef: string;
  subscriberName: string;
  subscriberEmail: string;
  plan: string;
  planMonths: number;
  amountInr: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  settledAt: string;
}

const PAYMENT_COLUMNS: Column<PaymentRow>[] = [
  { header: 'Order ID', value: (r) => r.orderId },
  { header: 'Order Ref', value: (r) => r.orderRef },
  { header: 'Subscriber', value: (r) => r.subscriberName },
  { header: 'Email', value: (r) => r.subscriberEmail },
  { header: 'Plan', value: (r) => r.plan },
  { header: 'Months', value: (r) => r.planMonths },
  { header: 'Amount (INR)', value: (r) => r.amountInr },
  { header: 'Status', value: (r) => r.status },
  { header: 'Payment Method', value: (r) => r.paymentMethod },
  { header: 'Created', value: (r) => r.createdAt },
  { header: 'Settled', value: (r) => r.settledAt },
];

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly recruitment: RecruitmentService,
    private readonly clients: ClientsService,
    private readonly audit: AuditService,
  ) {}

  /* ------------------------------------------------------------------ */
  /*  Generic send helper                                               */
  /* ------------------------------------------------------------------ */

  private async send<T>(
    res: Response,
    format: Format,
    name: string,
    rows: T[],
    columns: Column<T>[],
  ) {
    if (!CONTENT_TYPE[format]) throw new BadRequestException('format must be csv, xlsx or pdf');
    const body =
      format === 'csv'
        ? this.exports.csv(rows, columns)
        : format === 'xlsx'
          ? await this.exports.xlsx(rows, columns, name)
          : await this.exports.pdf(rows, columns, name);

    res.setHeader('Content-Type', CONTENT_TYPE[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${name}.${format}"`);
    res.send(body);
  }

  /* ------------------------------------------------------------------ */
  /*  Existing endpoints                                                */
  /* ------------------------------------------------------------------ */

  @Get('candidates')
  @Roles(Role.QC1, Role.QC2, Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'] })
  @ApiOperation({ summary: 'Export the QC candidate listing' })
  async candidates(
    @Query('format') format: Format = 'csv',
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    // Export the whole result set, not just the page the user is looking at.
    const { rows, total } = await this.recruitment.candidateList({
      search,
      status,
      page: 1,
      pageSize: 5000,
    });
    await this.audit.record({
      userId: user.userId,
      action: 'export.candidates',
      detail: { format, rows: total },
    });
    await this.send(res, format, 'candidates', rows, CANDIDATE_COLUMNS);
  }

  @Get('applicants')
  @Roles(Role.Client, Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'] })
  @ApiOperation({ summary: "Export the company's applicants" })
  async applicants(
    @Query('format') format: Format = 'csv',
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const rows = await this.clients.applicants(user.userId);
    await this.audit.record({
      userId: user.userId,
      action: 'export.applicants',
      detail: { format, rows: rows.length },
    });
    await this.send(res, format, 'applicants', rows, CANDIDATE_COLUMNS);
  }

  /* ------------------------------------------------------------------ */
  /*  New admin / reporting endpoints                                   */
  /* ------------------------------------------------------------------ */

  @Get('users')
  @Roles(Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'], required: false })
  @ApiQuery({ name: 'roleId', required: false, description: 'Filter by role ID' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Export users list as CSV (admin only)' })
  async users(
    @Query('format') format: Format = 'csv',
    @Query('roleId') roleId: string | undefined,
    @Query('isActive') isActive: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const rows = await this.exports.exportUsers({
      roleId: roleId ? Number(roleId) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      from,
      to,
    });
    await this.audit.record({
      userId: user.userId,
      action: 'export.users',
      detail: { format, rows: rows.length },
    });
    const filename = `users-export-${new Date().toISOString().slice(0, 10)}`;
    await this.send(res, format, filename, rows, USER_COLUMNS);
  }

  @Get('jobs')
  @Roles(Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'], required: false })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by job status' })
  @ApiQuery({ name: 'company', required: false, description: 'Filter by company name' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Export jobs list as CSV (admin only)' })
  async jobs(
    @Query('format') format: Format = 'csv',
    @Query('status') status: string | undefined,
    @Query('company') company: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const rows = await this.exports.exportJobs({ status, company, from, to });
    await this.audit.record({
      userId: user.userId,
      action: 'export.jobs',
      detail: { format, rows: rows.length },
    });
    const filename = `jobs-export-${new Date().toISOString().slice(0, 10)}`;
    await this.send(res, format, filename, rows, JOB_COLUMNS);
  }

  @Get('applications')
  @Roles(Role.Client, Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'], required: false })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Export applications as CSV (client/admin)' })
  async applications(
    @Query('format') format: Format = 'csv',
    @Query('jobId') jobId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const rows = await this.exports.exportApplications({
      jobId: jobId ? Number(jobId) : undefined,
      from,
      to,
    });
    await this.audit.record({
      userId: user.userId,
      action: 'export.applications',
      detail: { format, rows: rows.length, jobId },
    });
    const filename = `applications-export-${new Date().toISOString().slice(0, 10)}`;
    await this.send(res, format, filename, rows, APPLICATION_COLUMNS);
  }

  @Get('payments')
  @Roles(Role.Admin)
  @ApiQuery({ name: 'format', enum: ['csv', 'xlsx', 'pdf'], required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiOperation({ summary: 'Export payment records as CSV (admin only)' })
  async payments(
    @Query('format') format: Format = 'csv',
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const rows = await this.exports.exportPayments({ from, to });
    await this.audit.record({
      userId: user.userId,
      action: 'export.payments',
      detail: { format, rows: rows.length },
    });
    const filename = `payments-export-${new Date().toISOString().slice(0, 10)}`;
    await this.send(res, format, filename, rows, PAYMENT_COLUMNS);
  }
}
