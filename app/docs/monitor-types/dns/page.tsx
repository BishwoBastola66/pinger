import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DNS Monitoring | Pinger API',
  description: 'Learn how to configure DNS monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/dns',
  }
};

export default function DNSMonitor() {
  return (
    <>
      <h1>DNS Monitoring</h1>
      <p>
        The <code>dns</code> monitor type allows you to track and alert on the health of your DNS configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>dns</code> monitor, ensure the <code>type</code> field is set to <code>dns</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
