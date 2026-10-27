import { api } from '@/lib/axios';
import { stagePill } from './q3.format';
import type { HiringStage, PipelineRow } from './q3.types';

/** GET /q3/report — the quarter's funnel, decisions, stage snapshot and applications. */
export interface HiringReport {
  quarter: string;
  label: string;
  months: string;
  from: string;
  to: string;
  generatedAt: string;
  funnel: Record<
    | 'referred'
    | 'forwarded'
    | 'returnedAtValidation'
    | 'autoExpired'
    | 'shortlisted'
    | 'interviewsScheduled'
    | 'interviewsConducted'
    | 'selected'
    | 'offersSent'
    | 'offersAccepted'
    | 'joined',
    number
  >;
  decisions: Record<'nextRound' | 'finalRound' | 'hold' | 'rejected' | 'selected', number>;
  stages: Partial<Record<HiringStage, number>>;
  rows: Array<{
    name: string;
    company: string;
    jobTitle: string;
    stage: HiringStage;
    stageDetail: PipelineRow['stageDetail'];
    round: string | null;
  }>;
}

/** "2026-Q3" for the quarter `offset` quarters from the one containing `now`. */
export function quarterKey(offset = 0, now = new Date()) {
  const index = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3) + offset;
  return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
}

/** "Jul–Sep" for a "2026-Q3" key. */
export function quarterMonths(key: string) {
  const q = Number(key.slice(-1));
  const m = (i: number) => new Date(2000, i, 1).toLocaleString('en-GB', { month: 'short' }).slice(0, 3);
  return `${m((q - 1) * 3)}–${m(q * 3 - 1)}`;
}

const FUNNEL: Array<[keyof HiringReport['funnel'], string]> = [
  ['referred', 'CVs referred by Q2'],
  ['forwarded', 'Forwarded to companies'],
  ['returnedAtValidation', 'Returned to Q2 at validation'],
  ['autoExpired', 'Auto-expired (Day 14)'],
  ['shortlisted', 'Shortlisted by companies'],
  ['interviewsScheduled', 'Interviews scheduled'],
  ['interviewsConducted', 'Interviews conducted'],
  ['selected', 'Candidates selected'],
  ['offersSent', 'Offer letters sent'],
  ['offersAccepted', 'Offers accepted'],
  ['joined', 'Joined'],
];

const DECISIONS: Array<[keyof HiringReport['decisions'], string]> = [
  ['nextRound', 'Next round'],
  ['finalRound', 'Final round'],
  ['hold', 'Hold'],
  ['rejected', 'Rejected'],
  ['selected', 'Selected'],
];

const STAGES: HiringStage[] = ['Referred', 'CompanyReview', 'Scheduling', 'Interview', 'Decision', 'Documents', 'Offer', 'Returned', 'Closed'];

/**
 * Fetches the quarter's report and saves it as "Q3_hiring_report_Jul–Sep.pdf" — the designs'
 * "Report exported" toast. jsPDF is loaded on demand; nobody pays for it until they export.
 * Returns the file name for the toast.
 */
export async function exportHiringReport(quarter: string) {
  const [{ data }, { jsPDF }] = await Promise.all([
    api.get<HiringReport>('/q3/report', { params: { quarter } }),
    import('jspdf'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  const ink = () => doc.setTextColor(17, 24, 39);
  const muted = () => doc.setTextColor(107, 114, 128);
  const ensure = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  ink();
  doc.text('Aajiveka · Q3 hiring report', M, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  muted();
  doc.text(
    `${data.label} (${data.quarter}) · generated ${new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
    M,
    y,
  );
  y += 28;

  const section = (title: string) => {
    ensure(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    ink();
    doc.text(title, M, y);
    y += 8;
    doc.setDrawColor(231, 233, 240);
    doc.line(M, y, W - M, y);
    y += 16;
  };
  const pairs = (items: Array<[string, number | string]>) => {
    doc.setFontSize(10.5);
    for (const [label, value] of items) {
      ensure(18);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(label, M, y);
      doc.setFont('helvetica', 'bold');
      ink();
      doc.text(String(value), W - M, y, { align: 'right' });
      y += 17;
    }
    y += 10;
  };

  section('Funnel this quarter');
  pairs(FUNNEL.map(([k, label]) => [label, data.funnel[k]]));

  section('Company decisions recorded');
  pairs(DECISIONS.map(([k, label]) => [label, data.decisions[k]]));

  section('Pipeline today');
  pairs(STAGES.filter((s) => data.stages[s]).map((s) => [stagePill(s, null).label, data.stages[s] ?? 0]));

  section(`Applications that moved this quarter (${data.rows.length})`);
  const cols = [M, M + 150, M + 290, M + 430];
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  muted();
  ['CANDIDATE', 'COMPANY', 'ROLE', 'STAGE'].forEach((h, i) => doc.text(h, cols[i], y));
  y += 14;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  const clip = (s: string, w: number) => (doc.getTextWidth(s) <= w ? s : `${doc.splitTextToSize(s, w - 8)[0]}…`);
  for (const r of data.rows) {
    ensure(16);
    ink();
    doc.text(clip(r.name, 140), cols[0], y);
    doc.setTextColor(55, 65, 81);
    doc.text(clip(r.company, 130), cols[1], y);
    doc.text(clip(r.jobTitle, 130), cols[2], y);
    const stage = stagePill(r.stage, r.stageDetail).label + (r.round ? ` · ${r.round}` : '');
    doc.text(clip(stage, W - M - cols[3]), cols[3], y);
    y += 15;
  }
  if (!data.rows.length) {
    muted();
    doc.text('No applications moved in this quarter.', M, y);
  }

  const fileName = `Q3_hiring_report_${data.months}.pdf`;
  doc.save(fileName);
  return fileName;
}
