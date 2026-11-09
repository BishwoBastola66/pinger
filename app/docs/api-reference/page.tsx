import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Reference | Pinger REST API',
  description: 'Complete API reference for Pinger. Learn how to programmatically manage your uptime and cron monitors.',
  alternates: {
    canonical: 'https://pingr.site/docs/api-reference',
  }
};

export default function ApiReference() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Pinger REST API Reference",
            "description": "Complete API reference for Pinger. Learn how to programmatically manage your uptime and cron monitors."
          })
        }}
      />
      
      <h1>API Reference</h1>
      <p>
        The Pinger REST API allows you to programmatically manage your monitors. All endpoints are rooted at <code>https://api.pingr.site/api/v1/</code> and require Bearer token authentication.
      </p>
      
      <hr className="my-10" />

      <h2 id="list-monitors">List Monitors</h2>
      <p>Retrieves a list of all monitors belonging to your workspace.</p>
      
      <div className="flex items-center gap-4 mb-4">
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-bold font-mono">GET</span>
        <code className="bg-gray-100 px-2 py-1 rounded-md">/api/v1/monitors</code>
      </div>
      
      <ul className="mb-6">
        <li><strong>Auth required:</strong> Yes</li>
        <li><strong>Required Scope:</strong> <code>monitors:read</code> or <code>monitors:write</code></li>
      </ul>

      <h3>Response</h3>
      <CodeBlock 
        title="200 OK"
        language="json"
        code={`{
  "monitors": [
    {
      "id": "11223344-5566-7788-9900-aabbccddeeff",
      "name": "Production Website",
      "type": "website",
      "target": "https://pingr.site",
      "intervalSeconds": 60,
      "enabled": true,
      "status": "healthy"
    }
  ]
}`} 
      />

      <hr className="my-10" />

      <h2 id="create-monitor">Create Monitor</h2>
      <p>Creates a new monitor.</p>
      
      <div className="flex items-center gap-4 mb-4">
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-bold font-mono">POST</span>
        <code className="bg-gray-100 px-2 py-1 rounded-md">/api/v1/monitors</code>
      </div>
      
      <ul className="mb-6">
        <li><strong>Auth required:</strong> Yes</li>
        <li><strong>Required Scope:</strong> <code>monitors:write</code></li>
      </ul>

      <h3>Request Body Schema</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>string</td>
            <td><strong>Required.</strong> The name of the monitor.</td>
          </tr>
          <tr>
            <td><code>type</code></td>
            <td>string</td>
            <td><strong>Required.</strong> The type of monitor (e.g. <code>website</code>, <code>api</code>, <code>heartbeat</code>).</td>
          </tr>
          <tr>
            <td><code>target</code></td>
            <td>string</td>
            <td><strong>Required.</strong> The URL, IP, or dummy target (for heartbeats).</td>
          </tr>
          <tr>
            <td><code>intervalSeconds</code></td>
            <td>number</td>
            <td><strong>Required.</strong> Frequency of checks in seconds.</td>
          </tr>
          <tr>
            <td><code>timeoutSeconds</code></td>
            <td>number</td>
            <td>Optional. Timeout limit in seconds.</td>
          </tr>
        </tbody>
      </table>

      <h3>Example Request</h3>
      <CodeBlock 
        title="cURL Request"
        language="bash"
        code={`curl -X POST https://api.pingr.site/api/v1/monitors \\
  -H "Authorization: Bearer pinger_xxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "API Health",
    "type": "api",
    "target": "https://api.pingr.site/health",
    "intervalSeconds": 60,
    "expectedStatus": 200
  }'`} 
      />

      <h3>Response</h3>
      <CodeBlock 
        title="201 Created"
        language="json"
        code={`{
  "monitor": {
    "id": "11223344-5566-7788-9900-aabbccddeeff",
    "name": "API Health",
    "type": "api",
    "target": "https://api.pingr.site/health",
    "intervalSeconds": 60,
    "enabled": true,
    "status": "pending"
  }
}`} 
      />

      <hr className="my-10" />

      <h2 id="get-monitor">Get a Monitor</h2>
      <p>Retrieves detailed information about a specific monitor by ID.</p>
      
      <div className="flex items-center gap-4 mb-4">
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-bold font-mono">GET</span>
        <code className="bg-gray-100 px-2 py-1 rounded-md">/api/v1/monitors/:id</code>
      </div>

      <ul className="mb-6">
        <li><strong>Auth required:</strong> Yes</li>
        <li><strong>Required Scope:</strong> <code>monitors:read</code> or <code>monitors:write</code></li>
      </ul>

      <hr className="my-10" />

      <h2 id="delete-monitor">Delete Monitor</h2>
      <p>Permanently deletes a monitor and all associated ping history and incidents.</p>
      
      <div className="flex items-center gap-4 mb-4">
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-bold font-mono">DELETE</span>
        <code className="bg-gray-100 px-2 py-1 rounded-md">/api/v1/monitors/:id</code>
      </div>

      <ul className="mb-6">
        <li><strong>Auth required:</strong> Yes</li>
        <li><strong>Required Scope:</strong> <code>monitors:write</code></li>
      </ul>
      
      <h3>Response</h3>
      <CodeBlock 
        title="200 OK"
        language="json"
        code={`{
  "success": true
}`} 
      />

    </>
  );
}
