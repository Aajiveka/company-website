import { baseLayout } from './base-layout';

export type ApplicationStatusType = 'applied' | 'shortlisted' | 'selected' | 'rejected';

export interface ApplicationStatusEmailData {
  fullName?: string;
  jobTitle: string;
  companyName: string;
  status: ApplicationStatusType;
  /** Optional personalised message from the recruiter. */
  message?: string;
  /** URL to view the application. */
  dashboardUrl: string;
}

const STATUS_CONFIG: Record<ApplicationStatusType, {
  subject: string;
  previewText: string;
  heading: string;
  bodyHtml: string;
  badgeColor: string;
  badgeBg: string;
}> = {
  applied: {
    subject: 'Application Received',
    previewText: 'Your application has been received',
    heading: 'Application Submitted',
    bodyHtml: 'Your application has been successfully submitted. The employer will review it shortly.',
    badgeColor: '#1565c0',
    badgeBg: '#e3f2fd',
  },
  shortlisted: {
    subject: 'You Have Been Shortlisted!',
    previewText: 'Great news — you have been shortlisted',
    heading: 'Shortlisted',
    bodyHtml: 'Great news! You have been <strong>shortlisted</strong> for this position. The employer may reach out to you soon for the next steps.',
    badgeColor: '#e65100',
    badgeBg: '#fff3e0',
  },
  selected: {
    subject: 'Congratulations — You Are Selected!',
    previewText: 'Congratulations! You have been selected',
    heading: 'Selected',
    bodyHtml: 'Congratulations! You have been <strong>selected</strong> for this role. Please check your dashboard for further instructions from the employer.',
    badgeColor: '#2e7d32',
    badgeBg: '#e8f5e9',
  },
  rejected: {
    subject: 'Application Update',
    previewText: 'An update on your application',
    heading: 'Not Selected',
    bodyHtml: 'After careful consideration, the employer has decided to move forward with other candidates for this role. We encourage you to keep applying — new opportunities are posted daily.',
    badgeColor: '#c62828',
    badgeBg: '#ffebee',
  },
};

/** Application status change email. */
export function applicationStatusTemplate(data: ApplicationStatusEmailData): string {
  const { fullName, jobTitle, companyName, status, message, dashboardUrl } = data;
  const config = STATUS_CONFIG[status];
  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

  const recruiterMessage = message
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:20px;background-color:#f8f9fa;border-left:4px solid #005985;border-radius:4px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:12px;color:#777777;text-transform:uppercase;letter-spacing:0.5px;">Message from the recruiter</p>
            <p style="margin:0;font-size:14px;color:#333333;line-height:22px;">${message}</p>
          </td>
        </tr>
      </table>`
    : '';

  return baseLayout({
    previewText: `${config.previewText} — ${jobTitle} at ${companyName}`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>

      <!-- Status Badge -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td>
            <span style="display:inline-block;background-color:${config.badgeBg};color:${config.badgeColor};font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">
              ${config.heading}
            </span>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:15px;color:#555555;line-height:24px;">
        <strong>${jobTitle}</strong> at <strong>${companyName}</strong>
      </p>

      <p style="margin:0 0 16px;font-size:15px;color:#555555;line-height:24px;">
        ${config.bodyHtml}
      </p>

      ${recruiterMessage}

      <!-- Dashboard CTA -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top:24px;">
        <tr>
          <td align="center">
            <a href="${dashboardUrl}" style="display:inline-block;background-color:#005985;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px;">
              View Dashboard
            </a>
          </td>
        </tr>
      </table>
    `,
  });
}
