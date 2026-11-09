'use client';

import { usePathname } from 'next/navigation';

export function DashboardBreadcrumb({ email }: { email: string }) {
  const pathname = usePathname();
  let pageName = 'Overview';
  if (pathname.includes('/monitors')) pageName = 'Monitors';
  else if (pathname.includes('/incidents')) pageName = 'Incidents';
  else if (pathname.includes('/domains')) pageName = 'Domains';
  else if (pathname.includes('/branding')) pageName = 'Branding';
  else if (pathname.includes('/statistics')) pageName = 'Statistics';
  else if (pathname.includes('/notifications')) pageName = 'Notifications';
  else if (pathname.includes('/api-keys')) pageName = 'API Keys';
  else if (pathname.includes('/billing')) pageName = 'Billing';
  else if (pathname.includes('/settings')) pageName = 'Settings';
  else if (pathname.includes('/admin')) pageName = 'Admin';

  return (
    <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
      <span className="text-gray-500">{email}</span>
      <span className="text-gray-400">/</span>
      <span className="text-gray-900 font-semibold">{pageName}</span>
    </div>
  );
}
