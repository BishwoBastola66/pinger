'use server';

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { getActiveWorkspaceId } from '@/lib/data/dashboard';
import { monitorFormSchema } from './schema';
import { revalidatePath } from 'next/cache';
import { createMonitor, updateMonitor, deleteMonitor, getMonitorsByWorkspace } from '@/lib/data/monitor-service';
import { subscriptions, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createMonitorAction(data: any) {
  const user = await requireAuth();
  
  const workspaceId = await getActiveWorkspaceId(user.id);
  if (!workspaceId) {
    return { success: false, message: 'No active workspace found' };
  }

  const parsed = monitorFormSchema.safeParse(data);
  
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: 'Invalid monitor configuration',
    };
  }

  const validData = parsed.data;

  // Basic SSRF protection
  if (['website', 'api', 'supabase', 'websocket', 'tcp', 'dns', 'ssl'].includes(validData.type)) {
    const targetStr = validData.target;
    try {
      const hostname = targetStr.includes('://') ? new URL(targetStr).hostname : targetStr;
      if (['localhost', '127.0.0.1', '169.254.169.254', '[::1]'].includes(hostname)) {
        return { success: false, message: 'Invalid target address (SSRF Protection)' };
      }
    } catch (e) {
      return { success: false, message: 'Invalid target format' };
    }
  }

  // Enforce plan limits matching landing page pricing
  const [sub] = await db
    .select({ 
      maxMonitors: plans.maxMonitors,
      planName: plans.name,
      minIntervalSeconds: plans.minIntervalSeconds,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
    
  const maxMonitors = sub?.maxMonitors || 5; // Default free limit: 5 monitors
  const planName = sub?.planName || 'Free';
  const minIntervalSeconds = sub?.minIntervalSeconds || 180; // Default free: 3m (180s)
  
  const existingMonitors = await getMonitorsByWorkspace(workspaceId);
  
  if (existingMonitors.length >= maxMonitors) {
    return { 
      success: false, 
      message: `Monitor limit reached. Your ${planName} plan allows up to ${maxMonitors} monitors. Please upgrade your plan on the billing page to add more.` 
    };
  }

  // Advanced Monitors restriction (TCP, DNS, SSL are Pro+ as per landing page)
  const advancedTypes = ['tcp', 'dns', 'ssl'];
  if (planName === 'Free' && advancedTypes.includes(validData.type)) {
    return {
      success: false,
      message: `${validData.type.toUpperCase()} monitoring is an Advanced feature available on Pro, Business, and Enterprise plans. Please upgrade on the billing page.`,
    };
  }

  // Minimum interval restriction (Free: 3m/180s, Pro: 1m/60s, Enterprise: 30s)
  if (validData.intervalSeconds < minIntervalSeconds) {
    const formattedMin = minIntervalSeconds >= 60 ? `${Math.floor(minIntervalSeconds / 60)} minute(s)` : `${minIntervalSeconds}s`;
    return {
      success: false,
      message: `Your ${planName} plan has a minimum check interval of ${formattedMin}. Please select an interval of ${formattedMin} or higher, or upgrade your plan.`,
    };
  }
  
  try {
    const newMonitor = await createMonitor(workspaceId, validData);
    if (!newMonitor) throw new Error('Failed to create monitor');

    revalidatePath('/dashboard/monitors');
    return { success: true, monitorId: newMonitor.id };
  } catch (error: any) {
    console.error('Failed to create monitor:', error);
    return { success: false, message: error.message || 'Failed to save monitor' };
  }
}

export async function updateMonitorAction(id: string, data: any) {
  const user = await requireAuth();

  const workspaceId = await getActiveWorkspaceId(user.id);
  if (!workspaceId) {
    return { success: false, message: 'No active workspace found' };
  }
  
  const parsed = monitorFormSchema.safeParse(data);
  
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: 'Invalid monitor configuration',
    };
  }

  const validData = parsed.data;

  // Basic SSRF protection
  if (['website', 'api', 'supabase', 'websocket', 'tcp', 'dns', 'ssl'].includes(validData.type)) {
    const targetStr = validData.target;
    try {
      const hostname = targetStr.includes('://') ? new URL(targetStr).hostname : targetStr;
      if (['localhost', '127.0.0.1', '169.254.169.254', '[::1]'].includes(hostname)) {
        return { success: false, message: 'Invalid target address (SSRF Protection)' };
      }
    } catch (e) {
      return { success: false, message: 'Invalid target format' };
    }
  }

  // Enforce plan limits matching landing page pricing
  const [sub] = await db
    .select({ 
      planName: plans.name,
      minIntervalSeconds: plans.minIntervalSeconds,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = sub?.planName || 'Free';
  const minIntervalSeconds = sub?.minIntervalSeconds || 180;

  const advancedTypes = ['tcp', 'dns', 'ssl'];
  if (planName === 'Free' && advancedTypes.includes(validData.type)) {
    return {
      success: false,
      message: `${validData.type.toUpperCase()} monitoring is an Advanced feature available on Pro, Business, and Enterprise plans. Please upgrade on the billing page.`,
    };
  }

  if (validData.intervalSeconds < minIntervalSeconds) {
    const formattedMin = minIntervalSeconds >= 60 ? `${Math.floor(minIntervalSeconds / 60)} minute(s)` : `${minIntervalSeconds}s`;
    return {
      success: false,
      message: `Your ${planName} plan has a minimum check interval of ${formattedMin}. Please select an interval of ${formattedMin} or higher, or upgrade your plan.`,
    };
  }

  try {
    const updatedMonitor = await updateMonitor(id, workspaceId, validData);
    if (!updatedMonitor) {
      return { success: false, message: 'Monitor not found or unauthorized' };
    }
    
    revalidatePath('/dashboard/monitors');
    revalidatePath(`/dashboard/monitors/${id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update monitor:', error);
    return { success: false, message: error.message || 'Failed to update monitor' };
  }
}

export async function deleteMonitorAction(id: string) {
  const user = await requireAuth();

  const workspaceId = await getActiveWorkspaceId(user.id);
  if (!workspaceId) {
    return { success: false, message: 'No active workspace found' };
  }

  try {
    const success = await deleteMonitor(id, workspaceId);
    if (!success) {
      return { success: false, message: 'Monitor not found or unauthorized' };
    }
    
    revalidatePath('/dashboard/monitors');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete monitor:', error);
    return { success: false, message: error.message || 'Failed to delete monitor' };
  }
}

export async function testMonitorAction(data: any) {
  try {
    const target = (data.target || data.url || data.projectUrl || data.projectRef || '').trim();
    if (!target && !['cron', 'heartbeat'].includes(data.type)) {
      return {
        success: false,
        statusCode: null,
        responseTime: 0,
        errorMessage: 'Please enter a target address or URL first',
        bodySnippet: undefined,
      };
    }

    if (['website', 'api', 'supabase', 'websocket', 'tcp', 'dns', 'ssl'].includes(data.type)) {
      try {
        const hostname = target.includes('://') ? new URL(target).hostname : target;
        if (['localhost', '127.0.0.1', '169.254.169.254', '[::1]'].includes(hostname)) {
          return {
            success: false,
            statusCode: null,
            responseTime: 0,
            errorMessage: 'Invalid target address (SSRF Protection)',
            bodySnippet: undefined,
          };
        }
      } catch (e) {
        // Ignored
      }
    }

    const { testProbe } = await import('@/lib/monitors/ping');
    const result = await testProbe({
      ...data,
      timeoutSeconds: data.timeoutSeconds || 10,
    });

    return {
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      errorMessage: result.errorMessage,
      bodySnippet: result.bodySnippet,
    };
  } catch (error: any) {
    return {
      success: false,
      statusCode: null,
      responseTime: 0,
      errorMessage: error.message || 'Connection test failed',
    };
  }
}

export async function pingExistingMonitorAction(id: string) {
  try {
    const user = await requireAuth();
    const workspaceId = await getActiveWorkspaceId(user.id);
    if (!workspaceId) {
      return { success: false, message: 'No active workspace found' };
    }

    const { getMonitorById } = await import('@/lib/data/monitor-service');
    const monitor = await getMonitorById(id, workspaceId);
    if (!monitor) {
      return { success: false, message: 'Monitor not found' };
    }

    const { processMonitor } = await import('@/lib/monitors/ping');
    const success = await processMonitor(monitor);
    revalidatePath(`/dashboard/monitors/${id}`);
    revalidatePath('/dashboard/monitors');
    return { success, message: success ? 'Ping completed successfully' : 'Ping check failed' };
  } catch (error: any) {
    console.error('[PingNow Action Error]:', error);
    return { success: false, message: error.message || 'Ping operation failed' };
  }
}

