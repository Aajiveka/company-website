import { baseLayout } from './base-layout';

export interface EmailOtpData {
  fullName?: string;
  /** The 6-digit code. */
  code: string;
  /** How long the code is valid, e.g. "10 minutes". */
  expiresIn: string;
}

/**
 * Email-verification OTP.
 *
 * The code is rendered as text with wide letter-spacing rather than an image so it survives
 * image-blocking clients, and it is repeated in the plain-text fallback (see stripHtml in
 * email.service) for clients that refuse HTML entirely.
 */
export function emailOtpTemplate(data: EmailOtpData): string {
  const { fullName, code, expiresIn } = data;
  const greeting = fullName ? `Hi ${escapeHtml(fullName)},` : 'Hi,';

  return baseLayout({
    previewText: `Your Aajiveka verification code is ${code}`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#555555;line-height:24px;">
        Use the code below to verify your email address and finish creating your
        Aajiveka account.
      </p>

      <!-- OTP code -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:8px 0 24px;">
            <div style="display:inline-block;background-color:#f4f7f9;border:1px solid #d7e1e8;border-radius:8px;padding:18px 32px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#005985;">${code}</span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Expiry warning -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff8e1;border-radius:6px;border:1px solid #ffe082;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:14px;color:#795548;line-height:20px;">
              This code expires in <strong>${expiresIn}</strong>. For your security, never
              share it with anyone — Aajiveka staff will never ask you for it.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:#999999;line-height:20px;">
        If you did not try to create an Aajiveka account, you can safely ignore this email.
      </p>
    `,
  });
}

/** The name is user-supplied and lands in an HTML body — escape it. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
