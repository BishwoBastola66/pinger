import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Supabase Monitoring | Pinger API',
  description: 'Learn how to configure Supabase monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/supabase',
  }
};

export default function SupabaseMonitor() {
  return (
    <>
      <h1>Supabase Monitoring</h1>
      <p>
        The <code>supabase</code> monitor type allows you to track and alert on the health of your Supabase configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>supabase</code> monitor, ensure the <code>type</code> field is set to <code>supabase</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
