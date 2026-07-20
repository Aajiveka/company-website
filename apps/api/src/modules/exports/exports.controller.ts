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

  private async send(
    res: Response,
    format: Format,
    name: string,
    rows: CandidateRow[],
    columns: Column<CandidateRow>[],
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
  @ApiOperation({ summary: 'Export the company’s applicants' })
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
}
