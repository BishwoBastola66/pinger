import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cron Monitoring | Pinger API',
  description: 'Learn how to configure Cron monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/cron',
  }
};

export default function CronMonitor() {
  return (
    <>
      <h1>Cron Monitoring</h1>
      <p>
        The <code>cron</code> monitor type allows you to track and alert on the health of your Cron configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>cron</code> monitor, ensure the <code>type</code> field is set to <code>cron</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
