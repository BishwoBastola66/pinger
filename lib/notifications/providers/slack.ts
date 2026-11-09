import { NotificationProvider, NotificationEvent } from '../types';
import { isSafeUrl } from '@/lib/monitors/ping';
import http from 'node:http';
import https from 'node:https';

export const SlackProvider: NotificationProvider = {
  id: 'slack',
  async send(event: NotificationEvent, config: any): Promise<boolean> {
    if (!config || !config.webhookUrl) return false;

    const isSafe = await isSafeUrl(config.webhookUrl);
    if (!isSafe) {
      console.error(`[Slack] Blocked unsafe webhook URL: ${config.webhookUrl}`);
      return false;
    }

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

    const payload = JSON.stringify({
      text: `${emoji} ${title}: ${event.monitorName}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} ${title}`, emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Monitor:*\n${event.monitorName}` },
            { type: 'mrkdwn', text: `*Event:*\n${event.eventType}` },
            ...(event.errorMessage ? [{ type: 'mrkdwn', text: `*Error:*\n${event.errorMessage}` }] : []),
            ...(event.statusCode ? [{ type: 'mrkdwn', text: `*Status Code:*\n${event.statusCode}` }] : []),
          ]
        }
      ]
    });

    try {
      const url = new URL(config.webhookUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      // DNS Resolution & Pinning to prevent DNS Rebinding
      let targetIp = url.hostname;
      if (targetIp.startsWith('[') && targetIp.endsWith(']')) {
        targetIp = targetIp.slice(1, -1);
      }
      
      const net = require('node:net');
      const dns = require('node:dns/promises');
      
      if (!net.isIP(targetIp)) {
        try {
          const addresses = await dns.resolve(targetIp);
          if (addresses.length === 0) throw new Error('DNS returned no addresses');
          targetIp = addresses[0]; // Pin the first IP
          // Re-verify the resolved IP is safe (prevent DNS Rebinding)
          const { isSafeUrl } = require('@/lib/monitors/ping');
          if (!(await isSafeUrl(`http://${targetIp}`))) {
             throw new Error('SSRF Protection: Resolves to private IP');
          }
        } catch (dnsError: any) {
          throw new Error(`DNS Resolution failed: ${dnsError.code || dnsError.message}`);
        }
      }

      const requestOptions = {
        hostname: targetIp,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pingr-Slack/1.0',
          'Content-Length': Buffer.byteLength(payload).toString(),
          'Host': url.hostname,
        },
        servername: isHttps ? url.hostname : undefined,
        timeout: 5000,
      };

      await new Promise<void>((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Slack webhook returned status ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Slack webhook timed out')); });
        req.write(payload);
        req.end();
      });

      return true;
    } catch (e) {
      console.error('[Slack] Failed to deliver:', e);
      return false;
    }
  }
};
