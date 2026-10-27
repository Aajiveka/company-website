import { baseLayout } from './base-layout';

/**
 * The one shape every Q3 mail takes: a greeting, a paragraph or two, and an optional details
 * card — interview confirmations, round-result mails, document requests, status mails to Q2,
 * nudges to a company.
 *
 * Unlike the older templates, every value is escaped. Most of what goes in here was typed by a
 * person (a note to Q2, company feedback, a request message), and none of it is trusted HTML.
 */
export interface Q3NoticeEmailData {
  previewText: string;
  greetingName?: string | null;
  paragraphs: string[];
  details?: Array<[label: string, value: string]>;
  /** Rendered as a link under the details card. */
  link?: { label: string; href: string } | null;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function q3NoticeTemplate(data: Q3NoticeEmailData): string {
  const greeting = data.greetingName ? `Hi ${escapeHtml(data.greetingName)},` : 'Hi,';
  const paragraphs = data.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;color:#555555;line-height:24px;white-space:pre-line;">${escapeHtml(p)}</p>`,
    )
    .join('');

  const rows = (data.details ?? [])
    .map(
      ([label, value]) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:#777777;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join('');

  const card = rows
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;margin:4px 0 16px;">
        <tr><td style="padding:20px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${rows}</table></td></tr>
      </table>`
    : '';

  // Only http(s) links are rendered as anchors; anything else is printed as text.
  const link =
    data.link && /^https?:\/\//i.test(data.link.href)
      ? `<p style="margin:0 0 16px;font-size:15px;"><a href="${escapeHtml(data.link.href)}" style="color:#2f5bd8;text-decoration:underline;">${escapeHtml(data.link.label)}</a></p>`
      : data.link
        ? `<p style="margin:0 0 16px;font-size:15px;color:#333333;">${escapeHtml(data.link.label)}: ${escapeHtml(data.link.href)}</p>`
        : '';

  return baseLayout({
    previewText: data.previewText,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      ${paragraphs}
      ${card}
      ${link}
      <p style="margin:8px 0 0;font-size:14px;color:#777777;">— Aajiveka Hiring Team</p>
    `,
  });
}
