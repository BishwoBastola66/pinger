import { NextResponse } from 'next/server';
import { 
  verifyApiKey, 
  hasScope, 
  scopeErrorResponse, 
  authErrorResponse, 
  handleAuthError, 
  getRateLimitHeaders,
  ApiKeyAuthContext
} from '@/lib/auth/api-keys';
import { monitorFormSchema } from '@/lib/monitors/schema';
import { getMonitorsByWorkspace, createMonitor } from '@/lib/data/monitor-service';

export async function GET(request: Request) {
  let authContext: ApiKeyAuthContext | null;
  try {
    authContext = await verifyApiKey(request);
  } catch (e: any) {
    return handleAuthError(e);
  }

  if (!authContext) {
    return authErrorResponse();
  }

  if (!hasScope(authContext, 'monitors:read')) {
    return scopeErrorResponse('monitors:read', authContext.scopes, authContext);
  }

  const userMonitors = await getMonitorsByWorkspace(authContext.workspaceId);
  const sanitizedMonitors = userMonitors.map(m => {
    const { heartbeatSecret, ...rest } = m as any;
    return rest;
  });

  return NextResponse.json(
    { monitors: sanitizedMonitors },
    { headers: getRateLimitHeaders(authContext) }
  );
}

export async function POST(request: Request) {
  let authContext: ApiKeyAuthContext | null;
  try {
    authContext = await verifyApiKey(request);
  } catch (e: any) {
    return handleAuthError(e);
  }

  if (!authContext) {
    return authErrorResponse();
  }

  if (!hasScope(authContext, 'monitors:write')) {
    return scopeErrorResponse('monitors:write', authContext.scopes, authContext);
  }

  const rateLimitHeaders = getRateLimitHeaders(authContext);

  try {
    const body = await request.json();
    
    const parsed = monitorFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid fields', details: parsed.error.flatten() }, 
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const validData = parsed.data;

    // Basic SSRF protection
    if (['website', 'api', 'supabase', 'websocket', 'tcp', 'dns', 'ssl'].includes(validData.type)) {
      const targetStr = validData.target;
      try {
        const hostname = targetStr.includes('://') ? new URL(targetStr).hostname : targetStr;
        if (['localhost', '127.0.0.1', '169.254.169.254', '[::1]'].includes(hostname)) {
          return NextResponse.json(
            { error: 'Invalid target address (SSRF Protection)' },
            { status: 400, headers: rateLimitHeaders }
          );
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid target format' },
          { status: 400, headers: rateLimitHeaders }
        );
      }
    }

    // Check monitor plan limit (Free: 5, Pro: 50, Business: 250, Enterprise: 1000)
    const existingMonitors = await getMonitorsByWorkspace(authContext.workspaceId);
    if (existingMonitors.length >= authContext.maxMonitors) {
      return NextResponse.json(
        { 
          error: `Monitor limit reached. Your ${authContext.planName} plan allows up to ${authContext.maxMonitors} monitors. Please upgrade your plan at /dashboard/billing to add more.` 
        }, 
        { status: 402, headers: rateLimitHeaders }
      );
    }

    // Advanced Monitors restriction (TCP, DNS, SSL are Pro+ as per landing page)
    const advancedTypes = ['tcp', 'dns', 'ssl'];
    if (authContext.planName === 'Free' && advancedTypes.includes(validData.type)) {
      return NextResponse.json(
        {
          error: `${validData.type.toUpperCase()} monitoring is an Advanced feature available on Pro, Business, and Enterprise plans. Please upgrade your plan at /dashboard/billing.`
        },
        { status: 402, headers: rateLimitHeaders }
      );
    }

    // Minimum check interval restriction (Free: 180s/3m, Pro: 60s/1m, Enterprise: 30s)
    if (validData.intervalSeconds < authContext.minIntervalSeconds) {
      const formattedMin = authContext.minIntervalSeconds >= 60 
        ? `${Math.floor(authContext.minIntervalSeconds / 60)} minute(s)` 
        : `${authContext.minIntervalSeconds}s`;
      return NextResponse.json(
        {
          error: `Your ${authContext.planName} plan has a minimum check interval of ${formattedMin}. Please select an interval of ${formattedMin} or higher, or upgrade your plan at /dashboard/billing.`
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const newMonitor = await createMonitor(authContext.workspaceId, validData);
    if (!newMonitor) throw new Error('Failed to create monitor');

    const { heartbeatSecret, ...sanitizedMonitor } = newMonitor as any;
    return NextResponse.json(
      { monitor: sanitizedMonitor }, 
      { status: 201, headers: rateLimitHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' }, 
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
