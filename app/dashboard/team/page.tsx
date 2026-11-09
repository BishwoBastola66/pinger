import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth/session';
import { getTeamData } from '@/lib/team/actions';
import { TeamManager } from '@/components/dashboard/TeamManager';

export const metadata: Metadata = {
  title: 'Team & Collaboration | Pinger Dashboard',
  description: 'Manage team members and shared access to your workspace monitors and alerts.',
};

export default async function TeamPage() {
  await requireAuth();
  const teamData = await getTeamData();

  return (
    <TeamManager
      owner={teamData.owner}
      members={teamData.members}
      currentUser={teamData.currentUser}
      isOwner={teamData.isOwner}
      planName={teamData.planName}
      seatLimit={teamData.seatLimit}
      totalSeatsUsed={teamData.totalSeatsUsed}
      canInvite={teamData.canInvite}
    />
  );
}
