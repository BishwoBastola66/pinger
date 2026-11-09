export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  provider?: string;
}

export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  from,
}: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY is not configured.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  const sender = from || process.env.EMAIL_FROM || 'Pingr <noreply@pingr.site>';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const body: Record<string, string> = {
      from: sender,
      to,
      subject,
      html,
    };
    if (text) {
      body.text = text;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Resend] Failed to deliver email:', errorText);
      return { success: false, error: errorText, provider: 'resend' };
    }

    const data = await res.json();
    return { success: true, id: data.id, provider: 'resend' };
  } catch (error: any) {
    console.error('[Resend] Delivery exception:', error?.message || error);
    return { success: false, error: error?.message || 'Network error delivering via Resend', provider: 'resend' };
  }
}

// Backwards compatibility alias
export const sendEmail = sendEmailViaResend;
