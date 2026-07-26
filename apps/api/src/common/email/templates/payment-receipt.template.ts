import { baseLayout } from './base-layout';

export interface PaymentReceiptEmailData {
  fullName?: string;
  planName: string;
  /** e.g. "INR 2,999" */
  amount: string;
  /** e.g. "25 July 2026" */
  date: string;
  transactionId: string;
  /** e.g. "25 July 2026 – 24 July 2027" */
  validity: string;
}

/** Payment confirmation / receipt email. */
export function paymentReceiptTemplate(data: PaymentReceiptEmailData): string {
  const { fullName, planName, amount, date, transactionId, validity } = data;
  const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

  return baseLayout({
    previewText: `Payment received — ${planName} plan activated`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;color:#333333;">${greeting}</h2>
      <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:24px;">
        Thank you for your payment. Your subscription has been activated. Here is your receipt:
      </p>

      <!-- Receipt Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e0e0e0;">
        <tr>
          <td style="padding:20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#777777;width:130px;vertical-align:top;">Plan</td>
                <td style="padding:10px 0;font-size:14px;color:#333333;font-weight:600;">${planName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#777777;width:130px;vertical-align:top;">Amount</td>
                <td style="padding:10px 0;font-size:16px;color:#005985;font-weight:700;">${amount}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#777777;width:130px;vertical-align:top;">Date</td>
                <td style="padding:10px 0;font-size:14px;color:#333333;font-weight:600;">${date}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#777777;width:130px;vertical-align:top;">Transaction ID</td>
                <td style="padding:10px 0;font-size:14px;color:#333333;font-weight:600;word-break:break-all;">${transactionId}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:14px;color:#777777;width:130px;vertical-align:top;">Validity</td>
                <td style="padding:10px 0;font-size:14px;color:#333333;font-weight:600;">${validity}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:13px;color:#999999;line-height:20px;">
        Please save this email for your records. If you have any questions about your
        subscription, contact us at
        <a href="mailto:support@aajiveka.org" style="color:#005985;text-decoration:underline;">support@aajiveka.org</a>.
      </p>
    `,
  });
}
