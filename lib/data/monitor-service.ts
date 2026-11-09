import { db } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  monitors as monitorsTable, website, api, tcp, dns, ssl, cron, heartbeat, keyword, websocket, domain as domainTable, supabase 
} from '@/lib/db/schema';

export async function getMonitorsByWorkspace(workspaceId: string) {
  const baseMonitors = await db.select().from(monitorsTable).where(eq(monitorsTable.workspaceId, workspaceId));
  return await hydrateMonitors(baseMonitors);
}

export async function getMonitorById(id: string, workspaceId: string, executor: any = db) {
  const [base] = await executor.select().from(monitorsTable).where(and(eq(monitorsTable.id, id), eq(monitorsTable.workspaceId, workspaceId))).limit(1);
  if (!base) return null;
  const hydrated = await hydrateMonitors([base], executor);
  return hydrated[0];
}

export function parseSupabaseTarget(input: string): { ref: string; url: string } {
  let cleaned = (input || '').trim();
  while (/^https?:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^https?:\/\//i, '');
  }
  cleaned = cleaned.split('/')[0];
  while (cleaned.endsWith('.supabase.co')) {
    cleaned = cleaned.slice(0, -'.supabase.co'.length);
  }
  const ref = cleaned;
  const url = ref ? `https://${ref}.supabase.co` : '';
  return { ref, url };
}

async function hydrateMonitors(baseMonitors: any[], executor: any = db) {
  if (baseMonitors.length === 0) return [];
  
  const grouped = baseMonitors.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m.id);
    return acc;
  }, {} as Record<string, string[]>);

  const extras: Record<string, any> = {};

  if (grouped.website?.length) {
    const rows = await executor.select().from(website).where(inArray(website.monitorId, grouped.website));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.url });
  }
  if (grouped.api?.length) {
    const rows = await executor.select().from(api).where(inArray(api.monitorId, grouped.api));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.url });
  }
  if (grouped.tcp?.length) {
    const rows = await executor.select().from(tcp).where(inArray(tcp.monitorId, grouped.tcp));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.host });
  }
  if (grouped.dns?.length) {
    const rows = await executor.select().from(dns).where(inArray(dns.monitorId, grouped.dns));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.domain });
  }
  if (grouped.ssl?.length) {
    const rows = await executor.select().from(ssl).where(inArray(ssl.monitorId, grouped.ssl));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.host });
  }
  if (grouped.cron?.length) {
    const rows = await executor.select().from(cron).where(inArray(cron.monitorId, grouped.cron));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: 'cron' });
  }
  if (grouped.heartbeat?.length) {
    const rows = await executor.select().from(heartbeat).where(inArray(heartbeat.monitorId, grouped.heartbeat));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: 'heartbeat' });
  }
  if (grouped.keyword?.length) {
    const rows = await executor.select().from(keyword).where(inArray(keyword.monitorId, grouped.keyword));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.url });
  }
  if (grouped.websocket?.length) {
    const rows = await executor.select().from(websocket).where(inArray(websocket.monitorId, grouped.websocket));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.url });
  }
  if (grouped.domain?.length) {
    const rows = await executor.select().from(domainTable).where(inArray(domainTable.monitorId, grouped.domain));
    rows.forEach((r: any) => extras[r.monitorId] = { ...r, target: r.domain });
  }
  if (grouped.supabase?.length) {
    const rows = await executor.select().from(supabase).where(inArray(supabase.monitorId, grouped.supabase));
    rows.forEach((r: any) => {
      const parsed = parseSupabaseTarget(r.projectUrl || r.projectRef || '');
      const cleanRef = parsed.ref || r.projectRef;
      const cleanUrl = parsed.url || (cleanRef ? `https://${cleanRef}.supabase.co` : '');
      extras[r.monitorId] = {
        ...r,
        projectRef: cleanRef,
        projectUrl: cleanUrl,
        target: cleanUrl
      };
    });
  }

  return baseMonitors.map((m: any) => {
    const ext = extras[m.id] || {};
    return { ...m, ...ext };
  });
}

export async function createMonitor(workspaceId: string, data: any) {
  return await db.transaction(async (tx) => {
    const [base] = await tx.insert(monitorsTable).values({
      workspaceId,
      name: data.name,
      type: data.type,
      enabled: data.enabled ?? true,
      tags: data.tags ?? [],
      failureThreshold: data.failureThreshold ?? 1,
    }).returning();

    const monitorId = base.id;

    if (data.type === 'website') {
      await tx.insert(website).values({ monitorId, url: data.target, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'api') {
      await tx.insert(api).values({ monitorId, url: data.target, method: data.method, headers: data.headers, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'tcp') {
      await tx.insert(tcp).values({ monitorId, host: data.target, port: data.port, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'dns') {
      await tx.insert(dns).values({ monitorId, domain: data.target, dnsQueryType: data.dnsQueryType, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'ssl') {
      await tx.insert(ssl).values({ monitorId, host: data.target, port: data.port || 443, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'cron') {
      await tx.insert(cron).values({ monitorId, cronExpression: data.cronExpression });
    } else if (data.type === 'heartbeat') {
      await tx.insert(heartbeat).values({ monitorId, intervalSeconds: data.intervalSeconds, heartbeatSecret: data.heartbeatSecret });
    } else if (data.type === 'keyword') {
      await tx.insert(keyword).values({ monitorId, url: data.target, keyword: data.keyword || '', intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'websocket') {
      await tx.insert(websocket).values({ monitorId, url: data.target, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'domain') {
      await tx.insert(domainTable).values({ monitorId, domain: data.target, intervalSeconds: data.intervalSeconds });
    } else if (data.type === 'supabase') {
      const parsed = parseSupabaseTarget(data.projectUrl || data.target || data.url || data.projectRef || '');
      await tx.insert(supabase).values({
        monitorId,
        projectRef: parsed.ref,
        projectUrl: parsed.url,
        jwtSecret: data.jwtSecret || null,
        apiKey: data.apiKey || null,
        intervalSeconds: data.intervalSeconds || 60,
      });
    }

    return await getMonitorById(monitorId, workspaceId, tx);
  });
}

export async function updateMonitor(id: string, workspaceId: string, data: any) {
  return await db.transaction(async (tx) => {
    // 1. Fetch current type
    const [current] = await tx.select({ type: monitorsTable.type }).from(monitorsTable).where(and(eq(monitorsTable.id, id), eq(monitorsTable.workspaceId, workspaceId))).limit(1);
    if (!current) throw new Error('Monitor not found');

    const type = current.type;

    // 2. Update base fields
    const baseFields = ['name', 'status', 'enabled', 'tags', 'failureThreshold'];
    const baseData: any = {};
    for (const f of baseFields) if (data[f] !== undefined) baseData[f] = data[f];

    if (Object.keys(baseData).length > 0) {
      await tx.update(monitorsTable).set({ ...baseData, updatedAt: new Date() }).where(eq(monitorsTable.id, id));
    }

    // 3. Update child fields
    const childData: any = {};
    const childFields = ['intervalSeconds', 'timeoutSeconds', 'retryIntervalSeconds', 'expectedStatus', 'method', 'headers', 'queryParameters', 'body', 'assertions', 'port', 'dnsQueryType', 'sslDaysBeforeExpiryAlert', 'cronExpression', 'timezone', 'gracePeriodSeconds', 'heartbeatSecret', 'keyword', 'jwtSecret', 'apiKey'];
    for (const f of childFields) if (data[f] !== undefined) childData[f] = data[f];
    
    // Map 'target' based on type
    if (data.target !== undefined) {
      if (['website', 'api', 'keyword', 'websocket'].includes(type)) childData.url = data.target;
      else if (['tcp', 'ssl'].includes(type)) childData.host = data.target;
      else if (['dns', 'domain'].includes(type)) childData.domain = data.target;
      else if (type === 'supabase') {
        const parsed = parseSupabaseTarget(data.target || data.projectUrl || data.projectRef || '');
        childData.projectRef = parsed.ref;
        childData.projectUrl = parsed.url;
      }
    }

    if (Object.keys(childData).length > 0) {
      if (type === 'website') await tx.update(website).set(childData).where(eq(website.monitorId, id));
      else if (type === 'api') await tx.update(api).set(childData).where(eq(api.monitorId, id));
      else if (type === 'tcp') await tx.update(tcp).set(childData).where(eq(tcp.monitorId, id));
      else if (type === 'dns') await tx.update(dns).set(childData).where(eq(dns.monitorId, id));
      else if (type === 'ssl') await tx.update(ssl).set(childData).where(eq(ssl.monitorId, id));
      else if (type === 'cron') await tx.update(cron).set(childData).where(eq(cron.monitorId, id));
      else if (type === 'heartbeat') await tx.update(heartbeat).set(childData).where(eq(heartbeat.monitorId, id));
      else if (type === 'keyword') await tx.update(keyword).set(childData).where(eq(keyword.monitorId, id));
      else if (type === 'websocket') await tx.update(websocket).set(childData).where(eq(websocket.monitorId, id));
      else if (type === 'domain') await tx.update(domainTable).set(childData).where(eq(domainTable.monitorId, id));
      else if (type === 'supabase') await tx.update(supabase).set(childData).where(eq(supabase.monitorId, id));
    }

    return await getMonitorById(id, workspaceId, tx);
  });
}

export async function deleteMonitor(id: string, workspaceId: string) {
  const [deleted] = await db.delete(monitorsTable)
    .where(and(eq(monitorsTable.id, id), eq(monitorsTable.workspaceId, workspaceId)))
    .returning();
  return deleted;
}

import { sql } from 'drizzle-orm';

export async function claimDueMonitors(limit: number = 20) {
  const childTables = ['website', 'api', 'tcp', 'dns', 'ssl', 'keyword', 'websocket', 'domain', 'supabase'];
  let claimedIds: { id: string, type: string }[] = [];
  
  for (const table of childTables) {
    if (claimedIds.length >= limit) break;
    const remaining = limit - claimedIds.length;
    
    // Use raw SQL for SKIP LOCKED since drizzle doesn't natively support it easily in updates returning
    const res = await db.execute(sql.raw(`
      UPDATE ${table} 
      SET locked_at = NOW() 
      WHERE monitor_id IN (
        SELECT w.monitor_id FROM ${table} w
        JOIN monitors m ON m.id = w.monitor_id
        WHERE m.enabled = true 
          AND w.next_ping_at <= NOW()
          AND (w.locked_at IS NULL OR w.locked_at < NOW() - INTERVAL '2 minutes')
          AND NOT EXISTS (
            SELECT 1 FROM maintenance_windows mw 
            WHERE mw.monitor_id = m.id 
              AND NOW() BETWEEN mw.start_time AND mw.end_time
          )
        ORDER BY w.next_ping_at ASC 
        FOR UPDATE SKIP LOCKED
        LIMIT ${remaining}
      )
      RETURNING monitor_id;
    `));
    
    for (const row of res as any[]) {
      claimedIds.push({ id: row.monitor_id || row.monitorId, type: table });
    }
  }

  if (claimedIds.length === 0) return [];

  // Fetch the full hydrated monitors
  const baseMonitors = await db.select().from(monitorsTable).where(inArray(monitorsTable.id, claimedIds.map(c => c.id)));
  return await hydrateMonitors(baseMonitors);
}

export async function updateMonitorPingResult(tx: any, id: string, type: string, newStatus: string, consecutiveFailures: number, nextPingAt: Date, lastStatusCode: number | null, lastResponseTime: number) {
  // Update base
  await tx.execute(sql`
    UPDATE monitors 
    SET status = ${newStatus},
        consecutive_failures = ${consecutiveFailures},
        last_ping_at = NOW()
    WHERE id = ${id}
  `);

  // Update child
  const childTables = ['website', 'api', 'tcp', 'dns', 'ssl', 'cron', 'heartbeat', 'keyword', 'websocket', 'domain', 'supabase'];
  if (childTables.includes(type)) {
    const hasStatusCode = ['website', 'api'].includes(type);
    const hasResponseTime = ['website', 'api', 'tcp', 'dns', 'ssl', 'keyword', 'websocket', 'domain', 'supabase'].includes(type);

    const setClauses: string[] = [
      `next_ping_at = '${nextPingAt.toISOString()}'`,
      `locked_at = NULL`
    ];

    if (hasStatusCode) {
      setClauses.push(`last_status_code = ${lastStatusCode !== null ? lastStatusCode : 'NULL'}`);
    }
    if (hasResponseTime) {
      setClauses.push(`last_response_time = ${lastResponseTime}`);
    }

    await tx.execute(sql.raw(`
      UPDATE ${type}
      SET ${setClauses.join(', ')}
      WHERE monitor_id = '${id}'
    `));
  }
}

export async function claimPassiveMonitors(limit: number = 20) {
  const childTables = ['cron', 'heartbeat'];
  let claimedIds: { id: string, type: string }[] = [];
  
  for (const table of childTables) {
    if (claimedIds.length >= limit) break;
    const remaining = limit - claimedIds.length;
    
    const res = await db.execute(sql.raw(`
      UPDATE ${table} 
      SET locked_at = NOW() 
      WHERE monitor_id IN (
        SELECT w.monitor_id FROM ${table} w
        JOIN monitors m ON m.id = w.monitor_id
        WHERE m.enabled = true 
          AND w.next_ping_at <= NOW()
          AND (w.locked_at IS NULL OR w.locked_at < NOW() - INTERVAL '2 minutes')
          AND NOT EXISTS (
            SELECT 1 FROM maintenance_windows mw 
            WHERE mw.monitor_id = m.id 
              AND NOW() BETWEEN mw.start_time AND mw.end_time
          )
        ORDER BY w.next_ping_at ASC 
        FOR UPDATE SKIP LOCKED
        LIMIT ${remaining}
      )
      RETURNING monitor_id;
    `));
    
    for (const row of res as any[]) {
      claimedIds.push({ id: row.monitor_id || row.monitorId, type: table });
    }
  }

  if (claimedIds.length === 0) return [];
  const baseMonitors = await db.select().from(monitorsTable).where(inArray(monitorsTable.id, claimedIds.map(c => c.id)));
  return await hydrateMonitors(baseMonitors);
}

export async function getRemainingDueCount() {
  const childTables = ['website', 'api', 'tcp', 'dns', 'ssl', 'keyword', 'websocket', 'domain', 'supabase'];
  let count = 0;
  for (const table of childTables) {
    const res = await db.execute(sql.raw(`
      SELECT COUNT(*) as count 
      FROM ${table} w
      JOIN monitors m ON m.id = w.monitor_id
      WHERE m.enabled = true 
        AND w.next_ping_at <= NOW()
        AND (w.locked_at IS NULL OR w.locked_at < NOW() - INTERVAL '2 minutes')
    `));
    count += parseInt((res[0] as any)?.count || '0', 10);
  }
  return count;
}
