import { db } from '@/lib/db';
import { subscriptions, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface ProviderSubscriptionData {
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
  providerPlanId: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
}

export async function processSubscriptionUpdate(userId: string | null, data: ProviderSubscriptionData) {
  const [plan] = await db.select().from(plans).where(eq(plans.providerPlanId, data.providerPlanId)).limit(1);

  // If userId is provided (e.g. initial checkout), upsert using userId
  if (userId) {
    const workspaceId = userId;
    const startDate = data.startDate || new Date();
    // Upsert subscription
    await db.insert(subscriptions).values({
      workspaceId,
      providerSubscriptionId: data.providerSubscriptionId,
      planId: plan?.id,
      status: data.status,
      startDate,
      endDate: data.endDate,
    }).onConflictDoUpdate({
      target: subscriptions.workspaceId,
      set: {
        providerSubscriptionId: data.providerSubscriptionId,
        planId: plan?.id,
        status: data.status,
        startDate,
        endDate: data.endDate,
        updatedAt: new Date(),
      }
    });
  } else {
    // For standard webhook updates where we have the providerSubscriptionId
    await db.update(subscriptions).set({
      providerSubscriptionId: data.providerSubscriptionId,
      planId: plan?.id,
      status: data.status,
      endDate: data.endDate,
      updatedAt: new Date(),
    }).where(eq(subscriptions.providerSubscriptionId, data.providerSubscriptionId));
  }
}
