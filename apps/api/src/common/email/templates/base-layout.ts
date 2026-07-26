/**
 * Shared responsive email layout wrapper.
 *
 * Uses inline CSS and table-based layout for maximum email client compatibility.
 * Max-width 600px, fluid tables for mobile. Aajiveka branding with navy #005985 header.
 */

export interface BaseLayoutOptions {
  /** Main content HTML to inject into the body area. */
  body: string;
  /** Preview text shown in inbox list (hidden in the email body). */
  previewText?: string;
  /** Optional unsubscribe URL. Omit to hide the link. */
  unsubscribeUrl?: string;
}

export function baseLayout(options: BaseLayoutOptions): string {
  const { body, previewText = '', unsubscribeUrl } = options;

  const unsubscribeLink = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;">Unsubscribe</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Aajiveka</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .content-padding { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
  ${previewText ? `<div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>` : ''}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 8px;">

        <!-- Email Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#005985;padding:24px 32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;">
                    <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">Aajiveka</h1>
                    <p style="margin:4px 0 0;font-size:12px;color:#b3d9ec;letter-spacing:0.5px;">Empowering Livelihoods</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content-padding" style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f7;padding:24px 32px;border-top:1px solid #e8e8e8;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:12px;">
                    ${unsubscribeLink}
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;font-size:12px;color:#999999;line-height:18px;">
                    <p style="margin:0;">Aajiveka Foundation</p>
                    <p style="margin:4px 0 0;">Mumbai, Maharashtra, India</p>
                    <p style="margin:8px 0 0;">
                      <a href="https://aajiveka.org" style="color:#005985;text-decoration:none;">aajiveka.org</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Email Container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}
