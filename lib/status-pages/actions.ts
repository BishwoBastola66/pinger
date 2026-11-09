'use server';

import { db } from '@/lib/db';
import { statusPages, statusPageComponents, statusPageUpdates, monitors, pingLogs, subscriptions, plans } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { getActiveWorkspaceId } from '@/lib/data/dashboard';
import { withUserContext } from '@/lib/db/rls';
import { eq, and, desc, sql, asc, or, gte, isNull, inArray } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import { normalizeDomain, validateDomain } from '@/lib/domains/validation';
import { addDomainToVercel, removeDomainFromVercel } from '@/lib/domains/vercel';


function purgeTag(tag: string) {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch {
    // In dev or test environments outside full next server context
  }
}

const domainActionRateLimit = new Map<string, { count: number; timestamp: number }>();

function checkDomainRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = domainActionRateLimit.get(key);
  if (!record || now - record.timestamp > windowMs) {
    domainActionRateLimit.set(key, { count: 1, timestamp: now });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

/**
 * Deterministic account-level verification token.
 * Consistent across all domains owned by the user account, matching standard platform architecture (e.g. Vercel, Supabase).
 */
function getUserVerificationToken(userId: string): string {
  const secret = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY || 'pingr_dns_verification_secret_seed';
  const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex').substring(0, 32);
  return `pingr_verify_${hash}`;
}

export interface StatusPageComponentInput {
  monitorId: string;
  groupName?: string;
  position?: number;
}

export interface StatusPageConfigInput {
  title: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  customDomain?: string;
  isPublic?: boolean;
  includeInSitemap?: boolean;
}

export async function getUserStatusPage() {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
const [page] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId))
    .limit(1);

  // All custom domains associated with this user
  const allUserPages = await db
    .select({
      id: statusPages.id,
      customDomain: statusPages.customDomain,
      customDomainStatus: statusPages.customDomainStatus,
    })
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId));

  const availableDomains = Array.from(
    new Set(
      allUserPages
        .map((p) => p.customDomain)
        .filter((d): d is string => Boolean(d))
    )
  );

  // All monitors owned by the user (for the "what to show" selector)
  const userMonitors = await db
    .select({
      id: monitors.id,
      name: monitors.name,
      target: sql`''`,
      type: monitors.type,
      status: monitors.status,
      monitorStatus: monitors.status,
    })
    .from(monitors)
    .where(eq(monitors.workspaceId, workspaceId))
    .orderBy(desc(monitors.createdAt));

  if (!page) {
    return {
      statusPage: null,
      components: [],
      updates: [],
      allMonitors: userMonitors,
      availableDomains,
    };
  }

  // Selected components
  const components = await db
    .select({
      id: statusPageComponents.id,
      monitorId: statusPageComponents.monitorId,
      groupName: statusPageComponents.groupName,
      position: statusPageComponents.position,
      createdAt: statusPageComponents.createdAt,
      monitorName: monitors.name,
      monitorTarget: sql`''`,
      monitorStatus: monitors.status,
      monitorType: monitors.type,
    })
    .from(statusPageComponents)
    .innerJoin(monitors, eq(statusPageComponents.monitorId, monitors.id))
    .where(eq(statusPageComponents.statusPageId, page.id))
    .orderBy(asc(statusPageComponents.position), asc(statusPageComponents.createdAt));

  // Incident & maintenance updates
  const updates = await db
    .select()
    .from(statusPageUpdates)
    .where(eq(statusPageUpdates.statusPageId, page.id))
    .orderBy(desc(statusPageUpdates.createdAt));

  return {
    statusPage: page,
    components,
    updates,
    allMonitors: userMonitors,
    availableDomains,
  };
}

export async function saveStatusPageConfig(data: StatusPageConfigInput) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
const title = data.title?.trim();
  if (!title) throw new Error('Status page title is required');

  const rawSlug = data.slug?.trim().toLowerCase();
  if (!rawSlug) throw new Error('Status page slug is required');

  const slug = rawSlug.replace(/[^a-z0-9-_]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new Error('Valid slug is required (alphanumeric and hyphens only)');

  let customDomain = data.customDomain ? normalizeDomain(data.customDomain) : null;
  if (customDomain) {
    const val = validateDomain(customDomain);
    if (!val.valid) throw new Error(val.error);
  }

  // Check slug uniqueness
  const [existingSlug] = await db
    .select({ id: statusPages.id, userId: statusPages.workspaceId })
    .from(statusPages)
    .where(eq(statusPages.slug, slug))
    .limit(1);

  if (existingSlug && existingSlug.userId !== user.id) {
    throw new Error('This slug is already taken. Please choose another.');
  }

  // Check custom domain uniqueness
  if (customDomain) {
    const [existingDomain] = await db
      .select({ id: statusPages.id, userId: statusPages.workspaceId })
      .from(statusPages)
      .where(eq(statusPages.customDomain, customDomain))
      .limit(1);

    if (existingDomain && existingDomain.userId !== user.id) {
      throw new Error('This custom domain is already linked to another status page.');
    }
  }

  let statusPageId: string;

  const [existingUserPage] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId))
    .limit(1);

  if (existingUserPage) {
    const isDomainChanging = customDomain !== existingUserPage.customDomain;
    let customDomainStatus = existingUserPage.customDomainStatus;
    let customDomainVerificationToken = existingUserPage.customDomainVerificationToken;
    let customDomainVerificationTxt = existingUserPage.customDomainVerificationTxt;
    let customDomainVerifiedAt = existingUserPage.customDomainVerifiedAt;
    let customDomainError = existingUserPage.customDomainError;

    if (isDomainChanging) {
      if (customDomain) {
        customDomainStatus = 'pending';
        customDomainVerificationToken = getUserVerificationToken(user.id);
        customDomainVerificationTxt = `_pingr-verification.${customDomain}`;
        customDomainVerifiedAt = null;
        customDomainError = null;
      } else {
        customDomainStatus = 'none';
        customDomainVerificationToken = null;
        customDomainVerificationTxt = null;
        customDomainVerifiedAt = null;
        customDomainError = null;
      }
    }

    await db
      .update(statusPages)
      .set({
        title,
        slug,
        description: data.description?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
        customDomain,
        customDomainStatus,
        customDomainVerificationToken,
        customDomainVerificationTxt,
        customDomainVerifiedAt,
        customDomainError,
        isPublic: data.isPublic ?? true,
        includeInSitemap: data.includeInSitemap ?? true,
        updatedAt: new Date(),
      })
      .where(eq(statusPages.id, existingUserPage.id));

    statusPageId = existingUserPage.id;
  } else {
    let customDomainStatus = 'none';
    let customDomainVerificationToken: string | null = null;
    let customDomainVerificationTxt: string | null = null;

    if (customDomain) {
      customDomainStatus = 'pending';
      customDomainVerificationToken = getUserVerificationToken(user.id);
      customDomainVerificationTxt = `_pingr-verification.${customDomain}`;
    }

    const [newPage] = await db
      .insert(statusPages)
      .values({
        workspaceId: workspaceId,
        title,
        slug,
        description: data.description?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
        customDomain,
        customDomainStatus,
        customDomainVerificationToken,
        customDomainVerificationTxt,
        isPublic: data.isPublic ?? true,
        includeInSitemap: data.includeInSitemap ?? true,
      })
      .returning();

    statusPageId = newPage.id;
  }

  revalidatePath('/dashboard/branding');
  revalidatePath('/dashboard/domains');
  revalidatePath(`/status/${slug}`);
  purgeTag('status-page');
  purgeTag(`status-page-${slug}`);
  if (customDomain) {
    purgeTag(`status-page-${customDomain}`);
  }
  return { success: true, statusPageId, slug };
}

export async function updateStatusPageComponents(statusPageId: string, items: StatusPageComponentInput[]) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
// Verify ownership
  const [page] = await db
    .select()
    .from(statusPages)
    .where(and(eq(statusPages.id, statusPageId), eq(statusPages.workspaceId, workspaceId)))
    .limit(1);

  if (!page) throw new Error('Status page not found');

  // Verify that all monitor IDs belong to user
  if (items.length > 0) {
    const monitorIds = items.map((i) => i.monitorId);
    const userMonitors = await db
      .select({ id: monitors.id })
      .from(monitors)
      .where(eq(monitors.workspaceId, workspaceId));
    const ownedIds = new Set(userMonitors.map((m) => m.id));

    for (const id of monitorIds) {
      if (!ownedIds.has(id)) {
        throw new Error('Unauthorized monitor selected');
      }
    }
  }

  // Atomic sync of components
  await withUserContext(user.id, user.role, async (tx) => {
    await tx.delete(statusPageComponents).where(eq(statusPageComponents.statusPageId, statusPageId));

    if (items.length > 0) {
      await tx.insert(statusPageComponents).values(
        items.map((item, index) => ({
          statusPageId,
          monitorId: item.monitorId,
          groupName: item.groupName?.trim() || 'General Services',
          position: item.position ?? index,
        }))
      );
    }
  });

  revalidatePath('/dashboard/branding');
  revalidatePath('/dashboard/domains');
  revalidatePath(`/status/${page.slug}`);
  purgeTag('status-page');
  purgeTag(`status-page-${page.slug}`);
  if (page.customDomain) {
    purgeTag(`status-page-${page.customDomain}`);
  }
  return { success: true };
}

export async function createStatusPageUpdate(
  statusPageId: string,
  data: { title: string; content: string; status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'maintenance' }
) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
const [page] = await db
    .select()
    .from(statusPages)
    .where(and(eq(statusPages.id, statusPageId), eq(statusPages.workspaceId, workspaceId)))
    .limit(1);

  if (!page) throw new Error('Status page not found');

  if (!data.title?.trim() || !data.content?.trim()) {
    throw new Error('Title and content are required for incident updates');
  }

  await db.insert(statusPageUpdates).values({
    statusPageId,
    title: data.title.trim(),
    content: data.content.trim(),
    status: data.status,
  });

  revalidatePath('/dashboard/incidents');
  revalidatePath('/dashboard/branding');
  revalidatePath(`/status/${page.slug}`);
  purgeTag('status-page');
  purgeTag(`status-page-${page.slug}`);
  if (page.customDomain) {
    purgeTag(`status-page-${page.customDomain}`);
  }
  return { success: true };
}

export async function deleteStatusPageUpdate(updateId: string) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
const [update] = await db
    .select({ id: statusPageUpdates.id, statusPageId: statusPageUpdates.statusPageId, slug: statusPages.slug, customDomain: statusPages.customDomain })
    .from(statusPageUpdates)
    .innerJoin(statusPages, eq(statusPageUpdates.statusPageId, statusPages.id))
    .where(and(eq(statusPageUpdates.id, updateId), eq(statusPages.workspaceId, workspaceId)))
    .limit(1);

  if (!update) throw new Error('Update not found or unauthorized');

  await db.delete(statusPageUpdates).where(eq(statusPageUpdates.id, updateId));

  revalidatePath('/dashboard/incidents');
  revalidatePath('/dashboard/branding');
  revalidatePath(`/status/${update.slug}`);
  purgeTag('status-page');
  purgeTag(`status-page-${update.slug}`);
  if (update.customDomain) {
    purgeTag(`status-page-${update.customDomain}`);
  }
  return { success: true };
}

export async function configureCustomDomain(statusPageIdOrDomain: string, maybeRawDomain?: string) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
if (!checkDomainRateLimit(`cfg_${user.id}`, 10, 5 * 60 * 1000)) {
    throw new Error('Too many custom domain configuration requests. Please wait a few minutes.');
  }

  const rawDomain = maybeRawDomain !== undefined ? maybeRawDomain : statusPageIdOrDomain;
  const statusPageId = maybeRawDomain !== undefined ? statusPageIdOrDomain : undefined;

  let page: any = null;
  if (statusPageId) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(and(eq(statusPages.id, statusPageId), eq(statusPages.workspaceId, workspaceId)))
      .limit(1);
    page = p;
  }

  if (!page) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.workspaceId, workspaceId))
      .limit(1);
    page = p;
  }

  if (!page) {
    const defaultSlug = `status-${user.id.slice(0, 8)}`;
    const [newPage] = await db
      .insert(statusPages)
      .values({
        workspaceId: workspaceId,
        title: 'System Status',
        slug: defaultSlug,
        description: 'Real-time status updates for all operational services.',
        isPublic: true,
      })
      .returning();
    page = newPage;
  }

  const domain = normalizeDomain(rawDomain);
  const validation = validateDomain(domain);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid domain');
  }

  // Check global uniqueness across status_pages
  const [existingDomain] = await db
    .select({ id: statusPages.id, userId: statusPages.workspaceId })
    .from(statusPages)
    .where(eq(statusPages.customDomain, domain))
    .limit(1);

  if (existingDomain && existingDomain.id !== page.id) {
    throw new Error('This custom domain is already claimed by another status page.');
  }

  // Generate cryptographically secure deterministic account verification token
  const token = getUserVerificationToken(user.id);
  const txtRecordHost = `_pingr-verification.${domain}`;

  await db
    .update(statusPages)
    .set({
      customDomain: domain,
      customDomainStatus: 'pending',
      customDomainVerificationToken: token,
      customDomainVerificationTxt: txtRecordHost,
      customDomainError: null,
      updatedAt: new Date(),
    })
    .where(eq(statusPages.id, page.id));

  revalidatePath('/dashboard/branding');
  revalidatePath('/dashboard/domains');
  purgeTag('status-page');
  purgeTag(`status-page-${domain}`);
  return {
    success: true,
    pageId: page.id,
    domain,
    txtRecordHost,
    verificationToken: token,
    status: 'pending' as const,
  };
}

export async function verifyCustomDomain(statusPageId?: string) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
if (!checkDomainRateLimit(`verify_${user.id}`, 60, 5 * 60 * 1000)) {
    throw new Error('Too many verification requests. Please wait a moment before retrying.');
  }

  let page: any = null;
  if (statusPageId) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(and(eq(statusPages.id, statusPageId), eq(statusPages.workspaceId, workspaceId)))
      .limit(1);
    page = p;
  }

  if (!page) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.workspaceId, workspaceId))
      .limit(1);
    page = p;
  }

  if (!page || !page.customDomain || !page.customDomainVerificationToken) {
    throw new Error('No custom domain configured on this status page');
  }

  const domain = page.customDomain;
  const accountToken = getUserVerificationToken(user.id);
  const expectedToken = page.customDomainVerificationToken || accountToken;
  const txtHost = page.customDomainVerificationTxt || `_pingr-verification.${domain}`;
  const configuredCnameTarget = process.env.CNAME_TARGET || 'cname.pingr.site';
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'pingr.site';

  // Step 1: Vercel Edge API Auto-Provisioning & Routing Check
  const vercelResult = await addDomainToVercel(domain);

  // Step 2: CNAME / Routing Check
  let cnameConfigured = false;
  let cnameValues: string[] = [];
  try {
    cnameValues = await dns.resolveCname(domain);
    const validTargets = [
      configuredCnameTarget.toLowerCase(),
      'cname.pingr.site',
      'cname.vercel-dns.com',
      appDomain.toLowerCase(),
    ];
    cnameConfigured = cnameValues.some((c) =>
      validTargets.some((vt) => c.toLowerCase() === vt || c.toLowerCase().endsWith(`.${vt}`))
    );
  } catch {
    cnameConfigured = false;
  }

  // Step 3: IP Lookup
  let resolvedIp: string | null = null;
  try {
    const lookup = await dns.lookup(domain);
    resolvedIp = lookup.address;
  } catch {
    resolvedIp = null;
  }

  // Step 4: Ownership Verification Check
  let txtVerified = false;
  let txtError: string | null = null;

  // If Vercel Edge already verified ownership (e.g. project domain or Vercel DNS zone), ownership is guaranteed!
  if (vercelResult.success && vercelResult.verified) {
    txtVerified = true;
  } else {
    // Otherwise, check authoritative TXT record
    try {
      const rawRecords = await dns.resolveTxt(txtHost);
      const foundTxtRecords = rawRecords.map((r) => r.join(''));
      txtVerified = foundTxtRecords.some((val) => {
        const clean = val.trim();
        return clean === expectedToken.trim() || clean === accountToken.trim();
      });
      if (!txtVerified) {
        txtError = `TXT record found at ${txtHost}, but the verification token did not match.`;
      }
    } catch (err: any) {
      const code = err.code || err.syscall;
      const isNotFound = code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN';
      txtError = isNotFound
        ? `No TXT record found at ${txtHost}. Please ensure you added the TXT record in your DNS provider.`
        : `DNS query failed: ${err.message}. Propagation can take several minutes.`;
    }
  }

  // If ownership is not verified yet, return failed
  if (!txtVerified) {
    await db
      .update(statusPages)
      .set({
        customDomainStatus: 'failed',
        customDomainError: txtError,
        updatedAt: new Date(),
      })
      .where(eq(statusPages.id, page.id));

    revalidatePath('/dashboard/branding');
    revalidatePath('/dashboard/domains');
    purgeTag('status-page');
    purgeTag(`status-page-${domain}`);
    return {
      success: false,
      status: 'failed' as const,
      step: 'ownership',
      error: txtError,
    };
  }

  // Determine final lifecycle state
  let newStatus: 'active' | 'verified' | 'failed' = 'verified';
  let statusMessage: string | null = null;

  if (cnameConfigured || resolvedIp || (vercelResult.success && vercelResult.verified)) {
    newStatus = 'active';
    statusMessage = null;
  } else {
    newStatus = 'verified';
    statusMessage = `Ownership verified! CNAME record is still propagating or not pointing to ${configuredCnameTarget}.`;
  }

  await db
    .update(statusPages)
    .set({
      customDomainStatus: newStatus,
      customDomainVerifiedAt: newStatus === 'active' ? new Date() : page.customDomainVerifiedAt,
      customDomainError: statusMessage,
      updatedAt: new Date(),
    })
    .where(eq(statusPages.id, page.id));

  revalidatePath('/dashboard/branding');
  revalidatePath('/dashboard/domains');
  purgeTag('status-page');
  purgeTag(`status-page-${domain}`);
  return {
    success: true,
    status: newStatus,
    domain,
    txtVerified: true,
    cnameConfigured,
    resolvedIp,
    vercelConfigured: vercelResult.success,
    message: newStatus === 'active'
      ? `Domain ${domain} is verified and active! Status page is live.`
      : statusMessage,
  };
}

export async function removeCustomDomain(statusPageId?: string) {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
if (!checkDomainRateLimit(`remove_${user.id}`, 10, 5 * 60 * 1000)) {
    throw new Error('Too many domain removal attempts. Please wait a few minutes.');
  }

  let page: any = null;
  if (statusPageId) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(and(eq(statusPages.id, statusPageId), eq(statusPages.workspaceId, workspaceId)))
      .limit(1);
    page = p;
  }

  if (!page) {
    const [p] = await db
      .select()
      .from(statusPages)
      .where(eq(statusPages.workspaceId, workspaceId))
      .limit(1);
    page = p;
  }

  if (!page) throw new Error('Status page not found');

  const removedDomain = page.customDomain;

  if (removedDomain) {
    await removeDomainFromVercel(removedDomain);
  }

  const allUserPages = await db
    .select({ id: statusPages.id })
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId));

  if (allUserPages.length > 1) {
    await db.delete(statusPageComponents).where(eq(statusPageComponents.statusPageId, page.id));
    await db.delete(statusPages).where(eq(statusPages.id, page.id));
  } else {
    await db
      .update(statusPages)
      .set({
        customDomain: null,
        customDomainStatus: 'none',
        customDomainVerificationToken: null,
        customDomainVerificationTxt: null,
        customDomainVerifiedAt: null,
        customDomainError: null,
        updatedAt: new Date(),
      })
      .where(eq(statusPages.id, page.id));
  }

  revalidatePath('/dashboard/branding');
  revalidatePath('/dashboard/domains');
  purgeTag('status-page');
  if (removedDomain) {
    purgeTag(`status-page-${removedDomain}`);
  }
  return { success: true };
}

export async function verifyDnsRecord(domain: string) {
  const cleanDomain = normalizeDomain(domain);
  const configuredTarget = process.env.CNAME_TARGET || 'cname.pingr.site';
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'pingr.site';

  const acceptedTargets = [
    configuredTarget.toLowerCase(),
    'cname.pingr.site',
    'cname.vercel-dns.com',
    appDomain.toLowerCase(),
  ];

  try {
    const cnames = await dns.resolveCname(cleanDomain);
    const matchedTarget = cnames.find((c) =>
      acceptedTargets.some((target) => c.toLowerCase() === target || c.toLowerCase().endsWith(`.${target}`))
    );

    let resolvedIp: string | null = null;
    try {
      const lookup = await dns.lookup(cleanDomain);
      resolvedIp = lookup.address;
    } catch {
      // no ip
    }

    if (matchedTarget) {
      return {
        success: true,
        configured: true,
        cnames,
        resolvedIp,
        expected: configuredTarget,
        message: `CNAME successfully verified pointing to ${matchedTarget}.${resolvedIp ? ` (Resolved IP: ${resolvedIp})` : ''}`,
      };
    }

    return {
      success: true,
      configured: false,
      cnames,
      expected: configuredTarget,
      message: `CNAME currently points to ${cnames.join(', ')}. Please point it to ${configuredTarget} (or ${appDomain}).`,
    };
  } catch (error: any) {
    try {
      const lookup = await dns.lookup(cleanDomain);
      return {
        success: true,
        configured: false,
        resolvedIp: lookup.address,
        expected: configuredTarget,
        message: `Found A record pointing to ${lookup.address}, but a CNAME record pointing to ${configuredTarget} is required.`,
      };
    } catch {
      return {
        success: false,
        configured: false,
        expected: configuredTarget,
        message: `No DNS records found for ${cleanDomain}. DNS propagation may take a few minutes.`,
      };
    }
  }
}

export async function getUserDomains() {
  const user = await requireAuth();

  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');
let pages = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId))
    .orderBy(desc(statusPages.createdAt));

  if (pages.length === 0) {
    const slug = `status-${user.id.substring(0, 8)}`;
    const [created] = await db
      .insert(statusPages)
      .values({
        workspaceId: workspaceId,
        title: 'System Status',
        slug,
        isPublic: true,
      })
      .returning();
    pages = [created];
  }

  // Ensure any existing domain has the deterministic account verification token
  const accountToken = getUserVerificationToken(user.id);
  const needsTokenUpdate = pages.some(
    (p) => p.customDomain && p.customDomainVerificationToken !== accountToken
  );
  if (needsTokenUpdate) {
    await db
      .update(statusPages)
      .set({ customDomainVerificationToken: accountToken })
      .where(and(eq(statusPages.workspaceId, workspaceId), sql`${statusPages.customDomain} IS NOT NULL`));

    pages = pages.map((p) =>
      p.customDomain ? { ...p, customDomainVerificationToken: accountToken } : p
    );
  }

  const pageIds = pages.map((p) => p.id);
  const allComponents = pageIds.length > 0
    ? await db
        .select({
          id: statusPageComponents.id,
          statusPageId: statusPageComponents.statusPageId,
          monitorId: statusPageComponents.monitorId,
          groupName: statusPageComponents.groupName,
          position: statusPageComponents.position,
        })
        .from(statusPageComponents)
        .where(inArray(statusPageComponents.statusPageId, pageIds))
        .orderBy(asc(statusPageComponents.position))
    : [];

  const userMonitors = await db
    .select({
      id: monitors.id,
      name: monitors.name,
      target: sql`''`,
      type: monitors.type,
      status: monitors.status,
    })
    .from(monitors)
    .where(eq(monitors.workspaceId, workspaceId));

  const pagesWithData = pages.map((p) => ({
    ...p,
    components: allComponents
      .filter((c) => c.statusPageId === p.id)
      .map((c) => ({
        id: c.id,
        monitorId: c.monitorId,
        groupName: c.groupName || 'General Services',
        position: c.position,
      })),
  }));

  return {
    domains: pagesWithData,
    allMonitors: userMonitors,
  };
}

export async function addCustomDomain(domainInput: string) {
  const user = await requireAuth();
  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if(!workspaceId) throw new Error('No workspace');

  // Check user active subscription and enforce limits
  const userSub = await db
    .select({ planName: plans.name })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = userSub.length > 0 ? userSub[0].planName : 'Free';
  
  if (planName === 'Free') {
    const existingDomains = await db
      .select({ id: statusPages.id })
      .from(statusPages)
      .where(and(eq(statusPages.workspaceId, workspaceId), sql`custom_domain IS NOT NULL`));
      
    if (existingDomains.length >= 1) {
      throw new Error('Free tier allows 1 custom domain. Please upgrade your plan to add more.');
    }
  }

  const cleanDomain = normalizeDomain(domainInput);
  if (!cleanDomain) throw new Error('Valid domain is required');

  const val = validateDomain(cleanDomain);
  if (!val.valid) throw new Error(val.error);

  // Check if domain is already in use
  const [existingDomain] = await db
    .select({ id: statusPages.id, userId: statusPages.workspaceId })
    .from(statusPages)
    .where(eq(statusPages.customDomain, cleanDomain))
    .limit(1);

  if (existingDomain) {
    if (existingDomain.userId === user.id) {
      throw new Error(`Domain ${cleanDomain} is already configured in your account.`);
    }
    throw new Error(`Domain ${cleanDomain} is already in use by another account.`);
  }

  const token = getUserVerificationToken(user.id);
  const txtRecordHost = `_pingr-verification.${cleanDomain}`;

  // Find if user has a status page without a custom domain
  const [emptyPage] = await db
    .select()
    .from(statusPages)
    .where(and(eq(statusPages.workspaceId, workspaceId), isNull(statusPages.customDomain)))
    .limit(1);

  if (emptyPage) {
    const [updated] = await db
      .update(statusPages)
      .set({
        customDomain: cleanDomain,
        customDomainStatus: 'pending',
        customDomainVerificationToken: token,
        customDomainVerificationTxt: txtRecordHost,
        customDomainError: null,
        updatedAt: new Date(),
      })
      .where(eq(statusPages.id, emptyPage.id))
      .returning();

    revalidatePath('/dashboard/domains');
    revalidatePath('/dashboard/branding');
    purgeTag('status-page');
    purgeTag(`status-page-${cleanDomain}`);
    return updated;
  }

  // Otherwise, create a new status page for this additional domain
  const [firstPage] = await db
    .select()
    .from(statusPages)
    .where(eq(statusPages.workspaceId, workspaceId))
    .limit(1);

  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const slug = `${cleanDomain.replace(/[^a-z0-9]/g, '-')}-${randomSuffix}`.replace(/--+/g, '-');

  const [newPage] = await db
    .insert(statusPages)
    .values({
      workspaceId: workspaceId,
      title: firstPage?.title || cleanDomain,
      slug,
      description: firstPage?.description || null,
      logoUrl: firstPage?.logoUrl || null,
      customDomain: cleanDomain,
      customDomainStatus: 'pending',
      customDomainVerificationToken: token,
      customDomainVerificationTxt: txtRecordHost,
      customDomainError: null,
      isPublic: true,
    })
    .returning();

  if (firstPage) {
    const existingComponents = await db
      .select()
      .from(statusPageComponents)
      .where(eq(statusPageComponents.statusPageId, firstPage.id));

    if (existingComponents.length > 0) {
      await db.insert(statusPageComponents).values(
        existingComponents.map((c) => ({
          statusPageId: newPage.id,
          monitorId: c.monitorId,
          groupName: c.groupName,
          position: c.position,
        }))
      );
    }
  }

  revalidatePath('/dashboard/domains');
  revalidatePath('/dashboard/branding');
  purgeTag('status-page');
  purgeTag(`status-page-${cleanDomain}`);

  return newPage;
}

export async function detectDomainDns(domainInput: string) {
  await requireAuth();
  const clean = normalizeDomain(domainInput);
  if (!clean) throw new Error('Invalid domain');

  // Extract root domain for NS query (e.g. status.example.com -> example.com)
  const parts = clean.split('.');
  const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : clean;

  let nameservers: string[] = [];
  try {
    nameservers = await dns.resolveNs(rootDomain);
  } catch {
    try {
      nameservers = await dns.resolveNs(clean);
    } catch {
      nameservers = [];
    }
  }

  // Detect provider name from NS
  let provider = 'Standard DNS Provider';
  const nsJoined = nameservers.join(' ').toLowerCase();
  if (nsJoined.includes('cloudflare.com')) provider = 'Cloudflare';
  else if (nsJoined.includes('domaincontrol.com')) provider = 'GoDaddy';
  else if (nsJoined.includes('registrar-servers.com')) provider = 'Namecheap';
  else if (nsJoined.includes('awsdns')) provider = 'AWS Route 53';
  else if (nsJoined.includes('googledomains.com') || nsJoined.includes('googlecloud.com')) provider = 'Google Cloud DNS';
  else if (nsJoined.includes('digitalocean.com')) provider = 'DigitalOcean';
  else if (nsJoined.includes('azure-dns')) provider = 'Microsoft Azure DNS';
  else if (nsJoined.includes('vercel-dns')) provider = 'Vercel DNS';
  else if (nameservers.length > 0) provider = nameservers[0];

  // Check current TXT records
  let foundTxt: string[] = [];
  try {
    const txtHost = `_pingr-verification.${clean}`;
    const raw = await dns.resolveTxt(txtHost);
    foundTxt = raw.map((r) => r.join(''));
  } catch {}

  // Check current CNAME
  let foundCname: string[] = [];
  let cnameFound = false;
  try {
    foundCname = await dns.resolveCname(clean);
    cnameFound = foundCname.some(
      (c) => c.toLowerCase().includes('pingr.site') || c.toLowerCase().includes('vercel')
    );
  } catch {}

  return {
    domain: clean,
    rootDomain,
    nameservers,
    provider,
    foundTxt,
    foundCname,
    cnameFound,
  };
}


