import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/session';
import { getUserDomains } from '@/lib/status-pages/actions';
import { DomainManager } from './DomainManager';

export const metadata: Metadata = {
  title: 'Domains & DNS | Pingr Dashboard',
  description: 'Manage custom domains, DNS verification records, and SSL routing for your services.',
};

export default async function DomainsPage() {
  await requireAuth();
  const data = await getUserDomains();

  return (
    <DomainManager
      initialDomains={data.domains as any[]}
      allMonitors={data.allMonitors as any[]}
    />
  );
}

