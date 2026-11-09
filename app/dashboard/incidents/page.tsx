import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/session';
import { getUserStatusPage } from '@/lib/status-pages/actions';
import { IncidentsManager } from './IncidentsManager';

export const metadata: Metadata = {
  title: 'Incidents & Notices | Pingr Dashboard',
  description: 'Post and manage real-time incident updates and maintenance announcements.',
};

export default async function IncidentsPage() {
  await requireAuth();
  const statusPageData = await getUserStatusPage();

  return (
    <IncidentsManager
      initialStatusPage={statusPageData.statusPage as any}
      initialUpdates={statusPageData.updates as any}
      monitors={statusPageData.allMonitors as any[]}
      components={statusPageData.components as any[]}
    />
  );
}
