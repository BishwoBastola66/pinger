'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Mail, 
  Check, 
  X, 
  Trash2, 
  ArrowUpRight, 
  Sparkles, 
  AlertCircle, 
  Lock, 
  Eye, 
  Sliders, 
  CheckCircle2, 
  Clock,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteTeamMemberAction, removeTeamMemberAction, updateMemberRoleAction } from '@/lib/team/actions';

interface TeamMember {
  id: string;
  workspaceId: string;
  userId: string | null;
  email: string;
  role: string;
  status: string;
  invitedAt: Date;
  acceptedAt: Date | null;
}

interface TeamManagerProps {
  owner: {
    id: string;
    name: string;
    email: string;
    role?: string;
    createdAt?: Date;
  };
  members: TeamMember[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  isOwner: boolean;
  planName: string;
  seatLimit: number;
  totalSeatsUsed: number;
  canInvite: boolean;
}

export function TeamManager({
  owner,
  members,
  currentUser,
  isOwner,
  planName,
  seatLimit,
  totalSeatsUsed,
  canInvite,
}: TeamManagerProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isFreePlan = planName === 'Free';
  const seatsDisplay = seatLimit === Infinity ? 'Unlimited' : `${totalSeatsUsed} / ${seatLimit}`;
  const percentUsed = seatLimit === Infinity ? Math.min(100, (totalSeatsUsed / 10) * 100) : Math.min(100, (totalSeatsUsed / seatLimit) * 100);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append('email', inviteEmail);
    formData.append('role', inviteRole);

    try {
      const res = await inviteTeamMemberAction(null, formData);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message || 'Invitation sent successfully.' });
        setInviteEmail('');
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to send invite.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member? They will lose access to your monitors.')) return;
    setRemovingId(memberId);
    setStatusMessage(null);
    try {
      const res = await removeTeamMemberAction(memberId);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to remove member.' });
      } else {
        setStatusMessage({ type: 'success', text: 'Team member removed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error removing member.' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const res = await updateMemberRoleAction(memberId, newRole);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message || 'Role updated.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update role.' });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            Team &amp; Workspace Members
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Invite teammates so they can inspect the same monitors, investigate outages, and receive instant alert notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/billing">
            <Button variant="outline" className="text-xs h-9 border-gray-300 hover:bg-gray-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Manage Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{statusMessage.type === 'success' ? 'Success' : 'Notice'}</p>
            <p className="mt-0.5 text-xs opacity-90">{statusMessage.text}</p>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plan Seats Meter Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Plan Tier</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {planName} Plan
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Team Member Seats: <span className="text-blue-600">{seatsDisplay}</span>
            </h3>
            <p className="text-xs text-gray-500">
              {isFreePlan
                ? 'The Free tier is limited to 1 solo seat (Owner). Upgrade to Pro (5 seats) or Business (25 seats) to invite your team.'
                : `Your ${planName} subscription includes up to ${seatLimit === Infinity ? 'unlimited' : seatLimit} collaborative team seats.`}
            </p>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Seat Utilization</span>
              <span className="font-semibold text-gray-700">{totalSeatsUsed} of {seatLimit === Infinity ? '∞' : seatLimit}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  percentUsed >= 100 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* Free Plan Upgrade Banner */}
        {isFreePlan && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Unlock Shared Team Monitors on Pro</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Let your team members inspect uptime, check ping logs, and get paged together when servers go down.
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing" className="shrink-0">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 flex items-center gap-1.5 shadow-xs">
                Upgrade to Pro (5 Seats)
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Invite Member Section (Pro+) */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Invite a Team Member</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Teammates will receive access to this workspace and can immediately view, check, and monitor your services.
          </p>

          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6 space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs font-semibold text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!canInvite || isSubmitting}
                  className="pl-9 h-10 text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="invite-role" className="text-xs font-semibold text-gray-700">
                Workspace Role
              </Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                disabled={!canInvite || isSubmitting}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Member (Manage Monitors)</option>
                <option value="admin">Admin (Full Control)</option>
                <option value="viewer">Viewer (Read-Only)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              {canInvite ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  {isSubmitting ? 'Inviting...' : 'Send Invite'}
                </Button>
              ) : (
                <Link href="/dashboard/billing">
                  <Button
                    type="button"
                    className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Upgrade to Invite
                  </Button>
                </Link>
              )}
            </div>
          </form>

          {/* Role Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Admin
              </span>
              <p className="text-[11px] text-gray-500 mt-1">Can configure monitors, invite team members, and manage alerts.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Member
              </span>
              <p className="text-[11px] text-gray-500 mt-1">Can create and edit monitors, pause checks, and post incident notes.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-purple-600" /> Viewer
              </span>
              <p className="text-[11px] text-gray-500 mt-1">Read-only access to inspect live monitors, metrics, and incident reports.</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Members Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Current Members ({totalSeatsUsed})</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            People who currently have access to this workspace&apos;s monitors and telemetry.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Workspace Owner */}
          <div className="p-4 sm:px-6 flex items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-xs">
                {owner.name?.charAt(0).toUpperCase() || 'O'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{owner.name}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Crown className="w-3 h-3 text-amber-500" /> Owner
                  </span>
                  {currentUser.id === owner.id && (
                    <span className="text-[10px] text-gray-400 font-medium">(You)</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{owner.email}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Check className="w-3.5 h-3.5" /> Full Access
              </span>
            </div>
          </div>

          {/* Invited / Active Members */}
          {members.map((member) => (
            <div key={member.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center shrink-0 text-sm">
                  {member.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{member.email}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        member.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : member.role === 'viewer'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        member.status === 'accepted'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-amber-700 bg-amber-50'
                      }`}
                    >
                      {member.status === 'accepted' ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5" /> Pending Invite
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Invited {new Date(member.invitedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isOwner && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                      className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                      className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                      title="Remove team member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No additional team members yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                {isFreePlan
                  ? 'Upgrade to a Pro or Business plan to invite teammates and share monitor management.'
                  : 'Invite engineers, on-call responders, and viewers using the form above.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How It Works Explainer Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          How Team Collaboration Works in Pinger
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 mt-4">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="font-semibold text-gray-900 block mb-1">1. Unified Monitors &amp; Metrics</span>
            All team members share access to the same live monitors, SSL tracking, latency graphs, and ping history without duplicate accounts.
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="font-semibold text-gray-900 block mb-1">2. Multi-Channel Incident Response</span>
            When an outage strikes, all active team members receive alert notifications via Slack, Discord, Email, or Webhooks.
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
            <span className="font-semibold text-gray-900 block mb-1">3. Role-Based Permissions</span>
            Protect production monitoring configs by assigning Viewers for management, Members for engineers, and Admins for team leads.
          </div>
        </div>
      </div>
    </div>
  );
}
