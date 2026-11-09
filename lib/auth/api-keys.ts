import { db } from '@/lib/db';
import { apiKeys, accounts, usage, subscriptions, plans } from '@/lib/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import crypto from 'crypto';

export interface PlanApiLimit {
  monthlyCalls: number;
  maxKeys: number;
  maxMonitors: number;
  minIntervalSeconds: number;
}

export const PLAN_LIMITS: Record<string, PlanApiLimit> = {
  Free: { monthlyCalls: 500, maxKeys: 1, maxMonitors: 5, minIntervalSeconds: 180 },
  Pro: { monthlyCalls: 50000, maxKeys: 10, maxMonitors: 50, minIntervalSeconds: 60 },
  Business: { monthlyCalls: Infinity, maxKeys: Infinity, maxMonitors: 250, minIntervalSeconds: 60 },
  Enterprise: { monthlyCalls: Infinity, maxKeys: Infinity, maxMonitors: 1000, minIntervalSeconds: 30 },
};

export class ApiRateLimitError extends Error {
  status: number;
  limit: number;
  remaining: number;
  plan: string;

  constructor(message: string, limit: number, plan: string) {
    super(message);
    this.name = 'ApiRateLimitError';
    this.status = 429;
    this.limit = limit;
    this.remaining = 0;
    this.plan = plan;
  }
}

export interface ApiKeyAuthContext {
  workspaceId: string;
  scopes: string[];
  planName: string;
  maxMonitors: number;
  minIntervalSeconds: number;
  monthlyCallsLimit: number;
  monthlyCallsUsed: number;
  monthlyCallsRemaining: number;
}

export async function verifyApiKey(request: Request): Promise<ApiKeyAuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const [key] = await db.select({
    id: apiKeys.id,
    workspaceId: apiKeys.workspaceId,
    scopes: apiKeys.scopes,
    revokedAt: apiKeys.revokedAt,
  })
  .from(apiKeys)
  .where(or(eq(apiKeys.keyHash, tokenHash), eq(apiKeys.keyHash, token)))
  .limit(1);

  if (!key) {
    return null;
  }

  if (key.revokedAt) {
    return null; // Key is revoked
  }

  const [[sub], [userUsage]] = await Promise.all([
    db.select({
      planName: plans.name,
      maxMonitors: plans.maxMonitors,
      minIntervalSeconds: plans.minIntervalSeconds,
      apiAccess: plans.apiAccess,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, key.workspaceId))
    .limit(1),
    db.select({
      monthlyCalls: usage.monthlyCalls,
      lastResetAt: usage.lastResetAt,
    })
    .from(usage)
    .where(eq(usage.workspaceId, key.workspaceId))
    .limit(1),
  ]);

  const planName = sub?.planName || 'Free';
  const planDefaults = PLAN_LIMITS[planName] || PLAN_LIMITS.Free;
  const maxMonitors = sub?.maxMonitors ?? planDefaults.maxMonitors;
  const minIntervalSeconds = sub?.minIntervalSeconds ?? planDefaults.minIntervalSeconds;
  const monthlyCallsLimit = planDefaults.monthlyCalls;

  // Check if monthly reset period (30 days) has passed
  let usedCalls = userUsage?.monthlyCalls ?? 0;
  if (userUsage?.lastResetAt) {
    const lastReset = new Date(userUsage.lastResetAt).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - lastReset > thirtyDaysMs) {
      usedCalls = 0;
    }
  }

  // Check if monthly rate limit is exceeded
  if (monthlyCallsLimit !== Infinity && usedCalls >= monthlyCallsLimit) {
    throw new ApiRateLimitError(
      `API Rate Limit Exceeded: Monthly quota of ${monthlyCallsLimit.toLocaleString()} requests exhausted for the ${planName} plan. Upgrade your plan at /dashboard/billing to increase your quota.`,
      monthlyCallsLimit,
      planName
    );
  }

  // Update last used asynchronously
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .execute()
    .catch(console.error);

  // Update usage count asynchronously in PostgreSQL (column is account_id)
  db.execute(sql`
    INSERT INTO usage (account_id, monthly_calls, total_calls, last_reset_at, updated_at) 
    VALUES (${key.workspaceId}, 1, 1, NOW(), NOW())
    ON CONFLICT (account_id) DO UPDATE SET 
      monthly_calls = CASE 
        WHEN usage.last_reset_at < NOW() - INTERVAL '30 days' THEN 1 
        ELSE usage.monthly_calls + 1 
      END,
      last_reset_at = CASE 
        WHEN usage.last_reset_at < NOW() - INTERVAL '30 days' THEN NOW() 
        ELSE usage.last_reset_at 
      END,
      total_calls = usage.total_calls + 1,
      updated_at = NOW()
  `).catch(console.error);

  const rawScopes = (key as any).scopes;
  let scopes: string[] = [];
  if (rawScopes) {
    if (Array.isArray(rawScopes)) {
      scopes = rawScopes.map(String);
    } else if (typeof rawScopes === 'string') {
      try {
        const parsed = JSON.parse(rawScopes);
        if (Array.isArray(parsed)) scopes = parsed.map(String);
        else scopes = [rawScopes];
      } catch {
        scopes = [rawScopes];
      }
    }
  }
  if (scopes.length === 0) {
    scopes = ['monitors:read'];
  }

  const remaining = monthlyCallsLimit === Infinity ? Infinity : Math.max(0, monthlyCallsLimit - (usedCalls + 1));

  return { 
    workspaceId: key.workspaceId, 
    scopes,
    planName,
    maxMonitors,
    minIntervalSeconds,
    monthlyCallsLimit,
    monthlyCallsUsed: usedCalls + 1,
    monthlyCallsRemaining: remaining,
  };
}

export function hasScope(authContext: { scopes: string[] } | null | undefined, requiredScope: string): boolean {
  if (!authContext?.scopes || !Array.isArray(authContext.scopes)) return false;
  if (authContext.scopes.includes('*')) return true;
  return authContext.scopes.includes(requiredScope);
}

export function getRateLimitHeaders(authContext?: ApiKeyAuthContext | null): Record<string, string> {
  if (!authContext) return {};
  return {
    'X-RateLimit-Limit': authContext.monthlyCallsLimit === Infinity ? 'Unlimited' : String(authContext.monthlyCallsLimit),
    'X-RateLimit-Remaining': authContext.monthlyCallsLimit === Infinity ? 'Unlimited' : String(Math.max(0, authContext.monthlyCallsRemaining)),
    'X-RateLimit-Plan': authContext.planName,
  };
}

export function rateLimitErrorResponse(error: ApiRateLimitError | any) {
  const limit = error?.limit ?? 500;
  const plan = error?.plan ?? 'Free';
  return Response.json(
    {
      error: 'Too Many Requests',
      message: error?.message || 'API Rate Limit Exceeded: Monthly quota exhausted for your plan. Please upgrade at /dashboard/billing.',
      limit: limit === Infinity ? 'Unlimited' : limit,
      remaining: 0,
      plan,
    },
    {
      status: 429,
      headers: {
        'Retry-After': '86400',
        'X-RateLimit-Limit': limit === Infinity ? 'Unlimited' : String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Plan': plan,
      },
    }
  );
}

export function handleAuthError(e: any) {
  if (e instanceof ApiRateLimitError || e?.status === 429) {
    return rateLimitErrorResponse(e);
  }
  return Response.json({ error: e?.message || 'Authentication error' }, { status: 403 });
}

export function scopeErrorResponse(requiredScope: string, grantedScopes: string[], authContext?: ApiKeyAuthContext | null) {
  return Response.json(
    {
      error: 'Forbidden',
      message: `Missing required scope: ${requiredScope}. Your API key does not have permission to perform this action.`,
      requiredScope,
      grantedScopes: grantedScopes || [],
    },
    { 
      status: 403,
      headers: getRateLimitHeaders(authContext),
    }
  );
}

export function authErrorResponse(message = 'Invalid, missing, or revoked API key') {
  return Response.json(
    {
      error: 'Unauthorized',
      message,
    },
    { status: 401 }
  );
}
