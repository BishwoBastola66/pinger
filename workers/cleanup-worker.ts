import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function cleanupLogs() {
  console.log('[CleanupWorker] Starting ping logs cleanup...');

  try {
    // Delete rows older than the 50th newest log per monitor
    const result = await db.execute(sql`
      DELETE FROM ping_logs
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) as row_num
          FROM ping_logs
        ) t
        WHERE t.row_num > 50
      )
    `);

    console.log(`[CleanupWorker] Cleanup complete. Processed log retention.`);
  } catch (error) {
    console.error('[CleanupWorker] Error during cleanup:', error);
  }
}

async function startWorker() {
  console.log('[CleanupWorker] Started log retention engine.');
  
  await cleanupLogs();

  setInterval(() => {
    cleanupLogs().catch(console.error);
  }, 3600000);
}

if (require.main === module) {
  startWorker().catch(console.error);
}
