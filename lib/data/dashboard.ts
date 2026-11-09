import { cache } from 'react';
import { db } from '@/lib/db';
import { monitors, usage, subscriptions, plans, monitorStats, workspaceMembers } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

// Helper to get the user's active workspace (defaults to the user's account ID or invited team workspace)
export const getActiveWorkspaceId = cache(async (userId: string) => {
  // 1. If user already has monitors under their own ID, use that
  const ownMonitors = await db
    .select({ id: monitors.id })
    .from(monitors)
    .where(eq(monitors.workspaceId, userId))
    .limit(1);
    
  if (ownMonitors.length > 0) {
    return userId;
  }

  // 2. Otherwise check if they belong to an accepted team workspace
  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.status, 'accepted')))
    .limit(1);

  if (membership?.workspaceId) {
    return membership.workspaceId;
  }

  return userId;
});

// Cache prevents duplicate DB queries across layout and page components during the same request cycle
export const getUserDashboardData = cache(async (userId: string) => {
  const workspaceId = await getActiveWorkspaceId(userId);
  
  if (!workspaceId) {
    return { userMonitors: [], userUsage: null, sub: null, workspaceId: null };
  }

  const [userMonitors, [userUsage], [sub]] = await Promise.all([
    db.select().from(monitors).where(eq(monitors.workspaceId, workspaceId)),
    db.select().from(usage).where(eq(usage.workspaceId, workspaceId)).limit(1),
    db
      .select({
        planName: plans.name,
        maxMonitors: plans.maxMonitors,
        apiAccess: plans.apiAccess,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.workspaceId, workspaceId))
      .limit(1),
  ]);

  return { userMonitors, userUsage, sub, workspaceId };
});

export const getMonitorStats = cache(async (monitorIds: string[]) => {
  if (monitorIds.length === 0) return [];
  return db.select().from(monitorStats).where(inArray(monitorStats.monitorId, monitorIds));
});
