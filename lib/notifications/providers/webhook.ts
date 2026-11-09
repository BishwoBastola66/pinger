import { NotificationProvider, NotificationEvent } from '../types';
import { isSafeUrl } from '@/lib/monitors/ping';
import crypto from 'crypto';
import http from 'node:http';
import https from 'node:https';

export const WebhookProvider: NotificationProvider = {
  id: 'webhook',
  async send(event: NotificationEvent, config: any): Promise<boolean> {
    if (!config || !config.url) return false;

    const isSafe = await isSafeUrl(config.url);
    if (!isSafe) {
      console.error(`[Webhook] Blocked unsafe webhook URL: ${config.url}`);
      return false;
    }

    const payload = JSON.stringify({
      event: event.eventType,
      monitor: {
        id: event.monitorId,
        name: event.monitorName,
      },
      details: {
        error: event.errorMessage,
        status_code: event.statusCode,
        response_time: event.responseTime,
      },
      timestamp: event.timestamp.toISOString(),
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pingr-Webhook/1.0',
      'Content-Length': Buffer.byteLength(payload).toString(),
    };

    if (config.secret) {
      const signature = crypto.createHmac('sha256', config.secret).update(payload).digest('hex');
      headers['X-Pingr-Signature'] = `sha256=${signature}`;
    }

    try {
      const url = new URL(config.url);
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

      headers['Host'] = url.hostname;

      const requestOptions = {
        hostname: targetIp,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        servername: isHttps ? url.hostname : undefined,
        timeout: 5000,
      };

      await new Promise<void>((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
          res.resume(); // consume response data to free up memory
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Webhook returned status ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Webhook timed out')); });
        req.write(payload);
        req.end();
      });

      return true;
    } catch (e) {
      console.error('[Webhook] Failed to deliver:', e);
      return false;
    }
  }
};
