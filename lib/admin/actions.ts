'use server';

import { db } from '@/lib/db';
import { accounts, subscriptions, plans, sessions, restrictions } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { withUserContext } from '@/lib/db/rls';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  return user;
}

export async function getAdminOverview() {
  await requireAdmin();
  
  const allUsers = await db.select({
    id: accounts.id,
    name: accounts.name,
    email: accounts.email,
    role: accounts.role,
    emailVerified: accounts.emailVerified,
    createdAt: accounts.createdAt,
    updatedAt: accounts.updatedAt
  }).from(accounts).orderBy(desc(accounts.createdAt));
  const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, 'active'));
  
  return {
    totalUsers: allUsers.length,
    activeSubscriptions: activeSubs.length,
    recentUsers: allUsers.slice(0, 5),
  };
}

export async function getAllUsers() {
  await requireAdmin();
  const allUsers = await db.select({
    id: accounts.id,
    name: accounts.name,
    email: accounts.email,
    role: accounts.role,
    emailVerified: accounts.emailVerified,
    createdAt: accounts.createdAt,
    updatedAt: accounts.updatedAt
  }).from(accounts).orderBy(desc(accounts.createdAt));

  const allRestrictions = await db.select().from(restrictions).orderBy(desc(restrictions.createdAt));

  const now = new Date();
  return allUsers.map((user) => {
    const userRestrictions = allRestrictions.filter((r) => r.userId === user.id);
    const activeRestriction = userRestrictions.find((r) => {
      const start = new Date(r.startDate);
      const isStarted = start <= now;
      if (!isStarted) return false;
      if (r.isPermanent) return true;
      if (r.endDate && new Date(r.endDate) > now) return true;
      return false;
    }) || null;

    return {
      ...user,
      activeRestriction,
      restrictions: userRestrictions,
    };
  });
}

export async function updateUserAccount(userId: string, data: { role?: 'user' | 'admin' }) {
  const admin = await requireAdmin();
  
  await withUserContext(admin.id, admin.role, async (tx) => {
    const updatePayload: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
    if (data.role) updatePayload.role = data.role;

    await tx.update(accounts).set(updatePayload).where(eq(accounts.id, userId));
  });

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function addRestrictionAction(
  userId: string,
  data: {
    reason: string;
    isPermanent: boolean;
    startDate?: string;
    endDate?: string | null;
  }
) {
  const admin = await requireAdmin();
  const reason = data.reason?.trim();
  if (!reason) {
    throw new Error('Restriction reason is required');
  }

  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const endDate = data.isPermanent ? null : (data.endDate ? new Date(data.endDate) : null);

  if (!data.isPermanent && endDate && endDate <= startDate) {
    throw new Error('End date must be after start date for temporary restrictions');
  }

  await withUserContext(admin.id, admin.role, async (tx) => {
    await tx.insert(restrictions).values({
      userId,
      reason,
      isPermanent: data.isPermanent,
      startDate,
      endDate,
    });

    // Revoke any active sessions for the restricted user immediately
    await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
  });

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function removeRestrictionAction(restrictionId: string) {
  const admin = await requireAdmin();
  await withUserContext(admin.id, admin.role, async (tx) => {
    await tx.delete(restrictions).where(eq(restrictions.id, restrictionId));
  });

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function liftUserRestrictionsAction(userId: string) {
  const admin = await requireAdmin();
  await withUserContext(admin.id, admin.role, async (tx) => {
    await tx.delete(restrictions).where(eq(restrictions.userId, userId));
  });

  revalidatePath('/dashboard/admin/users');
  return { success: true };
}

export async function getAllPlans() {
  await requireAdmin();
  return await db.select().from(plans);
}

export async function getUserSubscriptions() {
  await requireAdmin();
  
  const results = await db.select({
    user: {
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      role: accounts.role,
      provider: accounts.provider,
      providerId: accounts.providerId,
    },
    subscription: subscriptions,
    plan: plans,
  })
  .from(accounts)
  .leftJoin(subscriptions, eq(accounts.id, subscriptions.workspaceId as any))
  .leftJoin(plans, eq(subscriptions.planId, plans.id))
  .orderBy(desc(accounts.createdAt));

  return results;
}

export async function updateUserSubscription(
  userId: string, 
  planId: string | null, 
  startDate: Date | null,
  expirationDate: Date | null
) {
  const admin = await requireAdmin();
  
  await withUserContext(admin.id, admin.role, async (tx) => {
    if (!planId) {
      const wsId = userId;
      // Remove or cancel subscription
      await tx.delete(subscriptions).where(eq(subscriptions.workspaceId, wsId));
    } else {
      const effectiveStart = startDate || new Date();
      const wsId = userId;
      // Upsert subscription
      const existing = await tx.select().from(subscriptions).where(eq(subscriptions.workspaceId, wsId)).limit(1);
      
      if (existing.length > 0) {
        await tx.update(subscriptions).set({
          planId,
          startDate: effectiveStart,
          endDate: expirationDate,
          status: 'active',
          updatedAt: new Date(),
        }).where(eq(subscriptions.workspaceId, wsId));
      } else {
        await tx.insert(subscriptions).values({
          workspaceId: wsId,
          planId,
          status: 'active',
          startDate: effectiveStart,
          endDate: expirationDate,
        });
      }
    }
  });
  
  revalidatePath('/dashboard/admin/subscriptions');
  return { success: true };
}
