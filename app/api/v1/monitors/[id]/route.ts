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
import { getMonitorById, updateMonitor, deleteMonitor } from '@/lib/data/monitor-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  const monitor = await getMonitorById(id, authContext.workspaceId);
  if (!monitor) {
    return NextResponse.json(
      { error: 'Not Found' }, 
      { status: 404, headers: getRateLimitHeaders(authContext) }
    );
  }

  const { heartbeatSecret, ...sanitizedMonitor } = monitor;
  return NextResponse.json(
    { monitor: sanitizedMonitor },
    { headers: getRateLimitHeaders(authContext) }
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;

  try {
    const body = await request.json();

    // Check advanced monitor type restriction if changing type
    const advancedTypes = ['tcp', 'dns', 'ssl'];
    if (body.type && authContext.planName === 'Free' && advancedTypes.includes(body.type)) {
      return NextResponse.json(
        {
          error: `${body.type.toUpperCase()} monitoring is an Advanced feature available on Pro, Business, and Enterprise plans. Please upgrade at /dashboard/billing.`
        },
        { status: 402, headers: rateLimitHeaders }
      );
    }

    // Check minimum interval restriction if updating interval
    if (body.intervalSeconds !== undefined && body.intervalSeconds < authContext.minIntervalSeconds) {
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
    
    // Convert arrays/objects to JSON strings if provided
    const updateData: any = {};
    const safeFields = ['name', 'target', 'type', 'method', 'intervalSeconds', 'timeoutSeconds', 'failureThreshold', 'retryIntervalSeconds', 'port', 'dnsQueryType', 'sslDaysBeforeExpiryAlert', 'cronExpression', 'timezone', 'gracePeriodSeconds', 'heartbeatSecret', 'status', 'enabled', 'expectedStatus'];
    
    for (const field of safeFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.headers !== undefined) updateData.headers = body.headers ? JSON.stringify(body.headers) : null;
    if (body.queryParameters !== undefined) updateData.queryParameters = body.queryParameters ? JSON.stringify(body.queryParameters) : null;
    if (body.assertions !== undefined) updateData.assertions = body.assertions ? JSON.stringify(body.assertions) : null;
    if (body.tags !== undefined) updateData.tags = body.tags ? JSON.stringify(body.tags) : null;
    if (body.body !== undefined) updateData.body = body.body;

    // Reject update if there are no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' }, 
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const updatedMonitor = await updateMonitor(id, authContext.workspaceId, updateData);

    if (!updatedMonitor) {
      return NextResponse.json(
        { error: 'Not Found' }, 
        { status: 404, headers: rateLimitHeaders }
      );
    }

    const { heartbeatSecret, ...sanitizedMonitor } = updatedMonitor;
    return NextResponse.json(
      { monitor: sanitizedMonitor },
      { headers: rateLimitHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' }, 
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;

  try {
    const deletedMonitor = await deleteMonitor(id, authContext.workspaceId);

    if (!deletedMonitor) {
      return NextResponse.json(
        { error: 'Not Found' }, 
        { status: 404, headers: rateLimitHeaders }
      );
    }

    return new NextResponse(null, { status: 204, headers: rateLimitHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' }, 
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
