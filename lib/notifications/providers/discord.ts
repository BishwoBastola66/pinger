import { NotificationProvider, NotificationEvent } from '../types';
import { isSafeUrl } from '@/lib/monitors/ping';
import http from 'node:http';
import https from 'node:https';

export const DiscordProvider: NotificationProvider = {
  id: 'discord',
  async send(event: NotificationEvent, config: any): Promise<boolean> {
    if (!config || !config.webhookUrl) return false;

    const isSafe = await isSafeUrl(config.webhookUrl);
    if (!isSafe) {
      console.error(`[Discord] Blocked unsafe webhook URL: ${config.webhookUrl}`);
      return false;
    }

    let color = 16711680; // Red
    let title = 'Monitor Alert';
    
    if (event.eventType === 'recovered') {
      color = 65280; // Green
      title = 'Monitor Recovered';
    } else if (event.eventType === 'degraded') {
      color = 16776960; // Yellow
      title = 'Monitor Degraded';
    } else if (event.eventType === 'ssl_expiring' || event.eventType === 'domain_expiring') {
      color = 16776960;
      title = 'Expiration Warning';
    }

    const payload = JSON.stringify({
      embeds: [{
        title: title,
        color: color,
        fields: [
          { name: 'Monitor', value: event.monitorName, inline: true },
          { name: 'Event', value: event.eventType, inline: true },
          ...(event.errorMessage ? [{ name: 'Error', value: event.errorMessage, inline: false }] : []),
          ...(event.statusCode ? [{ name: 'Status Code', value: String(event.statusCode), inline: true }] : []),
          ...(event.responseTime ? [{ name: 'Response Time', value: `${event.responseTime}ms`, inline: true }] : []),
        ],
        timestamp: event.timestamp.toISOString(),
      }]
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
          'User-Agent': 'Pingr-Discord/1.0',
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
            reject(new Error(`Discord webhook returned status ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Discord webhook timed out')); });
        req.write(payload);
        req.end();
      });

      return true;
    } catch (e) {
      console.error('[Discord] Failed to deliver:', e);
      return false;
    }
  }
};
