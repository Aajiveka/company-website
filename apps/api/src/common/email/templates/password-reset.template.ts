import { baseLayout } from './base-layout';

export interface PasswordResetEmailData {
  fullName?: string;
  /** The reset link URL. */
  resetUrl: string;
  /** How long the link/OTP is valid, e.g. "1 hour". */
  expiresIn: string;
}

/** Password reset email with a reset link and expiry warning. */
export function passwordResetTemplate(data: PasswordResetEmailData): string {
  const { fullName, resetUrl, expiresIn } = data;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

  return baseLayout({
    previewText: 'Reset your Aajiveka password',
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#555555;line-height:24px;">
        We received a request to reset your password. Click the button below to choose
        a new one.
      </p>

      <!-- CTA Button -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:8px 0 24px;">
            <a href="${resetUrl}" style="display:inline-block;background-color:#005985;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>

      <!-- Expiry Warning -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fff8e1;border-radius:6px;border:1px solid #ffe082;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-size:14px;color:#795548;line-height:20px;">
              This link expires in <strong>${expiresIn}</strong>. After that, you will need
              to request a new one.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:#999999;line-height:20px;">
        If you did not request a password reset, no action is needed — your password will
        remain unchanged.
      </p>
    `,
  });
}
