import { db } from '@/lib/db';
import { sql, eq, and, or, isNull } from 'drizzle-orm';
import { monitors, pingLogs, monitorStats, incidents, notifications } from '@/lib/db/schema';
import { dispatchNotification } from '@/lib/notifications/router';
import { claimDueMonitors, updateMonitorPingResult, getRemainingDueCount as getDueCount, parseSupabaseTarget } from '@/lib/data/monitor-service';
import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import crypto from 'node:crypto';

function isPrivateIP(ip: string): boolean {
  if (ip === '::1') return true;
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  if (ip.includes(':')) {
    try {
      const normalizedUrl = new URL(`http://[${ip}]`);
      const h = normalizedUrl.hostname;
      ip = (h.startsWith('[') && h.endsWith(']')) ? h.slice(1, -1) : h;
    } catch {
      return true;
    }
  }
  
  if (
    ip.startsWith('127.') || 
    ip.startsWith('10.') || 
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('0.') ||
    ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  ) {
    return true;
  }
  
  if (
    ip.toLowerCase().startsWith('fc') || 
    ip.toLowerCase().startsWith('fd') || 
    ip.toLowerCase().startsWith('fe8') || 
    ip.toLowerCase().startsWith('fe9') ||
    ip.toLowerCase().startsWith('fea') ||
    ip.toLowerCase().startsWith('feb')
  ) {
    return true;
  }

  return false;
}

export async function isSafeUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
      return false;
    }

    if (url.hostname === 'localhost') {
      return false;
    }

    let hostname = url.hostname;
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) return false;
    } else {
      try {
        const addresses = await dns.resolve(hostname);
        for (const address of addresses) {
          if (isPrivateIP(address)) {
            return false;
          }
        }
      } catch (dnsError: any) {
        if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA' || dnsError.code === 'SERVFAIL') {
          return true;
        }
        return false;
      }
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function processMonitor(monitor: any): Promise<boolean> {
  console.log(`[Worker] Pinging monitor ${monitor.id} (${monitor.target})`);
  
  const startTime = Date.now();
  let success = false;
  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let responseTime = 0;

  try {
    const timeoutMs = (monitor.timeoutSeconds || 10) * 1000;

    if (monitor.type === 'dns') {
      const target = monitor.target;
      const queryType = monitor.dnsQueryType || 'A';
      try {
        const promise = (async () => {
          switch (queryType) {
            case 'A': return await dns.resolve4(target);
            case 'AAAA': return await dns.resolve6(target);
            case 'MX': return await dns.resolveMx(target);
            case 'TXT': return await dns.resolveTxt(target);
            case 'CNAME': return await dns.resolveCname(target);
            case 'NS': return await dns.resolveNs(target);
            default: return await dns.resolve(target);
          }
        })();
        const result = await Promise.race([
          promise,
          new Promise((_, r) => setTimeout(() => r(new Error('DNS query timed out')), timeoutMs))
        ]);
        
        // Assertions for DNS
        const assertions = typeof monitor.assertions === 'string' ? JSON.parse(monitor.assertions) : (monitor.assertions || []);
        if (assertions.length > 0) {
           let allPassed = true;
           const strResult = JSON.stringify(result);
           for (const assertion of assertions) {
              const { operator, target: assertTarget } = assertion;
              if (operator === 'CONTAINS' && !strResult.includes(assertTarget)) {
                 allPassed = false; errorMessage = `Expected result to contain ${assertTarget}`; break;
              }
           }
           success = allPassed;
        } else {
           success = true;
        }
      } catch (e: any) {
        throw new Error(`DNS resolution failed: ${e.message}`);
      }
    } 
    else if (monitor.type === 'tcp') {
      const port = monitor.port;
      if (!port) throw new Error('Port is required for TCP monitor');
      const targetIp = monitor.target;
      if (isPrivateIP(targetIp)) throw new Error('SSRF Protection: Private IP blocked');
      
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.connect(port, targetIp, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
      });
      success = true;
    }
    else if (monitor.type === 'ssl') {
      const port = monitor.port || 443;
      const targetHostname = monitor.target;
      if (isPrivateIP(targetHostname)) throw new Error('SSRF Protection: Private IP blocked');
      
      await new Promise<void>((resolve, reject) => {
        const socket = tls.connect(port, targetHostname, { servername: targetHostname, rejectUnauthorized: false }, () => {
          const cert = socket.getPeerCertificate(true);
          if (socket.authorized) {
            // Check expiry
            const validTo = new Date(cert.valid_to);
            const daysRemaining = (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            const alertDays = monitor.sslDaysBeforeExpiryAlert || 14;
            
            if (daysRemaining < alertDays) {
              reject(new Error(`Certificate expires in ${Math.floor(daysRemaining)} days (threshold: ${alertDays})`));
            } else {
              resolve();
            }
          } else {
            reject(new Error(socket.authorizationError?.message || 'Certificate verification failed'));
          }
          socket.end();
        });
        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
        socket.on('error', reject);
      });
      success = true;
    }
    else if (monitor.type === 'websocket') {
      let currentUrl = monitor.target;
      const url = new URL(currentUrl);
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        throw new Error('Invalid protocol, must be ws: or wss:');
      }
      if (url.hostname === 'localhost') {
        throw new Error('SSRF Protection: localhost blocked');
      }
      
      let targetIp = url.hostname;
      if (targetIp.startsWith('[') && targetIp.endsWith(']')) {
        targetIp = targetIp.slice(1, -1);
      }
      
      if (!net.isIP(targetIp)) {
        try {
          const addresses = await dns.resolve(targetIp);
          if (addresses.length === 0) throw new Error('DNS returned no addresses');
          targetIp = addresses[0];
          for (const addr of addresses) {
            if (isPrivateIP(addr)) throw new Error('SSRF Protection: Resolves to private IP');
          }
        } catch (dnsError: any) {
          throw new Error(`DNS Resolution failed: ${dnsError.code || dnsError.message}`);
        }
      } else {
        if (isPrivateIP(targetIp)) throw new Error('SSRF Protection: Direct private IP blocked');
      }

      const isWss = url.protocol === 'wss:';
      const client = isWss ? https : http;
      
      await new Promise<void>((resolve, reject) => {
        const req = client.request({
          hostname: targetIp,
          port: url.port || (isWss ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Host': url.hostname,
            'Sec-WebSocket-Key': require('crypto').randomBytes(16).toString('base64'),
            'Sec-WebSocket-Version': '13'
          },
          servername: isWss ? url.hostname : undefined,
          timeout: timeoutMs,
        });

        req.on('upgrade', (res, socket, head) => {
          socket.destroy();
          resolve();
        });

        req.on('response', (res) => {
          // If server didn't upgrade, it responded with standard HTTP
          reject(new Error(`Server responded with ${res.statusCode} instead of upgrading`));
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Connection timed out')); });
        req.end();
      });
      success = true;
    }
    else {
      // HTTP/HTTPS, API, Supabase, Keyword
      let currentUrl = (monitor.target || monitor.url || monitor.projectUrl || monitor.projectRef || '').trim();
      if (monitor.type === 'supabase') {
        const parsed = parseSupabaseTarget(currentUrl);
        currentUrl = parsed.url ? `${parsed.url}/auth/v1/health` : currentUrl;
      }
      let redirectCount = 0;
      const maxRedirects = 5;

      while (redirectCount <= maxRedirects) {
        const url = new URL(currentUrl);
        
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol');
        }
        if (url.hostname === 'localhost') {
          throw new Error('SSRF Protection: localhost blocked');
        }

        let targetIp = url.hostname;
        
        if (targetIp.startsWith('[') && targetIp.endsWith(']')) {
          targetIp = targetIp.slice(1, -1);
        }
        
        if (!net.isIP(targetIp)) {
          try {
            const addresses = await dns.resolve(targetIp);
            if (addresses.length === 0) throw new Error('DNS returned no addresses');
            targetIp = addresses[0];
            for (const addr of addresses) {
              if (isPrivateIP(addr)) throw new Error('SSRF Protection: Resolves to private IP');
            }
          } catch (dnsError: any) {
            throw new Error(`DNS Resolution failed: ${dnsError.code || dnsError.message}`);
          }
        } else {
          if (isPrivateIP(targetIp)) throw new Error('SSRF Protection: Direct private IP blocked');
        }

        const headers = typeof monitor.headers === 'string' ? JSON.parse(monitor.headers) : { ...(monitor.headers || {}) };
        if (monitor.type === 'supabase' && monitor.apiKey) {
          headers['apikey'] = monitor.apiKey;
          if (!headers['Authorization']) {
            headers['Authorization'] = `Bearer ${monitor.apiKey}`;
          }
        }
        // Also support UI configured headers if they passed them as an array inside the new `headers` field,
        // For backwards compatibility, assuming `headers` is an object.
        const isHttps = url.protocol === 'https:';
        
        let pathWithQuery = url.pathname + url.search;
        const queryParams = typeof monitor.queryParameters === 'string' ? JSON.parse(monitor.queryParameters) : (monitor.queryParameters || {});
        if (Object.keys(queryParams).length > 0) {
          const searchParams = new URLSearchParams(url.search);
          for (const [k, v] of Object.entries(queryParams)) {
            searchParams.append(k, v as string);
          }
          pathWithQuery = url.pathname + '?' + searchParams.toString();
        }

        const requestOptions = {
          hostname: targetIp,
          port: url.port || (isHttps ? 443 : 80),
          path: pathWithQuery,
          method: redirectCount === 0 ? monitor.method : 'GET',
          headers: {
            'User-Agent': 'Pingr-Worker/1.0',
            'Host': url.hostname,
            ...headers
          },
          servername: isHttps ? url.hostname : undefined,
          timeout: timeoutMs,
        };

        const res = await new Promise<{status: number, headers: any, body: string}>((resolve, reject) => {
          const client = isHttps ? https : http;
          const req = client.request(requestOptions, (response) => {
            let byteCount = 0;
            const chunks: Buffer[] = [];
            response.on('data', (chunk) => {
              byteCount += chunk.length;
              if (byteCount > 1024 * 1024) { // 1MB limit
                req.destroy(new Error('Response size limit exceeded'));
              } else {
                chunks.push(chunk);
              }
            });
            response.on('end', () => {
               resolve({
                 status: response.statusCode || 0,
                 headers: response.headers,
                 body: Buffer.concat(chunks).toString('utf-8')
               });
            });
          });

          req.on('timeout', () => {
            req.destroy(new Error('Connection timed out'));
          });

          req.on('error', (err) => reject(err));
          if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method as string) && monitor.body) {
            req.write(monitor.body);
          }
          req.end();
        });

        if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
          const location = res.headers.location;
          currentUrl = new URL(location, currentUrl).toString();
          redirectCount++;
          
          if (redirectCount > maxRedirects) {
            throw new Error('Too many redirects');
          }
          continue;
        }

        statusCode = res.status;
        responseTime = Date.now() - startTime;
        
        const assertions = typeof monitor.assertions === 'string' ? JSON.parse(monitor.assertions) : (monitor.assertions || []);
        
        if (monitor.type === 'supabase') {
          const isSupabaseGateway = Boolean(res.headers['sb-project-ref'] || res.headers['sb-gateway-version']);
          success = res.status < 500 || isSupabaseGateway;
          if (!success) {
            errorMessage = `Supabase responded with error status: ${res.status}`;
          }
          break;
        }

        if (monitor.type === 'keyword' && assertions.length === 0) {
           // For backwards compatibility or simplified UI for keyword
           success = res.status >= 200 && res.status < 300;
           break;
        }

        if (assertions && assertions.length > 0) {
          let allPassed = true;
          let jsonParsed: any = undefined;
          let didParseJson = false;
          
          for (const assertion of assertions) {
             const { source, property, operator, target } = assertion;
             let actualValue: any;
             
             if (source === 'STATUS_CODE') {
               actualValue = statusCode;
             } else if (source === 'RESPONSE_TIME') {
               actualValue = responseTime;
             } else if (source === 'HEADER') {
               actualValue = property ? res.headers[property.toLowerCase()] : undefined;
             } else if (source === 'JSON_BODY') {
               if (!didParseJson) {
                  try { jsonParsed = JSON.parse(res.body); } catch(e) {}
                  didParseJson = true;
               }
               if (property && jsonParsed !== undefined) {
                  const keys = property.replace(/^\$\./, '').split('.');
                  let curr = jsonParsed;
                  for (const k of keys) {
                     if (curr && typeof curr === 'object' && k in curr) {
                        curr = curr[k];
                     } else {
                        curr = undefined;
                        break;
                     }
                  }
                  actualValue = curr;
               } else {
                  actualValue = undefined;
               }
             } else if (source === 'RAW_BODY') {
               actualValue = res.body;
             }
             
             let pass = false;
             switch (operator) {
               case 'EQUALS': pass = String(actualValue) === String(target); break;
               case 'NOT_EQUALS': pass = String(actualValue) !== String(target); break;
               case 'CONTAINS': pass = actualValue !== undefined && actualValue !== null && String(actualValue).includes(String(target)); break;
               case 'NOT_CONTAINS': pass = actualValue === undefined || actualValue === null || !String(actualValue).includes(String(target)); break;
               case 'LESS_THAN': pass = Number(actualValue) < Number(target); break;
               case 'GREATER_THAN': pass = Number(actualValue) > Number(target); break;
               case 'EXISTS': pass = actualValue !== undefined && actualValue !== null; break;
               case 'NOT_EXISTS': pass = actualValue === undefined || actualValue === null; break;
             }
             
             if (!pass) {
               allPassed = false;
               const safeGot = (actualValue === undefined || actualValue === null) ? 'null/undefined' : (source === 'RAW_BODY' ? 'raw_body' : typeof actualValue);
               errorMessage = `Assertion failed: ${source} ${property || ''} ${operator} ${target || ''}. Got type: ${safeGot}`;
               break;
             }
          }
          success = allPassed;
        } else {
          if (monitor.expectedStatus) {
            success = res.status === monitor.expectedStatus;
            if (!success) {
              errorMessage = `Expected status ${monitor.expectedStatus}, got ${res.status}`;
            }
          } else {
            success = res.status >= 200 && res.status < 300;
            if (!success) {
              errorMessage = `HTTP Error ${res.status}`;
            }
          }
        }
        break;
      }
    }
  } catch (error: any) {
    success = false;
    errorMessage = error.message || 'Unknown network error';
  }

  if (responseTime === 0) responseTime = Date.now() - startTime;
  
  let newStatus = monitor.status;
  let newConsecutiveFailures = 0;
  let nextPingInterval = monitor.intervalSeconds;
  
  if (success) {
    newStatus = 'healthy';
    const activeIncidents = await db.select().from(incidents).where(sql`monitor_id = ${monitor.id} AND status = 'ongoing'`);
    await db.update(incidents)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(sql`monitor_id = ${monitor.id} AND status = 'ongoing'`);
      
    if (activeIncidents.length > 0) {
      // Trigger recovery in-app notification
      try {
        await db.insert(notifications).values({
          accountId: monitor.userId,
          title: 'Monitor Recovered',
          message: `Your monitor "${monitor.name}" is back online. Response time: ${responseTime || 0}ms.`,
          type: 'success',
          isRead: false,
        });
      } catch (e) {
        console.error('[Ping] Failed to insert recovery notification:', e);
      }
    }
  } else {
    newConsecutiveFailures = (monitor.consecutiveFailures || 0) + 1;
    const threshold = monitor.failureThreshold || 1;
    
    if (newConsecutiveFailures >= threshold) {
      newStatus = 'failing';
      const activeIncidents = await db.select().from(incidents).where(sql`monitor_id = ${monitor.id} AND status = 'ongoing'`).limit(1);
      if (activeIncidents.length === 0) {
        try {
          await db.insert(incidents).values({
            monitorId: monitor.id,
            status: 'ongoing',
            errorType: 'ping_failure',
            errorMessage: errorMessage,
          }).onConflictDoNothing();
          
          // Trigger incident creation in-app notification
          try {
            await db.insert(notifications).values({
              accountId: monitor.userId,
              title: 'Monitor Alert: Down',
              message: `Your monitor "${monitor.name}" is down: ${errorMessage || 'Ping failed'}.`,
              type: 'alert',
              isRead: false,
            });
          } catch (e) {
            console.error('[Ping] Failed to insert down notification:', e);
          }
        } catch(e) {}
      }
    } else {
      newStatus = 'degraded';
      nextPingInterval = monitor.retryIntervalSeconds || 60;
    }
  }

  const nextPingAt = new Date(Date.now() + nextPingInterval * 1000);
  const successInt = success ? 1 : 0;
  const failInt = success ? 0 : 1;

    const fastestVal = success ? responseTime : null;
    const slowestVal = success ? responseTime : null;

    await db.transaction(async (tx) => {
      await Promise.all([
        tx.insert(pingLogs).values({
          monitorId: monitor.id,
          success,
          statusCode,
          responseTime,
          errorMessage,
        }),
        
        tx.execute(sql`
          INSERT INTO monitor_stats (monitor_id, total_checks, successful_checks, failed_checks, fastest_response, slowest_response)
          VALUES (${monitor.id}, 1, ${success ? 1 : 0}, ${success ? 0 : 1}, ${fastestVal}, ${slowestVal})
          ON CONFLICT (monitor_id) DO UPDATE SET
            total_checks = monitor_stats.total_checks + 1,
            successful_checks = monitor_stats.successful_checks + ${success ? 1 : 0},
            failed_checks = monitor_stats.failed_checks + ${success ? 0 : 1},
            fastest_response = CASE
              WHEN ${success} THEN LEAST(COALESCE(monitor_stats.fastest_response, ${responseTime}), ${responseTime})
              ELSE monitor_stats.fastest_response
            END,
            slowest_response = CASE
              WHEN ${success} THEN GREATEST(COALESCE(monitor_stats.slowest_response, ${responseTime}), ${responseTime})
              ELSE monitor_stats.slowest_response
            END,
            updated_at = NOW()
        `)
      ]);

    await updateMonitorPingResult(tx, monitor.id, monitor.type, newStatus, newConsecutiveFailures, nextPingAt, statusCode, responseTime);
  });

  console.log(`[Worker] Finished ${monitor.id} - ${success ? 'OK' : 'FAIL'} in ${responseTime}ms`);
  
  return success;
}

export async function claimAndProcessJobs(limit: number = 20): Promise<{ claimed: number; successful: number; failed: number }> {
  try {
    const claimedMonitors = await claimDueMonitors(limit);

    if (claimedMonitors.length > 0) {
      console.log(`[Worker] Claimed ${claimedMonitors.length} jobs.`);
      const results = await Promise.all(claimedMonitors.map(m => processMonitor(m)));
      
      const successful = results.filter(r => r).length;
      const failed = results.length - successful;

      return { claimed: claimedMonitors.length, successful, failed };
    }
    
    return { claimed: 0, successful: 0, failed: 0 };
  } catch (error) {
    console.error('[Worker] Error claiming jobs:', error);
    return { claimed: 0, successful: 0, failed: 0 };
  }
}

export async function getRemainingDueCount(): Promise<number> {
  try {
    return await getDueCount();
  } catch (error) {
    console.error('[Worker] Error counting remaining due:', error);
    return 0;
  }
}

export async function testProbe(monitor: any): Promise<{
  success: boolean;
  statusCode: number | null;
  responseTime: number;
  errorMessage: string | null;
  bodySnippet?: string;
  details?: Record<string, any>;
}> {
  const startTime = Date.now();
  let success = false;
  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let responseTime = 0;
  let bodySnippet: string | undefined = undefined;
  const timeoutMs = (monitor.timeoutSeconds || 10) * 1000;

  try {
    if (monitor.type === 'dns') {
      const target = monitor.target;
      const queryType = monitor.dnsQueryType || 'A';
      const promise = (async () => {
        switch (queryType) {
          case 'A': return await dns.resolve4(target);
          case 'AAAA': return await dns.resolve6(target);
          case 'MX': return await dns.resolveMx(target);
          case 'TXT': return await dns.resolveTxt(target);
          case 'CNAME': return await dns.resolveCname(target);
          case 'NS': return await dns.resolveNs(target);
          default: return await dns.resolve(target);
        }
      })();
      const result = await Promise.race([
        promise,
        new Promise((_, r) => setTimeout(() => r(new Error('DNS query timed out')), timeoutMs))
      ]);
      responseTime = Date.now() - startTime;
      bodySnippet = JSON.stringify(result, null, 2);
      success = true;
    }
    else if (monitor.type === 'tcp') {
      const port = Number(monitor.port);
      if (!port) throw new Error('Port is required for TCP monitor');
      const targetIp = monitor.target;
      if (isPrivateIP(targetIp)) throw new Error('SSRF Protection: Private IP blocked');

      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.connect(port, targetIp, () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
      });
      responseTime = Date.now() - startTime;
      success = true;
      bodySnippet = `Connected to ${targetIp}:${port} successfully`;
    }
    else if (monitor.type === 'ssl') {
      const port = Number(monitor.port || 443);
      const targetHostname = monitor.target;
      if (isPrivateIP(targetHostname)) throw new Error('SSRF Protection: Private IP blocked');

      await new Promise<void>((resolve, reject) => {
        const socket = tls.connect(port, targetHostname, { servername: targetHostname, rejectUnauthorized: false }, () => {
          const cert = socket.getPeerCertificate(true);
          if (socket.authorized) {
            const validTo = new Date(cert.valid_to);
            const daysRemaining = (validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            const alertDays = monitor.sslDaysBeforeExpiryAlert || 14;
            bodySnippet = `Certificate valid until ${validTo.toISOString().split('T')[0]} (${Math.floor(daysRemaining)} days remaining). Issuer: ${cert.issuer?.O || 'Unknown'}`;
            if (daysRemaining < alertDays) {
              reject(new Error(`Certificate expires in ${Math.floor(daysRemaining)} days (alert threshold is ${alertDays})`));
            } else {
              resolve();
            }
          } else {
            reject(new Error(socket.authorizationError?.message || 'Certificate verification failed'));
          }
          socket.end();
        });
        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')); });
        socket.on('error', reject);
      });
      responseTime = Date.now() - startTime;
      success = true;
    }
    else if (monitor.type === 'websocket') {
      let currentUrl = monitor.target;
      const url = new URL(currentUrl);
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        throw new Error('Invalid protocol, must be ws: or wss:');
      }
      const isWss = url.protocol === 'wss:';
      const client = isWss ? https : http;
      const port = url.port || (isWss ? 443 : 80);

      await new Promise<void>((resolve, reject) => {
        const req = client.request({
          hostname: url.hostname,
          port,
          path: url.pathname + url.search,
          headers: {
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': '13',
            'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
            'Host': url.hostname,
            'User-Agent': 'Pingr-Tester/1.0',
          },
          timeout: timeoutMs,
          servername: isWss ? url.hostname : undefined,
        });

        req.on('upgrade', (res, socket) => {
          socket.destroy();
          resolve();
        });

        req.on('response', (res) => {
          reject(new Error(`Server responded with HTTP ${res.statusCode} instead of WebSocket upgrade`));
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('Connection timed out')); });
        req.end();
      });
      responseTime = Date.now() - startTime;
      success = true;
      bodySnippet = 'WebSocket handshake upgraded successfully';
    }
    else if (monitor.type === 'cron') {
      const { CronExpressionParser } = await import('cron-parser');
      const interval = CronExpressionParser.parse(monitor.cronExpression || '*/5 * * * *', {
        tz: monitor.timezone || 'UTC',
        currentDate: new Date(),
      });
      const nextRun = interval.next().toDate();
      responseTime = Date.now() - startTime;
      success = true;
      bodySnippet = `Valid Cron Schedule! Next expected execution: ${nextRun.toUTCString()}`;
    }
    else if (monitor.type === 'heartbeat') {
      responseTime = Date.now() - startTime;
      success = true;
      bodySnippet = `Passive Heartbeat Monitor ready. Send pings to: /api/heartbeat/${monitor.heartbeatSecret || 'YOUR_SECRET'}`;
    }
    else {
      // website, api, supabase, keyword, domain
      let currentUrl = (monitor.target || monitor.url || monitor.projectUrl || monitor.projectRef || '').trim();
      if (monitor.type === 'supabase') {
        const parsed = parseSupabaseTarget(currentUrl);
        currentUrl = parsed.url ? `${parsed.url}/auth/v1/health` : currentUrl;
      }

      const url = new URL(currentUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const headers = typeof monitor.headers === 'string' ? JSON.parse(monitor.headers) : { ...(monitor.headers || {}) };
      if (monitor.type === 'supabase' && monitor.apiKey) {
        headers['apikey'] = monitor.apiKey;
        if (!headers['Authorization']) {
          headers['Authorization'] = `Bearer ${monitor.apiKey}`;
        }
      }

      let pathWithQuery = url.pathname + url.search;
      const queryParams = typeof monitor.queryParameters === 'string' ? JSON.parse(monitor.queryParameters) : (monitor.queryParameters || {});
      if (Object.keys(queryParams).length > 0) {
        const searchParams = new URLSearchParams(url.search);
        for (const [k, v] of Object.entries(queryParams)) {
          searchParams.append(k, v as string);
        }
        pathWithQuery = url.pathname + '?' + searchParams.toString();
      }

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: pathWithQuery,
        method: monitor.method || 'GET',
        headers: {
          'User-Agent': 'Pingr-Tester/1.0',
          'Host': url.hostname,
          ...headers,
        },
        servername: isHttps ? url.hostname : undefined,
        timeout: timeoutMs,
      };

      const res = await new Promise<{ status: number; headers: any; body: string }>((resolve, reject) => {
        const req = client.request(requestOptions, (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            resolve({
              status: response.statusCode || 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf-8'),
            });
          });
        });
        req.on('timeout', () => req.destroy(new Error('Connection timed out')));
        req.on('error', (err) => reject(err));
        if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method as string) && monitor.body) {
          req.write(monitor.body);
        }
        req.end();
      });

      statusCode = res.status;
      responseTime = Date.now() - startTime;
      bodySnippet = res.body ? res.body.slice(0, 300) : '';

      if (monitor.type === 'supabase') {
        const isSupabaseGateway = Boolean(res.headers['sb-project-ref'] || res.headers['sb-gateway-version']);
        success = res.status < 500 || isSupabaseGateway;
        if (!success) {
          errorMessage = `Supabase responded with error status: ${res.status}`;
        }
      } else if (monitor.type === 'keyword') {
        const kw = monitor.keyword || '';
        const contains = res.body.includes(kw);
        const shouldExist = monitor.shouldExist !== false;
        success = (res.status >= 200 && res.status < 300) && (shouldExist ? contains : !contains);
        if (!success) {
          errorMessage = shouldExist ? `Keyword "${kw}" not found in response` : `Unexpected keyword "${kw}" found in response`;
        }
      } else if (monitor.expectedStatus) {
        success = res.status === monitor.expectedStatus;
        if (!success) {
          errorMessage = `Expected status ${monitor.expectedStatus}, got ${res.status}`;
        }
      } else {
        success = res.status >= 200 && res.status < 400;
        if (!success) {
          errorMessage = `HTTP Error ${res.status}`;
        }
      }
    }
  } catch (err: any) {
    success = false;
    errorMessage = err.message || 'Network test failed';
  }

  if (responseTime === 0) responseTime = Date.now() - startTime;

  return {
    success,
    statusCode,
    responseTime,
    errorMessage,
    bodySnippet,
  };
}
