import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { claimAndProcessJobs } from '../lib/monitors/ping';
import { evaluatePassiveMonitors } from '../lib/monitors/cron';
const CONCURRENCY_LIMIT = 20;
const IDLE_SLEEP_MS = 2000;
const BUSY_SLEEP_MS = 50;

async function startWorker() {
  console.log('🚀 [Worker] Starting Ping Engine...');
  console.log(`[Worker] Concurrency limit: ${CONCURRENCY_LIMIT} jobs/batch`);
  
  while (true) {
    try {
      const [batchStats, passiveStats] = await Promise.all([
        claimAndProcessJobs(CONCURRENCY_LIMIT),
        evaluatePassiveMonitors(CONCURRENCY_LIMIT)
      ]);
      
      if (batchStats.claimed === 0 && passiveStats.claimed === 0) {
        await new Promise(resolve => setTimeout(resolve, IDLE_SLEEP_MS));
      } else {
        await new Promise(resolve => setTimeout(resolve, BUSY_SLEEP_MS));
      }
    } catch (err) {
      console.error('[Worker] Critical error in processing loop:', err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

if (require.main === module) {
  startWorker().catch(err => {
    console.error('[Worker] Fatal error, exiting:', err);
    process.exit(1);
  });
}
