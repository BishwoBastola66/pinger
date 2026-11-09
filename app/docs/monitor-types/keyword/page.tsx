import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Keyword Monitoring | Pinger API',
  description: 'Learn how to configure Keyword monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/keyword',
  }
};

export default function KeywordMonitor() {
  return (
    <>
      <h1>Keyword Monitoring</h1>
      <p>
        The <code>keyword</code> monitor type allows you to track and alert on the health of your Keyword configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>keyword</code> monitor, ensure the <code>type</code> field is set to <code>keyword</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
