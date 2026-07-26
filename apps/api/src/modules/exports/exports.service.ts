import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '@/prisma/prisma.service';

export interface Column<T> {
  header: string;
  value: (row: T) => string | number;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface UserExportFilters extends DateRangeFilter {
  roleId?: number;
  isActive?: boolean;
}

export interface JobExportFilters extends DateRangeFilter {
  status?: string;
  company?: string;
}

export interface ApplicationExportFilters extends DateRangeFilter {
  jobId?: number;
}

/** Renders a table to CSV, XLSX or PDF. Also provides typed data-fetching helpers for each export. */
@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /* ------------------------------------------------------------------ */
  /*  Format renderers                                                  */
  /* ------------------------------------------------------------------ */

  csv<T>(rows: T[], columns: Column<T>[]): Buffer {
    const escape = (v: string | number) => {
      const s = String(v ?? '');
      // A leading =, +, - or @ makes Excel treat the cell as a formula. Prefix it so a
      // candidate called "=cmd|..." cannot execute when someone opens the export.
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [
      columns.map((c) => escape(c.header)).join(','),
      ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(',')),
    ];
    return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
  }

  async xlsx<T>(rows: T[], columns: Column<T>[], sheetName = 'Export'): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 22 }));
    ws.getRow(1).font = { bold: true };
    for (const row of rows) {
      ws.addRow(Object.fromEntries(columns.map((c) => [c.header, c.value(row)])));
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async pdf<T>(rows: T[], columns: Column<T>[], title = 'Export'): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fontSize(16).fillColor('#000b33').text(title);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#5a5b5e').text(`${rows.length} rows`);
    doc.moveDown(0.8);

    const width = doc.page.width - 72;
    const colWidth = width / columns.length;

    const drawHeader = () => {
      const y = doc.y;
      doc.fontSize(9).fillColor('#005985');
      columns.forEach((c, i) => {
        doc.text(c.header, 36 + i * colWidth, y, { width: colWidth - 6, ellipsis: true });
      });
      doc.moveDown(0.4);
      doc
        .moveTo(36, doc.y)
        .lineTo(doc.page.width - 36, doc.y)
        .strokeColor('#d9dde3')
        .stroke();
      doc.moveDown(0.3);
    };
    drawHeader();

    doc.fillColor('#121212');
    for (const row of rows) {
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
        drawHeader();
        doc.fillColor('#121212');
      }
      const y = doc.y;
      columns.forEach((c, i) => {
        doc
          .fontSize(9)
          .text(String(c.value(row) ?? ''), 36 + i * colWidth, y, {
            width: colWidth - 6,
            ellipsis: true,
          });
      });
      doc.moveDown(0.35);
    }

    doc.end();
    return done;
  }

  /* ------------------------------------------------------------------ */
  /*  Data fetching helpers                                             */
  /* ------------------------------------------------------------------ */

  async exportUsers(filters: UserExportFilters = {}) {
    const where: Record<string, unknown> = {};
    if (filters.roleId) where.roleID = filters.roleId;
    if (filters.isActive !== undefined) where.active = filters.isActive ? 'Y' : 'N';

    const dateFilter: Record<string, unknown> = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }

    const users = await this.db.secUser.findMany({
      where: {
        ...where,
        ...(Object.keys(dateFilter).length > 0
          ? { SecUserLogin: { some: { loginTime: dateFilter } } }
          : {}),
      },
      select: {
        userID: true,
        userName: true,
        userMail: true,
        roleID: true,
        active: true,
        nodeID: true,
      },
      take: 10000,
    });

    return users.map((u) => ({
      userId: Number(u.userID),
      userName: u.userName ?? '',
      email: u.userMail ?? '',
      roleId: u.roleID ?? 0,
      active: u.active === 'Y' ? 'Yes' : 'No',
    }));
  }

  async exportJobs(filters: JobExportFilters = {}) {
    const where: Record<string, unknown> = {};

    const dateFilter: Record<string, unknown> = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
    if (Object.keys(dateFilter).length > 0) where.timestampIns = dateFilter;

    const jobs = await this.db.clientJobs.findMany({
      where,
      include: {
        designation: { select: { descr: true } },
        client: { select: { clientName: true } },
        jobCity: { select: { descr: true } },
        workMode: { select: { descr: true } },
        employeeType: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
      take: 10000,
      orderBy: { timestampIns: 'desc' },
    });

    return jobs.map((j) => ({
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      company: j.client?.clientName ?? '',
      city: j.jobCity?.descr ?? '',
      workMode: j.workMode?.descr ?? '',
      employmentType: j.employeeType?.descr ?? '',
      industry: j.industryType?.industryType ?? '',
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      minExp: j.minExp ?? 0,
      status: j.statusID != null ? String(j.statusID) : '',
      postedOn: j.timestampIns?.toISOString().slice(0, 10) ?? '',
    }));
  }

  async exportApplications(filters: ApplicationExportFilters = {}) {
    const where: Record<string, unknown> = {};
    if (filters.jobId) where.jobID = BigInt(filters.jobId);

    const dateFilter: Record<string, unknown> = {};
    if (filters.from) dateFilter.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
    if (Object.keys(dateFilter).length > 0) where.timestampIns = dateFilter;

    const mappings = await this.db.jobSubscriberMapping.findMany({
      where,
      include: {
        job: {
          include: {
            designation: { select: { descr: true } },
            client: { select: { clientName: true } },
          },
        },
        jobMapStatus: { select: { descr: true } },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              select: { fullName: true, emailID: true, mobileNo1: true },
            },
          },
        },
      },
      take: 10000,
      orderBy: { timestampIns: 'desc' },
    });

    return mappings.map((m) => {
      const cv = m.subscriber?.SubscriberCVDetails;
      return {
        applicationId: Number(m.jobSubscriberMapID),
        candidateName: cv?.fullName ?? '',
        candidateEmail: cv?.emailID ?? '',
        candidateMobile: cv?.mobileNo1 ?? '',
        jobTitle: m.job?.designation?.descr ?? '',
        company: m.job?.client?.clientName ?? '',
        status: m.jobMapStatus?.descr ?? '',
        appliedOn: m.timestampIns?.toISOString().slice(0, 10) ?? '',
      };
    });
  }

  async exportPayments(dateRange: DateRangeFilter = {}) {
    const where: Record<string, unknown> = {};
    const dateFilter: Record<string, unknown> = {};
    if (dateRange.from) dateFilter.gte = new Date(dateRange.from);
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const orders = await this.db.paymentOrder.findMany({
      where,
      include: {
        plan: { select: { tierLabel: true, months: true, priceInr: true } },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              select: { fullName: true, emailID: true },
            },
          },
        },
      },
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => {
      const cv = o.subscriber?.SubscriberCVDetails;
      return {
        orderId: Number(o.orderID),
        orderRef: o.orderRef,
        subscriberName: cv?.fullName ?? '',
        subscriberEmail: cv?.emailID ?? '',
        plan: o.plan?.tierLabel ?? '',
        planMonths: o.plan?.months ?? 0,
        amountInr: o.amountInr,
        status: o.status,
        paymentMethod: o.paymentMethod ?? '',
        createdAt: o.createdAt?.toISOString().slice(0, 10) ?? '',
        settledAt: o.settledAt?.toISOString().slice(0, 10) ?? '',
      };
    });
  }
}
