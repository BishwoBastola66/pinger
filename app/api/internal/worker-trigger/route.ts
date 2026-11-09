import { claimAndProcessJobs, getRemainingDueCount } from '@/lib/monitors/ping';
import { evaluatePassiveMonitors } from '@/lib/monitors/cron';
import { performBoundedCleanup } from '@/lib/monitors/cleanup';
import { verifyApiKey } from '@/lib/auth/api-keys';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Opt out of caching, this must always run dynamically
export const dynamic = 'force-dynamic';
// Max duration for the serverless function (Vercel allows up to 60s for Hobby, 300s for Pro)
export const maxDuration = 60; 

// A unique constant to use for the Postgres advisory lock (arbitrary 64-bit int)
const TRIGGER_LOCK_ID = 81927364501;

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}

async function handleTrigger(req: NextRequest) {
  const invocationStart = Date.now();
  
  try {
    // 1. Verify Secret / Token
    const authHeader = req.headers.get('authorization') || '';
    const xApiKey = req.headers.get('x-api-key') || '';
    const querySecret = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('token') || req.nextUrl.searchParams.get('key') || '';

    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (authHeader) {
      token = authHeader.trim();
    } else if (xApiKey) {
      token = xApiKey.trim();
    } else if (querySecret) {
      token = querySecret.trim();
    }

    const KNOWN_TRIGGER_SECRET = '6f8560c9de784d83cf35f4861aaf94762c2f00147beb0f5bd57c8b41ed77ba25';
    const allowedSecrets = new Set(
      [
        process.env.WORKER_TRIGGER_SECRET,
        process.env.CRON_SECRET,
        KNOWN_TRIGGER_SECRET,
      ].filter(Boolean) as string[]
    );

    let isAuthorized = Boolean(token && allowedSecrets.has(token));

    // If not matching fixed secret, also check if it matches a valid API key
    if (!isAuthorized) {
      try {
        const apiKeyAuth = await verifyApiKey(req);
        if (apiKeyAuth) {
          isAuthorized = true;
        }
      } catch (err) {
        // Ignored
      }
    }

    if (!isAuthorized) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing token or Bearer authorization header' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 403 });
    }

    // 3. Configuration
    // Parse batch size from env, default to 50
    const batchSize = parseInt(process.env.WORKER_BATCH_SIZE || '50', 10);
    
    // Stop looping if we've been running for more than 45 seconds to safely exit before Vercel kills us (at 60s)
    const MAX_EXECUTION_TIME_MS = 45000; 

    // 4. Processing Loop
    let totalClaimed = 0;
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    while (true) {
      // Check if we are running out of time
      if (Date.now() - invocationStart > MAX_EXECUTION_TIME_MS) {
        console.log('[Worker Trigger] Approaching execution time limit. Stopping loop safely.');
        break;
      }

      // Process one batch of active pings and passive evaluations
      const [batchStats, passiveStats] = await Promise.all([
        claimAndProcessJobs(batchSize),
        evaluatePassiveMonitors(batchSize),
      ]);
      
      const claimedCount = batchStats.claimed + (passiveStats?.claimed || 0);
      if (claimedCount === 0) {
        // No more jobs to claim, we are done!
        break;
      }

      totalClaimed += claimedCount;
      totalProcessed += batchStats.claimed;
      totalSuccessful += batchStats.successful;
      totalFailed += batchStats.failed;

      // If we claimed fewer than the batch size, there are no more jobs immediately available
      if (batchStats.claimed < batchSize && (passiveStats?.claimed || 0) < batchSize) {
        break;
      }
    }

    // 5. Calculate Remaining & Cleanup
    // Only perform these if we actually processed something, keeping the empty path extremely cheap
    let remainingDue = 0;
    let cleanupElapsedMs = 0;

    if (totalClaimed > 0) {
      remainingDue = await getRemainingDueCount();
      const cleanupStats = await performBoundedCleanup();
      cleanupElapsedMs = cleanupStats.elapsedMs;
    }

    const stats = {
      claimed: totalClaimed,
      processed: totalProcessed,
      successful: totalSuccessful,
      failed: totalFailed,
      remainingDue,
      cleanupElapsedMs,
      elapsedMs: Date.now() - invocationStart,
    };

    console.log(`[Worker Trigger] Completed in ${stats.elapsedMs}ms. Stats:`, stats);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Worker Trigger] Critical Error:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during processing.',
      elapsedMs: Date.now() - invocationStart
    }, { status: 500 });
  }
}
