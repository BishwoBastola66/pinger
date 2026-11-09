import { db } from '@/lib/db';
import { statusPages, statusPageComponents, statusPageUpdates, monitors, pingLogs } from '@/lib/db/schema';
import { eq, and, desc, asc, or, gte, sql } from 'drizzle-orm';
import { normalizeDomain } from '@/lib/domains/validation';
import { unstable_cache } from 'next/cache';

export interface PublicDailyUptimePoint {
  date: string; // YYYY-MM-DD
  hasData: boolean;
  totalChecks: number;
  successfulChecks: number;
  uptimePercentage: number | null;
  avgLatencyMs: number | null;
}

export interface PublicMonitorPing {
  statusCode: number | null;
  success: boolean;
  responseTimeMs: number | null;
  timestamp: Date | string;
}

export interface PublicComponentData {
  id: string;
  groupName: string | null;
  position: number;
  monitorId: string;
  monitorName: string;
  monitorType: string;
  monitorStatus: string;
  // lastResponseTime removed
  uptimePercentage: number;
  dailyHistory: PublicDailyUptimePoint[];
  recentPings: PublicMonitorPing[];
}

export interface PublicUpdateData {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date | string;
}

export interface PublicStatusPagePayload {
  page: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    customDomain: string | null;
    updatedAt: Date | string;
  };
  components: PublicComponentData[];
  updates: PublicUpdateData[];
  overallStatus: 'operational' | 'degraded' | 'outage';
}

/**
 * Internal un-cached query fetching safe public status page data.
 * Strictly projects only public fields to prevent any leakage of monitor targets,
 * private headers, authentication tokens, heartbeat secrets, or user metadata.
 */
async function fetchPublicStatusPageDataUncached(
  slugOrDomain: string
): Promise<PublicStatusPagePayload | null> {
  const clean = normalizeDomain(slugOrDomain);
  if (!clean) return null;

  // 1. Resolve status page by exact slug OR exact custom domain
  const [page] = await db
    .select({
      id: statusPages.id,
      title: statusPages.title,
      slug: statusPages.slug,
      description: statusPages.description,
      logoUrl: statusPages.logoUrl,
      customDomain: statusPages.customDomain,
      customDomainStatus: statusPages.customDomainStatus,
      isPublic: statusPages.isPublic,
      updatedAt: statusPages.updatedAt,
    })
    .from(statusPages)
    .where(or(eq(statusPages.slug, clean), eq(statusPages.customDomain, clean)))
    .limit(1);

  if (!page || !page.isPublic) {
    return null;
  }

  // Security gate: If accessed via custom domain, only serve if domain is active or verified
  const isCustomDomainAccess = page.customDomain === clean;
  if (
    isCustomDomainAccess &&
    page.customDomainStatus !== 'active' &&
    page.customDomainStatus !== 'verified'
  ) {
    return null;
  }

  // 2. Fetch public components with strictly projected monitor fields
  // Never expose: monitors.target, headers, body, heartbeatSecret, queryParameters, userId
  const components = await db
    .select({
      id: statusPageComponents.id,
      groupName: statusPageComponents.groupName,
      position: statusPageComponents.position,
      monitorId: monitors.id,
      monitorName: monitors.name,
      monitorType: monitors.type,
      monitorStatus: monitors.status,
    })
    .from(statusPageComponents)
    .innerJoin(monitors, eq(statusPageComponents.monitorId, monitors.id))
    .where(eq(statusPageComponents.statusPageId, page.id))
    .orderBy(asc(statusPageComponents.position), asc(statusPageComponents.createdAt));

  // 3. Compute authentic 90-day daily uptime history and aggregate metrics
  const ninetyDaysAgo = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000);
  ninetyDaysAgo.setUTCHours(0, 0, 0, 0);

  const componentsWithStats: PublicComponentData[] = await Promise.all(
    components.map(async (comp) => {
      // Group all checks by date for the last 90 days directly in the DB
      const dailyAggs = await db
        .select({
          date: sql<string>`DATE(${pingLogs.checkedAt})::text`,
          total: sql<number>`count(*)::int`,
          successful: sql<number>`count(*) filter (where ${pingLogs.success} = true)::int`,
          avgLatency: sql<number | null>`round(avg(${pingLogs.responseTime}))::int`,
        })
        .from(pingLogs)
        .where(
          and(
            eq(pingLogs.monitorId, comp.monitorId),
            gte(pingLogs.checkedAt, ninetyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${pingLogs.checkedAt})::text`)
        .orderBy(sql`DATE(${pingLogs.checkedAt})::text`);

      const dateMap = new Map<string, { total: number; successful: number; avgLatency: number | null }>();
      let totalPingsIn90Days = 0;
      let successfulPingsIn90Days = 0;

      for (const row of dailyAggs) {
        dateMap.set(row.date, {
          total: row.total,
          successful: row.successful,
          avgLatency: row.avgLatency,
        });
        totalPingsIn90Days += row.total;
        successfulPingsIn90Days += row.successful;
      }

      // Generate exact 90 daily points from 89 days ago up to today (chronological order)
      const dailyHistory: PublicDailyUptimePoint[] = [];
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      for (let i = 89; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        const agg = dateMap.get(dateStr);

        if (agg && agg.total > 0) {
          const uptimePct = Number(((agg.successful / agg.total) * 100).toFixed(2));
          dailyHistory.push({
            date: dateStr,
            hasData: true,
            totalChecks: agg.total,
            successfulChecks: agg.successful,
            uptimePercentage: uptimePct,
            avgLatencyMs: agg.avgLatency,
          });
        } else {
          dailyHistory.push({
            date: dateStr,
            hasData: false,
            totalChecks: 0,
            successfulChecks: 0,
            uptimePercentage: null,
            avgLatencyMs: null,
          });
        }
      }

      // Overall uptime percentage over the 90-day window
      let overallUptimePercentage: number;
      if (totalPingsIn90Days > 0) {
        overallUptimePercentage = Number(((successfulPingsIn90Days / totalPingsIn90Days) * 100).toFixed(2));
      } else {
        // If monitor has no checks in last 90 days, reflect current monitor status
        overallUptimePercentage = comp.monitorStatus === 'failing' ? 0 : 100;
      }

      // Fetch a small slice of actual recent pings (latest 10) for diagnostics
      const recentLogs = await db
        .select({
          statusCode: pingLogs.statusCode,
          success: pingLogs.success,
          responseTimeMs: pingLogs.responseTime,
          timestamp: pingLogs.checkedAt,
        })
        .from(pingLogs)
        .where(eq(pingLogs.monitorId, comp.monitorId))
        .orderBy(desc(pingLogs.checkedAt))
        .limit(10);

      return {
        ...comp,
        uptimePercentage: overallUptimePercentage,
        dailyHistory,
        recentPings: recentLogs,
      };
    })
  );

  // 4. Fetch public incident updates
  const updates: PublicUpdateData[] = await db
    .select({
      id: statusPageUpdates.id,
      title: statusPageUpdates.title,
      content: statusPageUpdates.content,
      status: statusPageUpdates.status,
      createdAt: statusPageUpdates.createdAt,
    })
    .from(statusPageUpdates)
    .where(eq(statusPageUpdates.statusPageId, page.id))
    .orderBy(desc(statusPageUpdates.createdAt))
    .limit(20);

  // 5. Calculate overall system health
  const statuses = componentsWithStats.map((c) => c.monitorStatus);
  let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
  if (statuses.some((s) => s === 'failing')) {
    overallStatus = 'outage';
  } else if (statuses.some((s) => s === 'degraded')) {
    overallStatus = 'degraded';
  }

  return {
    page: {
      id: page.id,
      title: page.title,
      slug: page.slug,
      description: page.description,
      logoUrl: page.logoUrl,
      customDomain: page.customDomain,
      updatedAt: page.updatedAt,
    },
    components: componentsWithStats,
    updates,
    overallStatus,
  };
}

/**
 * Public Data Access Layer for Status Pages.
 * 
 * - Does NOT require an authenticated session or cookies.
 * - Does NOT call the Vercel management API.
 * - Enforces tenant-isolated caching keyed by normalized slug/hostname.
 * - Cache key: ['public-status-page', cleanIdentifier]
 * - Cache tag: 'status-page-[cleanIdentifier]'
 */
export async function getPublicStatusPageData(
  slugOrDomain: string
): Promise<PublicStatusPagePayload | null> {
  const clean = normalizeDomain(slugOrDomain);
  if (!clean) return null;

  try {
    const getCachedData = unstable_cache(
      async () => fetchPublicStatusPageDataUncached(clean),
      ['public-status-page', clean],
      {
        revalidate: 30, // 30 seconds edge/server cache
        tags: ['status-page', `status-page-${clean}`],
      }
    );

    return await getCachedData();
  } catch (err: any) {
    // If running in standalone test runner or worker outside Next.js request lifecycle
    if (err?.message?.includes('incrementalCache')) {
      return fetchPublicStatusPageDataUncached(clean);
    }
    throw err;
  }
}
