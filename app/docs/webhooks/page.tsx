import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Webhook Notifications | Pinger API',
  description: 'Configure and consume webhook notifications to receive instant alerts when your monitors go down.',
  alternates: {
    canonical: 'https://pingr.site/docs/webhooks',
  }
};

export default function Webhooks() {
  return (
    <>
      <h1>Webhook Notifications</h1>
      <p>
        Webhooks allow you to build custom integrations that react instantly when Pinger detects an issue.
        Instead of constantly polling the API, Pinger will send a <code>POST</code> request to your configured endpoint 
        as soon as an incident begins or resolves.
      </p>

      <h2>Supported Events</h2>
      <p>
        Pinger dispatches webhook events for two primary scenarios:
      </p>
      <ul>
        <li><strong>Incident Created:</strong> A monitor failed continuously and exceeded its failure threshold (or missed a heartbeat).</li>
        <li><strong>Incident Resolved:</strong> A monitor successfully recovered.</li>
      </ul>

      <h2>Payload Structure</h2>
      <p>
        When a webhook is triggered, Pinger sends a JSON payload containing details about the incident and the monitor.
      </p>

      <CodeBlock 
        title="Example Webhook Payload"
        language="json"
        code={`{
  "event": "incident_created",
  "monitor": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Production Database",
    "target": "tcp://db.pingr.site:5432"
  },
  "incident": {
    "id": "11223344-5566-7788-9900-aabbccddeeff",
    "startedAt": "2026-09-20T12:00:00Z",
    "cause": "Connection Refused (ECONNREFUSED)"
  }
}`} 
      />

      <p>
        When the incident resolves, the same structure is dispatched but the <code>event</code> will be <code>incident_resolved</code> 
        and the incident block will contain a <code>resolvedAt</code> timestamp.
      </p>

      <h2>Security & SSRF Mitigation</h2>
      <p>
        Pinger employs strict <strong>Server-Side Request Forgery (SSRF)</strong> mitigations on all webhook dispatchers.
        When configuring a webhook URL, ensure it is a public endpoint. 
      </p>
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p className="text-sm text-red-800 m-0">
          <strong>Blocked Destinations:</strong> Webhooks targeting <code>localhost</code>, <code>127.0.0.1</code>, internal network CIDRs, or Cloud Metadata IPs (e.g. <code>169.254.169.254</code>) will be blocked at the network level and silently dropped.
        </p>
      </div>

      <h2>Timeouts & Retries</h2>
      <p>
        Webhook dispatches have a strict <strong>5-second timeout</strong>. If your server takes longer than 5 seconds to respond, 
        the delivery is considered failed. Pinger currently operates a best-effort delivery mechanism and does not implement exponential backoff retries for failed webhooks. 
        It is recommended to acknowledge the webhook with a <code>200 OK</code> immediately and process the payload asynchronously.
      </p>
    </>
  );
}
