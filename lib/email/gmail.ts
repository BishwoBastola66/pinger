import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailPayload, EmailResult } from './resend';

// Cache nodemailer transporter per user/pass to avoid re-handshaking every send
const transporterCache = new Map<string, Transporter>();

function getGmailTransporter(user: string, pass: string): Transporter {
  const key = `${user}:${pass}`;
  let transporter = transporterCache.get(key);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
    transporterCache.set(key, transporter);
  }
  return transporter;
}

export async function sendGmailMessage(
  payload: EmailPayload,
  credentials: { user?: string; pass?: string; defaultSenderTitle?: string }
): Promise<EmailResult> {
  const user = credentials.user?.trim();
  const pass = credentials.pass?.replace(/\s+/g, '').trim();

  if (!user || !pass) {
    console.warn(`[Gmail] Missing Gmail credentials (user=${Boolean(user)}, pass=${Boolean(pass)}).`);
    return {
      success: false,
      error: 'Gmail credentials not configured (user or app password missing)',
      provider: 'gmail',
    };
  }

  const sender =
    payload.from ||
    (credentials.defaultSenderTitle ? `${credentials.defaultSenderTitle} <${user}>` : user);

  try {
    const transporter = getGmailTransporter(user, pass);
    const info = await transporter.sendMail({
      from: sender,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return {
      success: true,
      id: info.messageId,
      provider: 'gmail',
    };
  } catch (error: any) {
    console.error('[Gmail] Delivery error:', error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to send via Gmail',
      provider: 'gmail',
    };
  }
}

/**
 * Send monitor incident/warning alerts using the designated Gmail account.
 * Uses GMAIL_ALERTS_USER & GMAIL_ALERTS_APP_PASSWORD (with fallback to generic GMAIL_USER/GMAIL_APP_PASSWORD).
 */
export async function sendIncidentAlertEmailViaGmail(payload: EmailPayload): Promise<EmailResult> {
  const user = process.env.GMAIL_ALERTS_USER || process.env.GMAIL_USER;
  const pass =
    process.env.GMAIL_ALERTS_APP_PASSWORD ||
    process.env.GMAIL_ALERTS_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS;

  return sendGmailMessage(payload, {
    user,
    pass,
    defaultSenderTitle: 'Pingr Alerts',
  });
}

/**
 * Send OTP / authentication emails using the designated fallback Gmail account.
 * Uses GMAIL_OTP_USER & GMAIL_OTP_APP_PASSWORD (with fallback to generic GMAIL_USER/GMAIL_APP_PASSWORD).
 */
export async function sendOtpEmailViaGmail(payload: EmailPayload): Promise<EmailResult> {
  const user = process.env.GMAIL_OTP_USER || process.env.GMAIL_USER;
  const pass =
    process.env.GMAIL_OTP_APP_PASSWORD ||
    process.env.GMAIL_OTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS;

  return sendGmailMessage(payload, {
    user,
    pass,
    defaultSenderTitle: 'Pingr Security',
  });
}
