import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Domain Monitoring | Pinger API',
  description: 'Learn how to configure Domain monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/domain',
  }
};

export default function DomainMonitor() {
  return (
    <>
      <h1>Domain Monitoring</h1>
      <p>
        The <code>domain</code> monitor type allows you to track and alert on the health of your Domain configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>domain</code> monitor, ensure the <code>type</code> field is set to <code>domain</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
