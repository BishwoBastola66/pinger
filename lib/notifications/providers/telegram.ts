import { NotificationProvider, NotificationEvent } from '../types';
import https from 'node:https';

export const TelegramProvider: NotificationProvider = {
  id: 'telegram',
  async send(event: NotificationEvent, config: any): Promise<boolean> {
    if (!config || !config.botToken || !config.chatId) return false;

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

    let text = `${emoji} *${title}*\n\n*Monitor:* ${event.monitorName}\n*Event:* ${event.eventType}`;
    if (event.errorMessage) text += `\n*Error:* ${event.errorMessage}`;
    if (event.statusCode) text += `\n*Status:* ${event.statusCode}`;
    
    const payload = JSON.stringify({
      chat_id: config.chatId,
      text: text,
      parse_mode: 'Markdown'
    });

    try {
      const requestOptions = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${config.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pingr-Telegram/1.0',
          'Content-Length': Buffer.byteLength(payload).toString(),
        },
        timeout: 5000,
      };

      await new Promise<void>((resolve, reject) => {
        const req = https.request(requestOptions, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Telegram API returned status ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Telegram API timed out')); });
        req.write(payload);
        req.end();
      });

      return true;
    } catch (e) {
      console.error('[Telegram] Failed to deliver:', e);
      return false;
    }
  }
};
