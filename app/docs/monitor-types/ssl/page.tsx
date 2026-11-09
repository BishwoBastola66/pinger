import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SSL Monitoring | Pinger API',
  description: 'Learn how to configure SSL monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/ssl',
  }
};

export default function SSLMonitor() {
  return (
    <>
      <h1>SSL Monitoring</h1>
      <p>
        The <code>ssl</code> monitor type allows you to track and alert on the health of your SSL configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>ssl</code> monitor, ensure the <code>type</code> field is set to <code>ssl</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
