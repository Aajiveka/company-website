import { baseLayout } from './base-layout';

export interface WelcomeEmailData {
  fullName: string;
  /** URL to the profile-completion page. */
  profileUrl: string;
}

/** Welcome email sent after successful registration. */
export function welcomeTemplate(data: WelcomeEmailData): string {
  const { fullName, profileUrl } = data;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi there,';

  return baseLayout({
    previewText: 'Welcome to Aajiveka — your journey starts here!',
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#555555;line-height:24px;">
        Welcome to <strong>Aajiveka</strong>! Your account has been created successfully.
        We are here to help you find the right opportunities and build a rewarding career.
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:24px;">
        To get started, complete your profile so employers can find you and match you with
        the best jobs in your area.
      </p>

      <!-- CTA Button -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <a href="${profileUrl}" style="display:inline-block;background-color:#005985;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px;">
              Complete Your Profile
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:13px;color:#999999;line-height:20px;">
        If you did not create this account, you can safely ignore this email.
      </p>
    `,
  });
}
