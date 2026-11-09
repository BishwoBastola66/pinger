'use client';

import { useState, useTransition } from 'react';
import { updateUserAccount, addRestrictionAction, liftUserRestrictionsAction } from '@/lib/admin/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, CheckCircle2, Ban, Calendar, X } from 'lucide-react';

interface Restriction {
  id: string;
  reason: string;
  isPermanent: boolean;
  startDate: Date | string;
  endDate: Date | string | null;
  createdAt: Date | string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  createdAt: Date | string;
  activeRestriction: Restriction | null;
  restrictions?: Restriction[];
}

export function AdminUserRow({ user }: { user: UserData }) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  
  // Default dates for temporary restriction
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);

  const handleRoleChange = (role: 'user' | 'admin') => {
    startTransition(async () => {
      try {
        const res = await updateUserAccount(user.id, { role });
        if (res.success) toast.success(`Role updated to ${role}`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update role');
      }
    });
  };

  const handleApplyRestriction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the restriction');
      return;
    }
    if (!isPermanent && (!startDate || !endDate)) {
      toast.error('Please specify start and end dates');
      return;
    }
    if (!isPermanent && new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    startTransition(async () => {
      try {
        await addRestrictionAction(user.id, {
          reason: reason.trim(),
          isPermanent,
          startDate,
          endDate: isPermanent ? null : endDate,
        });
        toast.success(`Restriction applied to ${user.email}`);
        setShowModal(false);
        setReason('');
      } catch (err: any) {
        toast.error(err.message || 'Failed to apply restriction');
      }
    });
  };

  const handleLiftRestriction = () => {
    if (!confirm(`Are you sure you want to lift restrictions for ${user.email}?`)) return;

    startTransition(async () => {
      try {
        await liftUserRestrictionsAction(user.id);
        toast.success(`Restrictions lifted for ${user.email}`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to lift restrictions');
      }
    });
  };

  const active = user.activeRestriction;

  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{user.email}</td>
        <td className="px-4 py-3 text-sm text-gray-700">{user.name}</td>
        <td className="px-4 py-3">
          <select 
            className="bg-white border border-gray-200 text-sm text-gray-900 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value as any)}
            disabled={isPending}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </td>
        <td className="px-4 py-3">
          {active ? (
            <div className="flex flex-col gap-1 max-w-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 w-fit">
                <Ban className="w-3 h-3 text-red-600" />
                {active.isPermanent ? 'Permanent Restriction' : 'Temporary Restriction'}
              </span>
              <p className="text-xs text-gray-700 font-medium truncate" title={active.reason}>
                Reason: {active.reason}
              </p>
              {!active.isPermanent && active.endDate && (
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(active.startDate).toLocaleDateString()} &rarr; {new Date(active.endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {new Date(user.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-right">
          {active ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLiftRestriction}
              disabled={isPending}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Lift Restriction
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(true)}
              disabled={isPending}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Restrict
            </Button>
          )}
        </td>
      </tr>

      {/* Restrict Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-semibold text-gray-900">Restrict Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-md p-1 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Restricting <span className="font-semibold text-gray-700">{user.email}</span> will immediately revoke active sessions and block them from logging in during the restriction period.
            </p>

            <form onSubmit={handleApplyRestriction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-semibold text-gray-700">Reason for restriction *</Label>
                <Input
                  id="reason"
                  placeholder="e.g. Terms violation, automated abuse, billing issue"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">Duration Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPermanent(true)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      isPermanent
                        ? 'border-red-600 bg-red-50 text-red-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Permanent
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPermanent(false)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                      !isPermanent
                        ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Temporary Range
                  </button>
                </div>
              </div>

              {!isPermanent && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="startDate" className="text-[11px] font-semibold text-gray-700">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate" className="text-[11px] font-semibold text-gray-700">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    The user will automatically regain access once the end date passes.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isPending ? 'Applying...' : 'Apply Restriction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
