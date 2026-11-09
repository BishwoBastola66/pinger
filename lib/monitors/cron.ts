import { db } from '@/lib/db';
import { sql, eq, and, or, isNull } from 'drizzle-orm';
import { monitors, pingLogs, monitorStats, incidents, notifications } from '@/lib/db/schema';
import { dispatchNotification } from '@/lib/notifications/router';
import { claimPassiveMonitors, updateMonitorPingResult } from '@/lib/data/monitor-service';
import { CronExpressionParser } from 'cron-parser';

export async function processMissedPassiveMonitor(monitor: any): Promise<boolean> {
  return await db.transaction(async (tx) => {
    // If it's no longer due, it means a heartbeat processed it while we were waiting to lock
    if (new Date(monitor.nextPingAt).getTime() > Date.now()) {
      return false;
    }

    console.log(`[Worker] Passive evaluator: monitor ${monitor.id} missed its expected window`);

    let newConsecutiveFailures = (monitor.consecutiveFailures || 0) + 1;
    const threshold = monitor.failureThreshold || 1;
    let newStatus = monitor.status;
    let isInvalidConfig = false;
    let nextExpectedTime = new Date();
    
    if (monitor.type === 'cron' && monitor.cronExpression) {
      try {
        const interval = CronExpressionParser.parse(monitor.cronExpression, { 
          tz: monitor.timezone || 'UTC', 
          currentDate: new Date()
        });
        nextExpectedTime = interval.next().toDate();
      } catch (err) {
        newStatus = 'invalid_configuration';
        isInvalidConfig = true;
        nextExpectedTime = new Date(Date.now() + 60 * 60 * 1000); // 1hr fallback just for progression
      }
    } else {
      nextExpectedTime = new Date(Date.now() + (monitor.intervalSeconds || 60) * 1000);
    }
    
    if (!isInvalidConfig) {
      if (newConsecutiveFailures >= threshold) {
        newStatus = 'failing';
        // Create incident if one doesn't exist. Relies on the unique index on incidents to prevent duplicates.
        try {
          await tx.insert(incidents).values({
            monitorId: monitor.id,
            status: 'ongoing',
            errorType: 'missed_execution',
            errorMessage: `Missed execution. Grace period expired.`,
          }).onConflictDoNothing(); // If unique index triggers, do nothing
          
          try {
            await tx.insert(notifications).values({
              accountId: monitor.userId,
              title: monitor.type === 'cron' ? 'Cron Execution Missed' : 'Heartbeat Missed',
              message: `Monitor "${monitor.name}" missed execution. Grace period expired.`,
              type: 'alert',
              isRead: false,
            });
          } catch (e) {
            // Ignore notification insert error
          }
        } catch (e) {
          // Ignore unique constraint errors
        }
      } else {
        newStatus = 'degraded';
      }
    }

    const gracePeriod = (monitor.gracePeriodSeconds || 0) * 1000;
    const nextPingAt = new Date(nextExpectedTime.getTime() + gracePeriod);
    const errorMessage = isInvalidConfig ? 'Invalid cron expression or timezone' : 'Missed expected execution';

    await Promise.all([
      tx.insert(pingLogs).values({
        monitorId: monitor.id,
        success: false,
        statusCode: null,
        responseTime: null,
        errorType: isInvalidConfig ? 'invalid_configuration' : 'missed_execution',
        errorMessage: errorMessage,
      }),
      
      tx.execute(sql`
        INSERT INTO monitor_stats (monitor_id, total_checks, successful_checks, failed_checks, fastest_response, slowest_response)
        VALUES (${monitor.id}, 1, 0, 1, NULL, NULL)
        ON CONFLICT (monitor_id) DO UPDATE SET
          total_checks = monitor_stats.total_checks + 1,
          failed_checks = monitor_stats.failed_checks + 1,
          updated_at = NOW()
      `)
    ]);

    await updateMonitorPingResult(tx, monitor.id, monitor.type, newStatus, newConsecutiveFailures, nextPingAt, null, 0);

    return false;
  });
}

export async function evaluatePassiveMonitors(limit: number = 20): Promise<{ claimed: number; missed: number }> {
  try {
    const claimedMonitors = await claimPassiveMonitors(limit);

    if (claimedMonitors.length > 0) {
      console.log(`[Worker] Passive Evaluator claimed ${claimedMonitors.length} missed jobs.`);
      await Promise.all(claimedMonitors.map(m => processMissedPassiveMonitor(m)));
      
      return { claimed: claimedMonitors.length, missed: claimedMonitors.length };
    }
    
    return { claimed: 0, missed: 0 };
  } catch (error) {
    console.error('[Worker] Error evaluating passive monitors:', error);
    return { claimed: 0, missed: 0 };
  }
}
