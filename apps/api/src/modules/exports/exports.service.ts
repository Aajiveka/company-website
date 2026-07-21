import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface Column<T> {
  header: string;
  value: (row: T) => string | number;
}

/** Renders a table to CSV, XLSX or PDF. Callers supply the rows and the column map. */
@Injectable()
export class ExportsService {
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
    return Buffer.from('﻿' + lines.join('\r\n'), 'utf8');
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
}
