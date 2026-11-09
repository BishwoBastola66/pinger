/**
 * Vercel Domain Management Integration
 * Server-side only client to programmatically add, verify, and delete custom domains on Vercel.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/domains/vercel.ts is a server-only module and cannot be executed on the client.');
}

const VERCEL_API_URL = 'https://api.vercel.com';

function getVercelConfig() {
  const token = process.env.VERCEL_AUTH_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID || 'prj_qdPVDzoWFAAlM88hPWvCDkID4Gqe';
  const teamId = process.env.VERCEL_TEAM_ID || 'team_NLH9MDjW9dTDGEAi7ydu2OBI';

  return { token, projectId, teamId };
}

export interface VercelDomainResult {
  success: boolean;
  configured?: boolean;
  verified?: boolean;
  error?: string;
  data?: any;
}

/**
 * Attaches a custom domain to the Vercel project to provision SSL and edge routing.
 */
export async function addDomainToVercel(domain: string): Promise<VercelDomainResult> {
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return {
      success: true,
      configured: false,
      error: 'VERCEL_AUTH_TOKEN not configured on server. Domain routed via DNS.',
    };
  }

  try {
    const url = new URL(`${VERCEL_API_URL}/v9/projects/${projectId}/domains`);
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });

    const data = await res.json();

    if (!res.ok) {
      // If domain already exists on this project, that is fine
      if (data.error?.code === 'domain_already_in_use' || data.error?.message?.includes('already')) {
        return { success: true, verified: true, data };
      }
      return {
        success: false,
        error: data.error?.message || 'Failed to attach domain to Vercel deployment',
        data,
      };
    }

    return {
      success: true,
      verified: data.verified,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while connecting to Vercel API',
    };
  }
}

/**
 * Checks the domain configuration and SSL verification status on Vercel.
 */
export async function getDomainFromVercel(domain: string): Promise<VercelDomainResult> {
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return {
      success: true,
      configured: true,
    };
  }

  try {
    const url = new URL(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`);
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || 'Domain not found on Vercel project',
      };
    }

    return {
      success: true,
      verified: data.verified,
      configured: !data.verification?.length,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error checking domain status on Vercel',
    };
  }
}

/**
 * Removes the custom domain from the Vercel project when removed from a status page.
 */
export async function removeDomainFromVercel(domain: string): Promise<VercelDomainResult> {
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return { success: true };
  }

  try {
    const url = new URL(`${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`);
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error removing domain from Vercel',
    };
  }
}
