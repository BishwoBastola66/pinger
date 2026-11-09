import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Heartbeat Monitoring | Pinger API',
  description: 'Integrate dead man\'s switch heartbeat monitoring into your applications and cron jobs.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/heartbeat',
  }
};

export default function HeartbeatMonitor() {
  return (
    <>
      <h1>Heartbeat Monitoring</h1>
      <p>
        A <strong>Heartbeat</strong> monitor (often called a dead man's switch) works in reverse compared to standard monitors.
        Instead of Pinger actively reaching out to your service, your service actively pings Pinger at a regular interval.
        If Pinger does not receive a ping within the expected timeframe, an incident is triggered.
      </p>

      <h2>When to use Heartbeats</h2>
      <p>Heartbeat monitors are ideal for:</p>
      <ul>
        <li>Cron jobs and scheduled tasks (e.g., database backups, daily reports).</li>
        <li>Background workers and queue consumers.</li>
        <li>Services running in private networks or behind NATs where inbound traffic is blocked.</li>
      </ul>

      <h2>Configuration</h2>
      <p>
        When you create a Heartbeat monitor, Pinger generates a unique <code>heartbeatSecret</code> for it. 
        You configure an <code>intervalSeconds</code> (how often you expect it to ping) and a <code>gracePeriodSeconds</code> 
        (how late it can be before triggering an alert).
      </p>

      <h2>Integration Guide</h2>
      <p>
        Once you have your heartbeat secret, you must send an HTTP <code>POST</code> request to the reporting endpoint. 
        The secret must be included in the URL path.
      </p>

      <div className="flex items-center gap-4 mb-4 mt-6">
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-bold font-mono">POST</span>
        <code className="bg-gray-100 px-2 py-1 rounded-md">/api/heartbeat/:secret</code>
      </div>

      <CodeBlock 
        title="cURL Example"
        language="bash"
        code={`curl -X POST https://api.pingr.site/api/heartbeat/your_heartbeat_secret_here`} 
      />

      <CodeBlock 
        title="JavaScript Example"
        language="javascript"
        code={`// Run this at the very end of your cron job
async function reportSuccess() {
  await fetch('https://api.pingr.site/api/heartbeat/your_heartbeat_secret_here', {
    method: 'POST'
  });
}`} 
      />

      <CodeBlock 
        title="Python Example"
        language="python"
        code={`import requests

# Run this at the very end of your cron job
def report_success():
    requests.post('https://api.pingr.site/api/heartbeat/your_heartbeat_secret_here')`} 
      />

      <h2>Production Recommendations</h2>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-sm text-yellow-800 m-0">
          <strong>Security Warning:</strong> Treat your <code>heartbeatSecret</code> like a password. Do not hardcode it in public repositories. Store it in a secure environment variable and rotate it if it becomes compromised.
        </p>
      </div>

      <h2>Rate Limiting & Limitations</h2>
      <p>
        Heartbeat endpoints are strictly rate-limited to <strong>1 request per second</strong> per monitor to prevent accidental infinite-loop DoS attacks. 
        If you ping more frequently than once per second, you will receive a <code>429 Too Many Requests</code> response.
      </p>
      
      <h3>Responses</h3>
      <ul>
        <li><code>200 OK</code>: Heartbeat successfully recorded.</li>
        <li><code>404 Not Found</code>: Invalid or revoked heartbeat secret.</li>
        <li><code>429 Too Many Requests</code>: Pinging too fast (less than 1 second apart).</li>
      </ul>
    </>
  );
}
