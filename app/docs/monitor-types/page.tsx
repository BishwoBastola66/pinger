import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Supported Monitor Types | Pinger API',
  description: 'Pinger supports 11 different monitor types, including Website, API, Cron, and Heartbeat. Learn how to configure them.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types',
  }
};

export default function MonitorTypes() {
  return (
    <>
      <h1>Monitor Types</h1>
      <p>
        Pinger is built to monitor any part of your infrastructure. We currently support 11 different monitor types, 
        each tailored for a specific protocol or use case.
      </p>

      <h2>Standard Monitors</h2>
      <ul>
        <li><Link href="/docs/monitor-types/website">Website</Link>: Standard HTTP/HTTPS GET requests to verify uptime and response times.</li>
        <li><Link href="/docs/monitor-types/api">API</Link>: Advanced HTTP requests with custom headers, methods, and JSON body assertions.</li>
        <li><Link href="/docs/monitor-types/supabase">Supabase</Link>: Direct integration to verify Supabase project health endpoints.</li>
      </ul>

      <h2>Background Jobs</h2>
      <ul>
        <li><Link href="/docs/monitor-types/cron">Cron</Link>: Verify that a cron job runs on time, with a specified grace period.</li>
        <li><Link href="/docs/monitor-types/heartbeat">Heartbeat</Link>: A passive dead man's switch. Your application sends a ping to Pinger; if it stops, an incident is created.</li>
      </ul>

      <h2>Network Protocols</h2>
      <ul>
        <li><Link href="/docs/monitor-types/tcp">TCP</Link>: Ensure a specific IP or Domain is accepting connections on a given port.</li>
        <li><Link href="/docs/monitor-types/dns">DNS</Link>: Verify that DNS resolution is functioning properly for a given hostname.</li>
        <li><Link href="/docs/monitor-types/websocket">WebSocket</Link>: Verify that a WebSocket endpoint is accepting connections.</li>
      </ul>

      <h2>Security & Content</h2>
      <ul>
        <li><Link href="/docs/monitor-types/ssl">SSL</Link>: Track SSL/TLS certificate validity and receive alerts before expiration.</li>
        <li><Link href="/docs/monitor-types/domain">Domain</Link>: Monitor domain registration and receive alerts before the WHOIS expiry date.</li>
        <li><Link href="/docs/monitor-types/keyword">Keyword</Link>: Verify that a specific keyword exists (or does not exist) within an HTTP response body.</li>
      </ul>
    </>
  );
}
