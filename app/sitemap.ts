import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { statusPages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pingr.site';

  const docsRoutes = [
    '/docs',
    '/docs/authentication',
    '/docs/api-keys',
    '/docs/rate-limits',
    '/docs/webhooks',
    '/docs/errors',
    '/docs/api-reference',
    '/docs/monitor-types',
    '/docs/monitor-types/website',
    '/docs/monitor-types/api',
    '/docs/monitor-types/supabase',
    '/docs/monitor-types/cron',
    '/docs/monitor-types/heartbeat',
    '/docs/monitor-types/tcp',
    '/docs/monitor-types/dns',
    '/docs/monitor-types/ssl',
    '/docs/monitor-types/keyword',
    '/docs/monitor-types/websocket',
    '/docs/monitor-types/domain',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  let statusPageRoutes: MetadataRoute.Sitemap = [];
  try {
    const publicPages = await db
      .select({
        slug: statusPages.slug,
        customDomain: statusPages.customDomain,
        updatedAt: statusPages.updatedAt,
      })
      .from(statusPages)
      .where(
        and(
          eq(statusPages.isPublic, true),
          eq(statusPages.includeInSitemap, true)
        )
      );

    statusPageRoutes = publicPages.map((page) => ({
      url: page.customDomain
        ? `https://${page.customDomain}`
        : `${baseUrl}/status/${page.slug}`,
      lastModified: page.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));
  } catch (err) {
    console.error('Error loading status pages for sitemap:', err);
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...docsRoutes,
    ...statusPageRoutes,
  ];
}
