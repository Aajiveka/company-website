import { baseLayout } from './base-layout';

export interface JobAlertEmailData {
  fullName?: string;
  jobTitle: string;
  companyName: string;
  location: string;
  /** e.g. "3.5 – 5.0 LPA" or "15,000 – 20,000 / month" */
  ctcRange?: string;
  /** URL to view/apply for the job. */
  applyUrl: string;
  /** Optional unsubscribe URL for job alerts. */
  unsubscribeUrl?: string;
}

/** New job matching alert email. */
export function jobAlertTemplate(data: JobAlertEmailData): string {
  const { fullName, jobTitle, companyName, location, ctcRange, applyUrl, unsubscribeUrl } = data;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

  const ctcRow = ctcRange
    ? `<tr>
        <td style="padding:8px 0;font-size:14px;color:#777777;width:100px;vertical-align:top;">CTC Range</td>
        <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${ctcRange}</td>
      </tr>`
    : '';

  return baseLayout({
    previewText: `New job match: ${jobTitle} at ${companyName}`,
    unsubscribeUrl,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:24px;">
        A new job matching your profile is available. Here are the details:
      </p>

      <!-- Job Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 12px;font-size:18px;color:#005985;">${jobTitle}</h3>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#777777;width:100px;vertical-align:top;">Company</td>
                <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${companyName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#777777;width:100px;vertical-align:top;">Location</td>
                <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${location}</td>
              </tr>
              ${ctcRow}
            </table>
          </td>
        </tr>
      </table>

      <!-- Apply CTA -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding-top:24px;">
        <tr>
          <td align="center">
            <a href="${applyUrl}" style="display:inline-block;background-color:#005985;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:6px;">
              View &amp; Apply
            </a>
          </td>
        </tr>
      </table>
    `,
  });
}
