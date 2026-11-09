import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'TCP Monitoring | Pinger API',
  description: 'Learn how to configure TCP monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/tcp',
  }
};

export default function TCPMonitor() {
  return (
    <>
      <h1>TCP Monitoring</h1>
      <p>
        The <code>tcp</code> monitor type allows you to track and alert on the health of your TCP configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>tcp</code> monitor, ensure the <code>type</code> field is set to <code>tcp</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
