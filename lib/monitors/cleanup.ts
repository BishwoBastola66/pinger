import { db } from '@/lib/db';
import { pingLogs, otpTokens, sessions } from '@/lib/db/schema';
import { lt, sql } from 'drizzle-orm';

export async function performBoundedCleanup() {
  const startTime = Date.now();
  let deletedCount = 0;

  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    await db.execute(sql`
      DELETE FROM otp_tokens 
      WHERE id IN (
        SELECT id FROM otp_tokens WHERE expires_at < ${fifteenMinsAgo} LIMIT 5000
      )
    `);
    
    await db.execute(sql`
      DELETE FROM sessions 
      WHERE id IN (
        SELECT id FROM sessions WHERE expires_at < NOW() LIMIT 5000
      )
    `);
    
    const MAX_PING_LOGS_PER_MONITOR = 5;
    await db.execute(sql`
      DELETE FROM ping_logs
      WHERE id IN (
        SELECT pl.id
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) as row_num
          FROM ping_logs
        ) pl
        WHERE pl.row_num > ${MAX_PING_LOGS_PER_MONITOR}
        LIMIT 5000
      );
    `);
    
  } catch (error) {
    console.error('[Cleanup] Bounded cleanup failed:', error);
  }

  return {
    elapsedMs: Date.now() - startTime
  };
}
