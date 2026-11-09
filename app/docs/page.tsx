import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Getting Started with Pinger API | Pinger Documentation',
  description: 'Learn how to monitor your websites, APIs, and background jobs programmatically using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs',
  }
};

export default function GettingStarted() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Getting Started with Pinger API",
            "description": "Learn how to monitor your websites, APIs, and background jobs programmatically using the Pinger API.",
            "publisher": {
              "@type": "Organization",
              "name": "Pinger"
            }
          })
        }}
      />
      
      <h1>Getting Started</h1>
      <p>
        Welcome to the Pinger developer documentation. Pinger provides a powerful, programmatic way to 
        ensure your infrastructure is running smoothly. From standard HTTP uptime checks to complex JSON assertions 
        and dead man's switch heartbeat monitoring, Pinger helps you detect and resolve incidents faster.
      </p>

      <h2>What can you monitor?</h2>
      <p>Pinger natively supports 11 different monitor types to cover any part of your stack:</p>
      <ul>
        <li><strong>Website & API Monitoring:</strong> Test HTTP endpoints, assert on status codes, and measure response times.</li>
        <li><strong>Cron & Heartbeat:</strong> Use a dead man's switch to ensure background jobs and workers complete on schedule.</li>
        <li><strong>Database & Cloud:</strong> Specialized monitors for Supabase, Redis (TCP), and DNS configurations.</li>
        <li><strong>Security:</strong> SSL certificate expiration and Domain expiration tracking.</li>
      </ul>

      <h2>1. Get your API Key</h2>
      <p>
        To interact with the Pinger API, you need to create an API key inside your Workspace.
        Navigate to <strong>Settings &gt; API Keys</strong> in the <Link href="/dashboard">Dashboard</Link> and click 
        <strong>Create Key</strong>.
      </p>
      <p>
        Be sure to select the appropriate <Link href="/docs/api-keys">scopes</Link> (e.g., <code>monitors:read</code>, <code>monitors:write</code>) 
        and securely store the generated token. It will only be shown once.
      </p>

      <h2>2. Make your first request</h2>
      <p>
        Pinger uses standard HTTP Bearer authentication. Send your API key in the <code>Authorization</code> header.
      </p>

      <CodeBlock 
        title="List all monitors"
        language="bash"
        code={`curl https://api.pingr.site/api/v1/monitors \\
  -H "Authorization: Bearer pinger_xxxxxxxxxxxxxxxxx"`} 
      />

      <h2>3. Create a Monitor</h2>
      <p>
        You can dynamically create monitors via the API. This is especially useful for integrating Pinger into 
        your CI/CD pipelines or Infrastructure as Code (IaC) workflows.
      </p>

      <CodeBlock 
        title="Create a Website Monitor"
        language="bash"
        code={`curl -X POST https://api.pingr.site/api/v1/monitors \\
  -H "Authorization: Bearer pinger_xxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Website",
    "type": "website",
    "target": "https://pingr.site",
    "intervalSeconds": 60,
    "timeoutSeconds": 10
  }'`} 
      />

      <h2>Next Steps</h2>
      <p>Now that you've made your first request, explore the rest of the platform:</p>
      <ul>
        <li>Learn about <Link href="/docs/authentication">Authentication</Link> and security best practices.</li>
        <li>Review the <Link href="/docs/api-reference">API Reference</Link> for detailed endpoint schemas.</li>
        <li>Integrate <Link href="/docs/webhooks">Webhooks</Link> to receive automated incident alerts.</li>
        <li>Set up <Link href="/docs/monitor-types/heartbeat">Heartbeat Monitoring</Link> for your background cron jobs.</li>
      </ul>
    </>
  );
}
