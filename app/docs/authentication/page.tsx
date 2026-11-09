import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication & Security | Pinger API',
  description: 'Learn how to securely authenticate your requests to the Pinger API using scoped Bearer tokens.',
  alternates: {
    canonical: 'https://pingr.site/docs/authentication',
  }
};

export default function Authentication() {
  return (
    <>
      <h1>Authentication</h1>
      <p>
        The Pinger API uses API keys to authenticate requests. You can view and manage your API keys in the 
        Pinger Dashboard under <strong>Settings &gt; API Keys</strong>.
      </p>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-sm text-yellow-800 m-0">
          <strong>Security Warning:</strong> Your API keys carry many privileges. Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, or public forums.
        </p>
      </div>

      <h2>Bearer Token Authentication</h2>
      <p>
        Authentication to the API is performed via HTTP Bearer Auth. Provide your API key as the bearer token 
        value in the <code>Authorization</code> header of every request.
      </p>

      <CodeBlock 
        title="Authentication Example"
        language="bash"
        code={`curl https://api.pingr.site/api/v1/monitors \\
  -H "Authorization: Bearer pinger_xxxxxxxxxxxxxxxxx"`} 
      />

      <h2>Authentication Errors</h2>
      <p>If you fail to authenticate, or if your API key lacks the necessary scopes, you will receive one of the following error responses:</p>
      
      <table>
        <thead>
          <tr>
            <th>Status Code</th>
            <th>Meaning</th>
            <th>Common Cause</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>401 Unauthorized</code></td>
            <td>Invalid or missing API key</td>
            <td>The <code>Authorization</code> header is missing, malformed, or the key was revoked/deleted.</td>
          </tr>
          <tr>
            <td><code>403 Forbidden</code></td>
            <td>Insufficient Scopes</td>
            <td>The provided API key is valid but does not have the required <Link href="/docs/api-keys">scopes</Link> (e.g., trying to create a monitor with a read-only key).</td>
          </tr>
        </tbody>
      </table>

      <h2>Secure Key Storage</h2>
      <p>
        We strongly recommend injecting your API keys into your application at runtime using environment variables.
      </p>
      
      <CodeBlock 
        title="Node.js Example"
        language="javascript"
        code={`const response = await fetch('https://api.pingr.site/api/v1/monitors', {
  headers: {
    'Authorization': \`Bearer \${process.env.PINGER_API_KEY}\`
  }
});`} 
      />
    </>
  );
}
