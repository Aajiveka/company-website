import { baseLayout } from './base-layout';

export interface InterviewScheduledEmailData {
  fullName?: string;
  jobTitle: string;
  companyName: string;
  /** e.g. "Monday, 28 July 2026" */
  date: string;
  /** e.g. "10:00 AM IST" */
  time: string;
  /** Physical address or video-call link. */
  location: string;
  /** Whether the interview is online (changes the label from "Location" to "Meeting Link"). */
  isOnline?: boolean;
  /** Name of the interviewer, if known. */
  interviewer?: string;
  /** Any extra notes about the interview. */
  notes?: string;
}

/** Interview scheduled notification email. */
export function interviewScheduledTemplate(data: InterviewScheduledEmailData): string {
  const {
    fullName,
    jobTitle,
    companyName,
    date,
    time,
    location,
    isOnline = false,
    interviewer,
    notes,
  } = data;

  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';
  const locationLabel = isOnline ? 'Meeting Link' : 'Location';
  const locationValue = isOnline
    ? `<a href="${location}" style="color:#005985;text-decoration:underline;">Join Meeting</a>`
    : location;

  const interviewerRow = interviewer
    ? `<tr>
        <td style="padding:8px 0;font-size:14px;color:#777777;width:120px;vertical-align:top;">Interviewer</td>
        <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${interviewer}</td>
      </tr>`
    : '';

  const notesSection = notes
    ? `<p style="margin:20px 0 0;font-size:14px;color:#555555;line-height:22px;">
        <strong>Additional notes:</strong> ${notes}
      </p>`
    : '';

  return baseLayout({
    previewText: `Interview scheduled: ${jobTitle} at ${companyName} on ${date}`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:24px;">
        Your interview has been scheduled for <strong>${jobTitle}</strong> at
        <strong>${companyName}</strong>. Here are the details:
      </p>

      <!-- Interview Details Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;">
        <tr>
          <td style="padding:20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#777777;width:120px;vertical-align:top;">Date</td>
                <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${date}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#777777;width:120px;vertical-align:top;">Time</td>
                <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${time}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#777777;width:120px;vertical-align:top;">${locationLabel}</td>
                <td style="padding:8px 0;font-size:14px;color:#333333;font-weight:600;">${locationValue}</td>
              </tr>
              ${interviewerRow}
            </table>
          </td>
        </tr>
      </table>

      ${notesSection}

      <!-- Preparation Tips -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:24px;background-color:#e3f2fd;border-radius:8px;">
        <tr>
          <td style="padding:20px;">
            <h3 style="margin:0 0 10px;font-size:15px;color:#005985;">Preparation Tips</h3>
            <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#333333;line-height:24px;">
              <li>Research ${companyName} and the role beforehand.</li>
              <li>Prepare examples of your relevant experience.</li>
              <li>Keep a copy of your resume handy.</li>
              ${isOnline ? '<li>Test your internet connection, camera, and microphone in advance.</li>' : '<li>Plan your travel route and arrive 10 minutes early.</li>'}
              <li>Dress professionally and be ready with questions for the interviewer.</li>
            </ul>
          </td>
        </tr>
      </table>
    `,
  });
}
