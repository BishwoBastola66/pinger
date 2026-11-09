import { Metadata } from 'next';
import { CodeBlock } from '@/components/docs/CodeBlock';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Rate Limits | Pinger API',
  description: 'Learn how Pinger calculates API rate limits based on your subscription plan and how to handle 429 status codes.',
  alternates: {
    canonical: 'https://pingr.site/docs/rate-limits',
  }
};

export default function RateLimits() {
  return (
    <>
      <h1>Rate Limits</h1>
      <p>
        To ensure stability and fair use of the platform, the Pinger API enforces rate limits on all incoming requests. 
        These limits are determined by your workspace's current subscription plan.
      </p>

      <h2>Plan Allowances</h2>
      <p>
        API access is measured in <strong>requests per month</strong> and active API keys:
      </p>
      <ul>
        <li><strong>Free Plan:</strong> 500 API calls / month &bull; 1 active API key &bull; 5 monitors max &bull; 3-min (180s) min interval &bull; Basic monitors only (Website, REST API, Supabase).</li>
        <li><strong>Pro Plan:</strong> 50,000 API calls / month &bull; 10 active API keys &bull; 50 monitors max &bull; 1-min (60s) min interval &bull; Advanced monitors included (TCP, DNS, SSL).</li>
        <li><strong>Business Plan:</strong> Unlimited API calls &bull; Unlimited API keys &bull; 250 monitors max &bull; 1-min (60s) min interval &bull; All monitor types.</li>
        <li><strong>Enterprise Plan:</strong> Unlimited API calls &bull; Unlimited API keys &bull; 1,000+ monitors max &bull; 30-sec (30s) min interval &bull; All monitor types &bull; Custom SLA.</li>
      </ul>
      <p>
        Your monthly API quota resets automatically on a rolling 30-day billing cycle. If you hit your quota, 
        you will need to wait for the reset or upgrade your <Link href="/dashboard/billing">plan</Link>.
      </p>

      <h2>Rate Limit Response Headers</h2>
      <p>Every response from the REST API includes standard rate limit headers to help you track your quota in real time:</p>
      <ul>
        <li><code>X-RateLimit-Limit</code> &mdash; The total requests allowed in your billing cycle (e.g. <code>500</code>, <code>50000</code>, or <code>Unlimited</code>).</li>
        <li><code>X-RateLimit-Remaining</code> &mdash; The number of requests remaining in your current cycle.</li>
        <li><code>X-RateLimit-Plan</code> &mdash; Your current workspace subscription plan tier.</li>
      </ul>

      <h2>Handling Rate Limits</h2>
      <p>
        If your workspace exceeds its monthly API quota, the API will respond with a <code>429 Too Many Requests</code> HTTP status code along with a <code>Retry-After</code> header:
      </p>

      <CodeBlock 
        title="Example 429 Response"
        language="json"
        code={`{
  "error": "Too Many Requests",
  "message": "API Rate Limit Exceeded: Monthly quota of 500 requests exhausted for the Free plan. Upgrade your plan at /dashboard/billing to increase your quota.",
  "limit": 500,
  "remaining": 0,
  "plan": "Free"
}`} 
      />

      <h2>Plan Tier Constraints on Monitors API</h2>
      <p>When creating or updating monitors via <code>POST /api/v1/monitors</code> or <code>PATCH /api/v1/monitors/:id</code>:</p>
      <ul>
        <li><strong>Max Monitors (402 Payment Required):</strong> Exceeding your plan's monitor allowance (5 on Free, 50 on Pro, 250 on Business, 1000 on Enterprise) returns HTTP <code>402</code>.</li>
        <li><strong>Advanced Monitor Types (402 Payment Required):</strong> Protocols like <code>tcp</code>, <code>dns</code>, and <code>ssl</code> are advanced features requiring Pro or higher.</li>
        <li><strong>Minimum Check Interval (400 Bad Request):</strong> The Free plan has a minimum check interval of <code>180s</code> (3 minutes). Pro and Business support down to <code>60s</code> (1 minute). Enterprise supports down to <code>30s</code>.</li>
      </ul>

      <h3>Heartbeat Rate Limits</h3>
      <p>
        Note that <strong>Heartbeat Monitors</strong> have a separate, concurrency-based rate limit to prevent accidental 
        infinite-loops from hitting the endpoint. The heartbeat endpoint (<code>/api/heartbeat/:secret</code>) guarantees a 
        minimum 1-second gap between pings. If a ping arrives sooner than 1 second after the last one, it is rejected with a <code>429</code>. 
        This prevents accidental DDoS of your own monitors.
      </p>

      <h2>Best Practices</h2>
      <p>To avoid hitting your API limits prematurely, consider the following:</p>
      <ul>
        <li>Cache responses on your end if you are frequently querying the <code>GET /api/v1/monitors</code> endpoint.</li>
        <li>Rely on <Link href="/docs/webhooks">Webhooks</Link> for state-change alerts rather than polling the API.</li>
        <li>Keep your Heartbeat intervals to reasonable durations (e.g. 1 minute or higher).</li>
      </ul>
    </>
  );
}
