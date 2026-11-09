import { sendEmailViaResend, type EmailPayload, type EmailResult } from './resend';
import { sendIncidentAlertEmailViaGmail, sendOtpEmailViaGmail } from './gmail';

export type { EmailPayload, EmailResult };
export { sendEmailViaResend } from './resend';
export { sendIncidentAlertEmailViaGmail, sendOtpEmailViaGmail } from './gmail';

/**
 * Sends OTP verification, login, or password reset emails.
 * Primary: Resend.
 * Fallback: If Resend is missing a key or fails delivery, automatically falls back to Gmail.
 */
export async function sendOtpEmail(payload: EmailPayload): Promise<EmailResult> {
  const resendResult = await sendEmailViaResend(payload);

  if (resendResult.success) {
    return { ...resendResult, provider: 'resend' };
  }

  console.warn(
    `[Email Service] Resend OTP delivery unsuccessful (${resendResult.error || 'unknown error'}). Initiating fallback to Gmail OTP...`
  );

  const gmailResult = await sendOtpEmailViaGmail(payload);

  if (gmailResult.success) {
    console.log('[Email Service] OTP successfully delivered via fallback Gmail.');
    return { ...gmailResult, provider: 'gmail_otp' };
  }

  console.error(
    `[Email Service] Both Resend and fallback Gmail failed for OTP. Resend: ${resendResult.error} | Gmail: ${gmailResult.error}`
  );

  return {
    success: false,
    error: `Delivery failed. Resend: ${resendResult.error || 'failed'}, Gmail: ${gmailResult.error || 'failed'}`,
    provider: 'failed',
  };
}

/**
 * Sends monitor incident alerts (DOWN, DEGRADED, RECOVERED, SSL/Domain expiring).
 * Uses Gmail as requested.
 * If Gmail is not configured or fails, gracefully falls back to Resend if available.
 */
export async function sendIncidentAlertEmail(payload: EmailPayload): Promise<EmailResult> {
  const gmailResult = await sendIncidentAlertEmailViaGmail(payload);

  if (gmailResult.success) {
    return { ...gmailResult, provider: 'gmail_alerts' };
  }

  console.warn(
    `[Email Service] Gmail incident alert failed (${gmailResult.error}). Checking Resend fallback...`
  );

  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendEmailViaResend(payload);
    if (resendResult.success) {
      console.log('[Email Service] Incident alert delivered via backup Resend.');
      return { ...resendResult, provider: 'resend_backup' };
    }
  }

  return gmailResult;
}
