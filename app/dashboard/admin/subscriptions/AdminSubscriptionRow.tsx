'use client';

import { updateUserSubscription } from '@/lib/admin/actions';
import { toast } from 'sonner';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminSubscriptionRow({ result, plans }: { result: any, plans: any[] }) {
  const { user, subscription, plan } = result;
  const [isPending, startTransition] = useTransition();
  
  const [selectedPlanId, setSelectedPlanId] = useState(subscription?.planId || '');
  
  const defaultStartDate = subscription?.startDate 
    ? new Date(subscription.startDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const defaultEndDate = subscription?.endDate
    ? new Date(subscription.endDate).toISOString().split('T')[0]
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [expirationDate, setExpirationDate] = useState(defaultEndDate);

  const handleUpdate = () => {
    startTransition(async () => {
      const startVal = selectedPlanId ? new Date(startDate) : null;
      const endVal = selectedPlanId ? new Date(expirationDate) : null;
      const res = await updateUserSubscription(user.id, selectedPlanId || null, startVal, endVal);
      if (res.success) toast.success('Subscription updated');
    });
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
        <div>{user.email}</div>
        <div className="text-xs text-gray-500">{user.name}</div>
      </td>
      <td className="px-4 py-3">
        <select 
          className="bg-white border border-gray-200 text-sm text-gray-900 rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          disabled={isPending}
        >
          <option value="">Free (No Subscription)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        {selectedPlanId ? (
          <Input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPending}
            className="h-8 bg-white border-gray-200 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm text-gray-500">N/A</span>
        )}
      </td>
      <td className="px-4 py-3">
        {selectedPlanId ? (
          <Input 
            type="date" 
            value={expirationDate} 
            onChange={(e) => setExpirationDate(e.target.value)}
            disabled={isPending}
            className="h-8 bg-white border-gray-200 text-sm text-gray-900"
          />
        ) : (
          <span className="text-sm text-gray-500">N/A</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button 
          size="sm" 
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          onClick={handleUpdate}
          disabled={isPending || (selectedPlanId === (subscription?.planId || '') && startDate === defaultStartDate && expirationDate === defaultEndDate)}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </td>
    </tr>
  );
}
