import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { monitors, pingLogs, monitorStats, incidents, notifications, cron, heartbeat } from '@/lib/db/schema';
import { dispatchNotification } from '@/lib/notifications/router';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { CronExpressionParser } from 'cron-parser';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  try {
    let secret = '';
    
    // Check Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      secret = authHeader.substring(7);
    } else {
      // Fallback to URL parameter
      const p = await params;
      secret = p.secret;
    }

    if (!secret || secret.length < 16) {
      // Return a generic unauthorized to prevent enumeration
      return new NextResponse(null, { status: 401 });
    }

    const hashedSecret = crypto.createHash('sha256').update(secret).digest('hex');

    // Use a transaction to safely lock the monitor row and prevent race conditions with passive evaluator
    const result = await db.transaction(async (tx) => {
      // Lock the row for update
      const res = await tx.execute(sql`
        SELECT * FROM monitors 
        WHERE heartbeat_secret = ${hashedSecret} 
        FOR UPDATE
      `);
      
      if (res.length === 0) {
        return { error: 'unauthorized', status: 401 };
      }

      const monitorRow = res[0] as any;

      if (!monitorRow.enabled) {
        return { error: 'disabled', status: 403 };
      }

      if (monitorRow.type !== 'cron' && monitorRow.type !== 'heartbeat') {
        return { error: 'wrong_type', status: 400 };
      }

      // Rate limiting: Prevent abuse by requiring at least 1 second between heartbeats
      const now = new Date();
      if (monitorRow.last_ping_at) {
        const msSinceLastPing = now.getTime() - new Date(monitorRow.last_ping_at).getTime();
        if (msSinceLastPing < 1000) {
          return { error: 'rate_limited', status: 429 };
        }
      }

      const startTime = Date.now();
      let durationSeconds: number | null = null;
      
      try {
        const body = await request.json();
        if (body && 'durationSeconds' in body) {
          const ds = body.durationSeconds;
          if (typeof ds === 'number' && Number.isFinite(ds) && ds >= 0 && ds <= 86400) {
            durationSeconds = ds;
          } else {
            return { error: 'invalid_duration', status: 400 };
          }
        }
      } catch (e) {
        // Ignore if no JSON body or malformed
      }

      // Reset failures and resolve active incidents if recovering
      if (monitorRow.status === 'failing' || monitorRow.status === 'degraded' || monitorRow.consecutive_failures > 0) {
        const activeIncidents = await tx.execute(sql`SELECT * FROM incidents WHERE monitor_id = ${monitorRow.id} AND status = 'ongoing'`);
        
        await tx.execute(sql`
          UPDATE incidents 
          SET status = 'resolved', resolved_at = NOW() 
          WHERE monitor_id = ${monitorRow.id} AND status = 'ongoing'
        `);
        
        if (activeIncidents.length > 0) {
          try {
            await tx.insert(notifications).values({
              accountId: monitorRow.user_id,
              title: 'Heartbeat Recovered',
              message: `Heartbeat monitor "${monitorRow.name}" received a signal and is back online.`,
              type: 'success',
              isRead: false,
            });
          } catch (err) {
            console.error('[Heartbeat] Failed to insert notification:', err);
          }
        }
      }

      let nextExpectedTime = now;
      let newStatus = 'healthy';

      if (monitorRow.type === 'cron' && monitorRow.cron_expression) {
        try {
          const interval = CronExpressionParser.parse(monitorRow.cron_expression, { 
            tz: monitorRow.timezone || 'UTC', 
            currentDate: now
          });
          nextExpectedTime = interval.next().toDate();
        } catch (err) {
          // Mark configuration as invalid and don't calculate next expected time correctly
          newStatus = 'invalid_configuration';
          nextExpectedTime = new Date(now.getTime() + 60 * 60 * 1000); // Push it out 1hr to prevent hot-loop
        }
      } else {
        nextExpectedTime = new Date(now.getTime() + (monitorRow.interval_seconds || 60) * 1000);
      }

      const gracePeriod = (monitorRow.grace_period_seconds || 0) * 1000;
      const nextPingAt = new Date(nextExpectedTime.getTime() + gracePeriod);
      const responseTime = durationSeconds !== null ? Math.round(durationSeconds * 1000) : Date.now() - startTime;

      await Promise.all([
        tx.insert(pingLogs).values({
          monitorId: monitorRow.id,
          success: newStatus === 'healthy',
          statusCode: 200,
          responseTime: responseTime,
          errorType: newStatus === 'invalid_configuration' ? 'invalid_configuration' : null,
          errorMessage: newStatus === 'invalid_configuration' ? 'Invalid cron expression or timezone' : null,
        }),
        
        tx.execute(sql`
          INSERT INTO monitor_stats (monitor_id, total_checks, successful_checks, failed_checks, fastest_response, slowest_response)
          VALUES (${monitorRow.id}, 1, 1, 0, ${responseTime}, ${responseTime})
          ON CONFLICT (monitor_id) DO UPDATE SET
            total_checks = monitor_stats.total_checks + 1,
            successful_checks = monitor_stats.successful_checks + 1,
            fastest_response = LEAST(monitor_stats.fastest_response, ${responseTime}),
            slowest_response = GREATEST(monitor_stats.slowest_response, ${responseTime}),
            updated_at = NOW()
        `),
        
        tx.update(monitors).set({
          status: newStatus as any,
          consecutiveFailures: 0,
          lastPingAt: new Date(),
        }).where(eq(monitors.id, monitorRow.id)),
        monitorRow.type === 'cron'
          ? tx.update(cron).set({ nextPingAt, lockedAt: null }).where(eq(cron.monitorId, monitorRow.id))
          : tx.update(heartbeat).set({ nextPingAt, lockedAt: null }).where(eq(heartbeat.monitorId, monitorRow.id))
      ]);

      return { ok: true, status: 200 };
    });

    if (result.error) {
      if (result.error === 'unauthorized') {
        return new NextResponse(null, { status: result.status });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Heartbeat Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
