import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Errors | Pinger API',
  description: 'A comprehensive guide to understanding Pinger API error codes and troubleshooting failed requests.',
  alternates: {
    canonical: 'https://pingr.site/docs/errors',
  }
};

export default function Errors() {
  return (
    <>
      <h1>Errors</h1>
      <p>
        The Pinger API uses standard HTTP status codes to indicate the success or failure of an API request.
        In general, codes in the <code>2xx</code> range indicate success. Codes in the <code>4xx</code> range indicate an error 
        that failed given the information provided (e.g., a required parameter was omitted). Codes in the <code>5xx</code> range 
        indicate a rare error with Pinger's servers.
      </p>

      <h2>Error Response Format</h2>
      <p>
        When a request fails, the API returns a JSON response containing an <code>error</code> property with a brief description.
        For validation errors (like a <code>400 Bad Request</code>), a <code>details</code> object may also be present, providing 
        field-specific validation failures.
      </p>

      <CodeBlock 
        title="Example Validation Error (400)"
        language="json"
        code={`{
  "error": "Invalid fields",
  "details": {
    "fieldErrors": {
      "target": ["Required"],
      "intervalSeconds": ["Number must be greater than or equal to 60"]
    }
  }
}`} 
      />

      <h2>HTTP Status Code Reference</h2>
      
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Meaning</th>
            <th>Resolution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>200 OK</code></td>
            <td>Success</td>
            <td>The request completed successfully.</td>
          </tr>
          <tr>
            <td><code>201 Created</code></td>
            <td>Created</td>
            <td>The monitor or resource was successfully created.</td>
          </tr>
          <tr>
            <td><code>400 Bad Request</code></td>
            <td>Validation Error</td>
            <td>Check the <code>details</code> object. Ensure all required fields (like <code>name</code>, <code>type</code>, and <code>target</code>) are provided and correctly typed.</td>
          </tr>
          <tr>
            <td><code>401 Unauthorized</code></td>
            <td>Authentication Failed</td>
            <td>Provide a valid API key in the <code>Authorization: Bearer</code> header. See <Link href="/docs/authentication">Authentication</Link>.</td>
          </tr>
          <tr>
            <td><code>403 Forbidden</code></td>
            <td>Insufficient Scope</td>
            <td>Your API key is valid, but lacks the necessary scope (e.g., <code>monitors:write</code>) to perform this action.</td>
          </tr>
          <tr>
            <td><code>404 Not Found</code></td>
            <td>Resource Missing</td>
            <td>The requested monitor or status page does not exist, or does not belong to your workspace.</td>
          </tr>
          <tr>
            <td><code>429 Too Many Requests</code></td>
            <td>Rate Limited</td>
            <td>You have exceeded your plan's API quota. See <Link href="/docs/rate-limits">Rate Limits</Link> for details.</td>
          </tr>
          <tr>
            <td><code>500 Internal Error</code></td>
            <td>Server Failure</td>
            <td>An unexpected error occurred on Pinger's backend. If this persists, contact support.</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
