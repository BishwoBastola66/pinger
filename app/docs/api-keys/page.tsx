import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Managing API Keys & Scopes | Pinger API',
  description: 'Understand how Pinger API keys are generated, revoked, and scoped for secure access.',
  alternates: {
    canonical: 'https://pingr.site/docs/api-keys',
  }
};

export default function ApiKeys() {
  return (
    <>
      <h1>API Keys & Scopes</h1>
      <p>
        API Keys are the primary method of interacting programmatically with Pinger. 
        Each API key belongs to a specific Workspace and can be restricted to specific permissions called <strong>scopes</strong>.
      </p>

      <h2>Creating an API Key</h2>
      <p>
        To create a new API key:
      </p>
      <ol>
        <li>Log in to your Pinger Dashboard.</li>
        <li>Navigate to the <strong>Settings &gt; API Keys</strong> tab.</li>
        <li>Click <strong>Generate Key</strong>.</li>
        <li>Assign a descriptive name and select the necessary scopes.</li>
        <li>Store the generated <code>pinger_...</code> token securely. It will not be shown again.</li>
      </ol>

      <h2>Supported Scopes</h2>
      <p>
        Scopes define what an API key is allowed to do. When creating a key, you must grant it one or more scopes.
        Pinger currently supports the following scopes:
      </p>
      
      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>monitors:read</code></td>
            <td>Read</td>
            <td>Allows the key to query monitors, ping logs, real-time uptime status, and latency metrics.</td>
          </tr>
          <tr>
            <td><code>monitors:write</code></td>
            <td>Write</td>
            <td>Allows the key to create, update, pause/resume, and delete monitors in the workspace.</td>
          </tr>
          <tr>
            <td><code>incidents:read</code></td>
            <td>Read</td>
            <td>Allows reading published incident histories, timeline entries, and scheduled maintenance windows.</td>
          </tr>
          <tr>
            <td><code>incidents:write</code></td>
            <td>Write</td>
            <td>Allows creating and publishing incident alerts, posting progress updates, and scheduling maintenance outages.</td>
          </tr>
          <tr>
            <td><code>heartbeats:write</code></td>
            <td>Write</td>
            <td>Allows sending cron job check-ins and pushing worker heartbeats or telemetry logs.</td>
          </tr>
          <tr>
            <td><code>status:read</code></td>
            <td>Read</td>
            <td>Allows reading public status page configuration and custom domain verification status.</td>
          </tr>
        </tbody>
      </table>
      
      <p>
        <em>Note:</em> The <code>monitors:write</code> scope inherently allows reading monitor data to facilitate update workflows.
      </p>

      <h2>Revocation and Rotation</h2>
      <p>
        If you suspect an API key has been compromised, you should revoke it immediately from the Dashboard.
        Once revoked, any API request utilizing that key will immediately fail with a <code>401 Unauthorized</code> status.
      </p>
      <p>
        We recommend rotating your API keys periodically. To rotate a key without downtime:
      </p>
      <ol>
        <li>Generate a new API key with the exact same scopes.</li>
        <li>Update your application's environment variables to use the new key.</li>
        <li>Deploy your application.</li>
        <li>Revoke the old API key in the Pinger Dashboard.</li>
      </ol>

      <h2>Plan Restrictions</h2>
      <p>
        The number of active API keys you can have per workspace is governed by your subscription plan.
        For example, the Free plan allows 1 API key, while Business plans support unlimited keys. 
        Check your <Link href="/dashboard/billing">Billing</Link> page to view your limits.
      </p>
    </>
  );
}
