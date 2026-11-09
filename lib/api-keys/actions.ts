'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { apiKeys, subscriptions, plans } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/session';
import { getActiveWorkspaceId } from '@/lib/data/dashboard';
import { withUserContext } from '@/lib/db/rls';
import { eq, and, sql, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

const generateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  scopes: z.array(z.string()).min(1, 'Please select at least one permission scope'),
});

export async function generateApiKeyAction(prevState: any, formData: FormData) {
  const user = await requireAuth();

  const rawScopes = formData.getAll('scopes');
  let scopes: string[] = [];
  if (rawScopes.length > 0) {
    scopes = rawScopes.map(s => String(s)).filter(Boolean);
  } else {
    const scopesJson = formData.get('scopes');
    if (typeof scopesJson === 'string') {
      try {
        const parsed = JSON.parse(scopesJson);
        if (Array.isArray(parsed)) scopes = parsed;
      } catch {
        scopes = scopesJson.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  if (scopes.length === 0) {
    scopes = ['monitors:read'];
  }

  const parsed = generateSchema.safeParse({
    name: formData.get('name'),
    scopes,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: parsed.error.issues[0]?.message || 'Invalid form data',
    };
  }

  const workspaceId = await getActiveWorkspaceId(user.id);
  if (!workspaceId) {
    return { message: 'No active workspace found.' };
  }

  // Check user active subscription and enforce limits
  const userSub = await db
    .select({ planName: plans.name })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = userSub.length > 0 ? userSub[0].planName : 'Free';

  const activeKeys = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.revokedAt)));

  if (planName === 'Free' && activeKeys.length >= 1) {
    return {
      message: 'Free tier allows 1 active API key. Please upgrade your plan or revoke an existing key.',
    };
  }

  if (planName === 'Pro' && activeKeys.length >= 10) {
    return {
      message: 'Pro tier allows up to 10 active API keys. Please upgrade to Business or revoke an existing key.',
    };
  }

  const { name } = parsed.data;

  // Generate a secure random token
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const token = `pingr_${randomBytes}`;
  
  // Hash the token for storage
  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    await withUserContext(user.id, user.role, async (tx) => {
      await tx.insert(apiKeys).values({
        workspaceId: workspaceId,
        name,
        keyHash,
        scopes: parsed.data.scopes,
      });
    });
    
    revalidatePath('/dashboard/api-keys');
    
    return {
      success: true,
      message: 'API key generated successfully',
      plaintextToken: token, // DANGER: ONLY RETURN ONCE
    };
  } catch (error) {
    console.error('Failed to generate API key:', error);
    return {
      message: 'Failed to generate API key. Please try again.',
    };
  }
}

export async function recordApiKeyUsage(token: string) {
  const keyHash = crypto.createHash('sha256').update(token).digest('hex');
  const rows = await db.execute(sql`SELECT * FROM record_api_key_call(${keyHash})`);
  return rows[0] || null;
}

export async function revokeApiKeyAction(keyId: string) {
  const user = await requireAuth();

  try {
    const workspaceId = await getActiveWorkspaceId(user.id);
    if (!workspaceId) return { success: false, message: 'No workspace' };

    await withUserContext(user.id, user.role, async (tx) => {
      await tx.update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspaceId)));
    });
      
    revalidatePath('/dashboard/api-keys');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return { success: false, message: 'Failed to revoke API key' };
  }
}
