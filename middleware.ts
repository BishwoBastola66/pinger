import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get('host')?.toLowerCase() || '';
  const hostname = rawHost.split(':')[0].trim();

  // 1. Skip Next.js internals, static files, and explicit root paths
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/verify-otp') ||
    url.pathname.startsWith('/status') ||
    url.pathname.startsWith('/docs') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Exempt local development, apex application domains, and Vercel preview URLs
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || 'pingr.site').toLowerCase();
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost');

  const isMainApp =
    hostname === appDomain ||
    hostname === `www.${appDomain}` ||
    hostname.endsWith('.vercel.app');

  // 3. Strict RFC 1123 hostname check for custom domain status pages
  const isValidCustomHostname =
    hostname.length >= 3 &&
    hostname.length <= 253 &&
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(hostname);

  // 4. Transparently rewrite custom domain requests to public custom domain handler
  if (!isLocal && !isMainApp && isValidCustomHostname) {
    url.pathname = `/status/domain/${hostname}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
