'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { accounts, workspaceMembers, subscriptions, plans } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { getActiveWorkspaceId } from '@/lib/data/dashboard';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const PLAN_SEAT_LIMITS: Record<string, number> = {
  Free: 1,
  Pro: 5,
  Business: 25,
  Enterprise: Infinity,
};

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export async function getTeamData() {
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(user.id);

  // 1. Get workspace owner
  const [owner] = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      email: accounts.email,
      role: accounts.role,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.id, workspaceId))
    .limit(1);

  // 2. Get active subscription plan
  const [sub] = await db
    .select({
      planName: plans.name,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = sub?.planName || 'Free';
  const seatLimit = PLAN_SEAT_LIMITS[planName] ?? 1;

  // 3. Get team members
  const members = await db
    .select({
      id: workspaceMembers.id,
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      email: workspaceMembers.email,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      invitedAt: workspaceMembers.invitedAt,
      acceptedAt: workspaceMembers.acceptedAt,
    })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.invitedAt);

  const totalSeatsUsed = 1 + members.length; // Owner + invited members
  const isOwner = user.id === workspaceId;

  return {
    owner: owner || { id: user.id, name: user.name, email: user.email },
    members,
    currentUser: user,
    isOwner,
    planName,
    seatLimit,
    totalSeatsUsed,
    canInvite: seatLimit === Infinity || totalSeatsUsed < seatLimit,
  };
}

export async function inviteTeamMemberAction(prevState: any, formData: FormData) {
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(user.id);

  if (user.id !== workspaceId) {
    return { success: false, message: 'Only the workspace owner can invite new team members.' };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') || 'member',
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid form data',
    };
  }

  const { email, role } = parsed.data;

  // Owner cannot invite themselves
  if (email.toLowerCase() === user.email.toLowerCase()) {
    return { success: false, message: 'You are already the workspace owner.' };
  }

  // Check plan seat limits
  const [sub] = await db
    .select({ planName: plans.name })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = sub?.planName || 'Free';
  const seatLimit = PLAN_SEAT_LIMITS[planName] ?? 1;

  if (planName === 'Free') {
    return {
      success: false,
      message: 'The Free plan is limited to 1 seat (Owner). Upgrade to Pro or Business to collaborate and share monitors with your team.',
    };
  }

  const existingMembers = await db
    .select({ id: workspaceMembers.id, email: workspaceMembers.email })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const totalSeats = 1 + existingMembers.length;
  if (seatLimit !== Infinity && totalSeats >= seatLimit) {
    return {
      success: false,
      message: `Your ${planName} plan allows up to ${seatLimit} seats. Please upgrade on the billing page to add more team members.`,
    };
  }

  if (existingMembers.some(m => m.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'This email address has already been invited to this workspace.' };
  }

  // Check if an account already exists for this email
  const [existingUser] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(sql`LOWER(${accounts.email}) = LOWER(${email})`)
    .limit(1);

  try {
    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: existingUser?.id || null,
      email: email.toLowerCase(),
      role,
      status: existingUser ? 'accepted' : 'pending',
      acceptedAt: existingUser ? new Date() : null,
    });

    revalidatePath('/dashboard/team');
    return {
      success: true,
      message: existingUser 
        ? `Added ${email} to your team as ${role}. They now have access to your workspace monitors.`
        : `Invitation sent to ${email} as ${role}. They will get access when they sign in.`,
    };
  } catch (error: any) {
    console.error('Failed to invite team member:', error);
    return { success: false, message: error.message || 'Failed to send invitation.' };
  }
}

export async function removeTeamMemberAction(memberId: string) {
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(user.id);

  if (user.id !== workspaceId) {
    return { success: false, message: 'Only workspace owners can remove team members.' };
  }

  try {
    await db
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)));

    revalidatePath('/dashboard/team');
    return { success: true, message: 'Team member removed from workspace.' };
  } catch (error: any) {
    console.error('Failed to remove team member:', error);
    return { success: false, message: 'Failed to remove team member.' };
  }
}

export async function updateMemberRoleAction(memberId: string, newRole: 'admin' | 'member' | 'viewer') {
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(user.id);

  if (user.id !== workspaceId) {
    return { success: false, message: 'Only workspace owners can change member roles.' };
  }

  try {
    await db
      .update(workspaceMembers)
      .set({ role: newRole })
      .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspaceId)));

    revalidatePath('/dashboard/team');
    return { success: true, message: `Member role updated to ${newRole}.` };
  } catch (error: any) {
    console.error('Failed to update member role:', error);
    return { success: false, message: 'Failed to update member role.' };
  }
}
