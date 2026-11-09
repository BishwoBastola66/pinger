import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { ApiKeyManager } from '@/components/dashboard/ApiKeyManager';

export default async function ApiKeysPage() {
  const user = await requireAuth();
  
  const userKeys = await db.select().from(apiKeys).where(and(eq(apiKeys.workspaceId, user.id), isNull(apiKeys.revokedAt)));

  return <ApiKeyManager initialKeys={userKeys} />;
}
