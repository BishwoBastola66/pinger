import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/session';
import { getUserStatusPage } from '@/lib/status-pages/actions';
import { BrandingManager } from './BrandingManager';

export const metadata: Metadata = {
  title: 'Branding & Public Setup | Pingr Dashboard',
  description: 'Manage status page branding, custom domain, and visible monitor groups.',
};

export default async function BrandingPage() {
  await requireAuth();
  const statusPageData = await getUserStatusPage();

  return <BrandingManager initialData={statusPageData as any} />;
}
