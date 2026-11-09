import { db } from '@/lib/db';
import { restrictions } from '@/lib/db/schema';
import { eq, and, or, gt, lte, desc } from 'drizzle-orm';

export interface ActiveRestriction {
  id: string;
  userId: string;
  reason: string;
  isPermanent: boolean;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
}

export async function getActiveUserRestriction(userId: string): Promise<ActiveRestriction | null> {
  try {
    const now = new Date();

    const [active] = await db
      .select()
      .from(restrictions)
      .where(
        and(
          eq(restrictions.userId, userId),
          lte(restrictions.startDate, now),
          or(
            eq(restrictions.isPermanent, true),
            gt(restrictions.endDate, now)
          )
        )
      )
      .orderBy(desc(restrictions.createdAt))
      .limit(1);

    return active || null;
  } catch (error) {
    console.error('Error checking user restrictions:', error);
    return null;
  }
}
