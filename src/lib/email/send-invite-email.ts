import { resend, RESEND_FROM_EMAIL } from './resend';

interface SendInviteEmailInput {
  to: string;
  inviteLink: string;
  locale: string;
}

/**
 * Sends a branded invitation email using the custom HTML template.
 * Used when Supabase's inviteUserByEmail fails because the user already exists
 * (typically: invite link expired, or a previous attempt created the user row
 * but onboarding never completed). In that case we still want the user to see
 * the INVITE template (not the RECOVERY template that resetPasswordForEmail would produce).
 */
export async function sendInviteEmail({
  to,
  inviteLink,
  locale,
}: SendInviteEmailInput): Promise<{ success: boolean; error?: string }> {
  const isEnglish = locale === 'en';

  const subject = isEnglish
    ? 'You have been invited to Devre Media'
    : 'Έχετε προσκληθεί στο Devre Media';

  const title = isEnglish ? "You've been invited" : 'Έχετε προσκληθεί';

  const intro = isEnglish
    ? 'You have been invited to join <strong style="color:#ffffff;">Devre Media System</strong> — our client portal for project tracking, deliverables, and collaboration. Click below to create your account.'
    : 'Έχετε προσκληθεί στο <strong style="color:#ffffff;">Devre Media System</strong> &mdash; την πλατφόρμα μας για παρακολούθηση projects, deliverables και συνεργασία. Πατήστε παρακάτω για να δημιουργήσετε τον λογαριασμό σας.';

  const cta = isEnglish ? 'Accept Invitation →' : 'Αποδοχή Πρόσκλησης →';

  const fallbackText = isEnglish
    ? "If the button doesn't work, copy and paste this link into your browser:"
    : 'Αν το κουμπί δεν λειτουργεί, αντιγράψτε τον παρακάτω σύνδεσμο στον browser σας:';

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Devre Media</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <span style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-1px;font-family:Georgia,'Times New Roman',serif;">Devre Media.</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <span style="font-size:11px;color:#71717a;letter-spacing:3px;text-transform:uppercase;">social entertainment</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="width:48px;height:2px;background-color:#d4a843;border-radius:1px;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#18181b;border-radius:16px;padding:44px 36px;border:1px solid #27272a;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${title}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#a1a1aa;">${intro}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:4px 0 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color:#d4a843;border-radius:10px;">
                          <a href="${inviteLink}" style="display:inline-block;padding:15px 40px;color:#09090b;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${cta}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:1px;background-color:#27272a;"></td></tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#52525b;line-height:1.6;">${fallbackText}</p>
              <p style="margin:6px 0 0;font-size:11px;color:#3f3f46;word-break:break-all;line-height:1.5;">${inviteLink}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:36px;">
              <p style="margin:0 0 6px;font-size:12px;color:#3f3f46;">&copy; 2026 Devre Media. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#27272a;">Athens, Greece &bull; devremedia.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  try {
    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[sendInviteEmail] Resend error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[sendInviteEmail] Exception:', msg);
    return { success: false, error: msg };
  }
}
