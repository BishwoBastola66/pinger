import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getUserDashboardData } from '@/lib/data/dashboard';
import { MonitorsManager } from '@/components/dashboard/MonitorsManager';

export default async function MonitorsPage() {
  const user = await requireAuth();
  
  const { userMonitors: rawMonitors, sub } = await getUserDashboardData(user.id);
  const userMonitors = rawMonitors as any[];
  const planName = sub?.planName || 'Free';

  return (
    <Suspense fallback={null}>
      <MonitorsManager initialMonitors={userMonitors} currentPlan={planName} />
    </Suspense>
  );
}
