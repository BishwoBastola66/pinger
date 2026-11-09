# Pingr Custom Domain Status Pages Guide

## Architecture Overview (Vercel + Supabase Only)

Pingr's custom-domain status pages run exclusively on:
1. **Vercel**: Edge routing, Next.js serverless rendering, HTTPS certificate provisioning, and public status page delivery.
2. **Supabase / PostgreSQL**: Persistent storage for workspace status pages, monitor health, and incident logs.

> [!IMPORTANT]
> **Availability Realities During Platform Outages**:
> Because both the Pingr dashboard (control plane) and customer status pages (public status plane) are deployed to the same Vercel project, **a complete Vercel platform outage will impact both systems**. Pingr does not employ a secondary cloud host or VPS.
> 
> However, the public status plane is strictly decoupled from the control plane:
> - Public status requests do not require authentication sessions or cookies.
> - Public status requests do not call dashboard server actions.
> - Public status requests do not invoke the Vercel management API.
> - Public queries run lightweight, sanitized read projections directly against Supabase.
> - Responses are cached per normalized hostname to protect database throughput.

---

## 1. Adding a Custom Domain

1. In the Pingr Dashboard, navigate to **Status Pages** -> **Custom Domain & DNS**.
2. Enter your desired fully qualified domain name (FQDN), such as `status.example.com`.
3. Click **Connect Domain**.
4. Pingr validates and normalizes the hostname, records a unique cryptographic token (`pingr_verify_<hex>`), and places the domain in `pending` status.

---

## 2. DNS Ownership Verification (TXT Record)

To verify that you own and control the domain, add a `TXT` record at your DNS provider:

| Field | Value |
|---|---|
| **Record Type** | `TXT` |
| **Host / Name** | `_pingr-verification.<your-subdomain>` (e.g. `_pingr-verification.status`) |
| **Record Value** | `pingr_verify_<your-unique-token>` |
| **TTL** | `Auto` or `300` seconds |

Pingr verifies this token server-side via direct DNS TXT query.

---

## 3. DNS Traffic Routing (CNAME Record)

To route visitor web traffic to Pingr's edge deployment, add a `CNAME` record:

| Field | Value |
|---|---|
| **Record Type** | `CNAME` |
| **Host / Name** | `<subdomain>` (e.g. `status` or `@` for apex) |
| **Points To** | `cname.pingr.site` (or `cname.vercel-dns.com`) |
| **TTL** | `Auto` or `3600` seconds |

---

## 4. The Verification Process

When you click **Verify DNS Records Now**:
1. Pingr authenticates your workspace session and verifies that you own the status page.
2. The server queries authoritative DNS for `_pingr-verification.<domain>`.
3. If the TXT record matches the cryptographic token, ownership is established.
4. The server queries DNS for the `CNAME` pointing to `cname.pingr.site` or `cname.vercel-dns.com`.
5. The domain is registered with Vercel's project domain system to initiate automatic SSL certificate generation.
6. The database state updates:
   - If both TXT and CNAME are confirmed and IP resolves: `active`.
   - If TXT is confirmed but CNAME is still propagating: `verified`.
   - If TXT fails or is missing: `failed` (with detailed diagnostic message).

---

## 5. Domain Lifecycle States

- **`none`**: No custom domain has been configured.
- **`pending`**: Custom domain has been registered in Pingr; awaiting DNS record creation by the user.
- **`verifying`**: Verification check is actively in progress.
- **`verified`**: Ownership has been confirmed via TXT, but CNAME routing or SSL issuance is still propagating.
- **`active`**: Domain ownership is verified, traffic routing is confirmed, SSL is active, and the status page is live.
- **`failed`**: The most recent verification check encountered an error (e.g., NXDOMAIN, record mismatch).

---

## 6. HTTPS and SSL Behavior

- SSL certificates are automatically issued and renewed by Vercel Let's Encrypt / DigiCert integration once DNS records resolve.
- HTTPS is enforced for all custom status pages.
- Visitors connecting via `http://status.example.com` are automatically upgraded to `https://status.example.com`.

---

## 7. Removing or Replacing a Custom Domain

- **Removing a Domain**: Click **Remove Domain** in the dashboard. The domain is detached from Vercel, all verification tokens are purged, and the status resets to `none`. The status page itself, along with its monitors and history, remains intact.
- **Replacing a Domain**: When replacing `status.old.com` with `status.new.com`, the previous domain is completely unlinked and will no longer serve pages. The new domain receives a new cryptographic token and must undergo ownership verification. Verification is never inherited across domains.

---

## 8. DNS Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `No TXT record found` | DNS propagation delay or incorrect record name | Verify the record name is `_pingr-verification.<domain>`. DNS updates may take 1–15 minutes depending on provider TTL. |
| `Verification token mismatch` | Old token or copy-paste whitespace | Copy the exact token from the Pingr dashboard without extra spaces. |
| `CNAME not pointing to target` | Proxying enabled (e.g. Cloudflare orange cloud) | In Cloudflare, set the CNAME record to **DNS Only** (grey cloud) during initial SSL issuance. |
| `404 Not Found on Custom Domain` | Domain status is not `active` | In the dashboard, click **Verify DNS Records Now** to complete the verification workflow. |

---

## 9. Security & Data Isolation

- **Tenant Isolation**: A database `UNIQUE` constraint ensures a custom domain can belong to only one status page globally.
- **Host Header Protection**: The incoming `Host` header is treated purely as an unauthenticated lookup key. The public page is only served if the database confirms a matching status page with an `active` or `verified` custom domain.
- **Zero Secret Exposure**: The public status query layer (`lib/status-pages/public-data.ts`) strictly filters out internal monitor targets, private request headers, bodies, heartbeat secrets, API keys, and user details.
- **Rate Limiting**: Custom domain configuration, verification, and removal are rate-limited to prevent DNS query spam and denial-of-service attempts.
