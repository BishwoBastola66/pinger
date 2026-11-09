import { NotificationProvider, NotificationEvent } from '../types';
import { sendIncidentAlertEmail } from '@/lib/email';

export const EmailProvider: NotificationProvider = {
  id: 'email',
  async send(event: NotificationEvent, config: any): Promise<boolean> {
    if (!config || !config.email) return false;

    let emoji = '🔴';
    let title = 'Monitor Alert';
    
    if (event.eventType === 'recovered') {
      emoji = '🟢';
      title = 'Monitor Recovered';
    } else if (event.eventType === 'degraded') {
      emoji = '🟡';
      title = 'Monitor Degraded';
    } else if (event.eventType === 'ssl_expiring' || event.eventType === 'domain_expiring') {
      emoji = '⚠️';
      title = 'Expiration Warning';
    }

    const subject = `${emoji} ${title}: ${event.monitorName}`;
    
    // Minimal HTML payload for email alerts
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="margin-top: 0;">${emoji} ${title}</h2>
        <p><strong>Monitor:</strong> ${event.monitorName}</p>
        <p><strong>Event:</strong> ${event.eventType}</p>
        ${event.errorMessage ? `<p><strong>Error:</strong> ${event.errorMessage}</p>` : ''}
        ${event.statusCode ? `<p><strong>Status:</strong> ${event.statusCode}</p>` : ''}
        ${event.responseTime ? `<p><strong>Response Time:</strong> ${event.responseTime}ms</p>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Pingr Automated Alert &mdash; ${event.timestamp.toISOString()}
        </p>
      </div>
    `;

    try {
      const result = await sendIncidentAlertEmail({
        to: config.email,
        subject,
        html,
      });

      if (!result.success) {
        console.error('[EmailProvider] Failed to deliver incident alert via Gmail:', result.error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('[EmailProvider] Exception:', e);
      return false;
    }
  }
};
