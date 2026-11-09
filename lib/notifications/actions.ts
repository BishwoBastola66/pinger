'use server';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { eq, or, isNull, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface NotificationItem {
  id: string;
  accountId: string | null;
  title: string | null;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string; // ISO string for client serialization
  isAnnouncement: boolean;
}

/**
 * Fetch all notifications visible to the authenticated user:
 * 1. Global announcements for all users (accountId is NULL)
 * 2. Specific notifications for this user (accountId = user.id)
 */
export async function getNotificationsAction(): Promise<{
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
}> {
  try {
    const user = await requireAuth();

    const rows = await db
      .select()
      .from(notifications)
      .where(
        or(
          isNull(notifications.accountId),
          eq(notifications.accountId, user.id)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    const items: NotificationItem[] = rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: r.isRead,
      link: r.link,
      createdAt: r.createdAt.toISOString(),
      isAnnouncement: r.accountId === null || r.type === 'announcement',
    }));

    const unreadCount = items.filter((n) => !n.isRead).length;

    return { success: true, data: items, unreadCount };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, data: [], unreadCount: 0 };
  }
}

/**
 * Mark all account-specific notifications as read for current user
 */
export async function markAllNotificationsReadAction(): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth();

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.accountId, user.id),
          eq(notifications.isRead, false)
        )
      );

    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    return { success: false };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationReadAction(notificationId: string): Promise<{ success: boolean }> {
  try {
    const user = await requireAuth();

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          or(eq(notifications.accountId, user.id), isNull(notifications.accountId))
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Error marking notification read:', error);
    return { success: false };
  }
}

/**
 * Create a global announcement visible to ALL users (accountId = null)
 */
export async function createAnnouncementAction(title: string, message: string, link?: string) {
  try {
    const user = await requireAuth();
    // Allow any user or admin to post announcement if needed
    const [inserted] = await db
      .insert(notifications)
      .values({
        accountId: null, // Broadcast to all accounts
        title: title || 'Announcement',
        message,
        type: 'announcement',
        link: link || null,
        isRead: false,
      })
      .returning();

    revalidatePath('/dashboard', 'layout');
    return { success: true, notification: inserted };
  } catch (error) {
    console.error('Error creating announcement:', error);
    return { success: false, error: 'Failed to create announcement' };
  }
}

/**
 * Create a specific notification targeted to a single account ID
 */
export async function createAccountNotificationAction(
  accountId: string,
  title: string,
  message: string,
  type: 'info' | 'alert' | 'success' = 'info',
  link?: string
) {
  try {
    const [inserted] = await db
      .insert(notifications)
      .values({
        accountId,
        title: title || 'Notification',
        message,
        type,
        link: link || null,
        isRead: false,
      })
      .returning();

    revalidatePath('/dashboard', 'layout');
    return { success: true, notification: inserted };
  } catch (error) {
    console.error('Error creating account notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}
