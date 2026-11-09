import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Monitoring | Pinger API',
  description: 'Learn how to configure API monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/api',
  }
};

export default function APIMonitor() {
  return (
    <>
      <h1>API Monitoring</h1>
      <p>
        The <code>api</code> monitor type allows you to track and alert on the health of your API configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>api</code> monitor, ensure the <code>type</code> field is set to <code>api</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
