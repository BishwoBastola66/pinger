import { getUserSubscriptions, getAllPlans } from '@/lib/admin/actions';
import { AdminSubscriptionRow } from './AdminSubscriptionRow';

export default async function AdminSubscriptionsPage() {
  const [results, plans] = await Promise.all([
    getUserSubscriptions(),
    getAllPlans()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Subscriptions</h1>
        <p className="text-gray-500 mt-1">Manage user plans and expiration dates manually.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3 min-w-[180px]">Active Plan</th>
              <th className="px-4 py-3 min-w-[150px]">Start Date</th>
              <th className="px-4 py-3 min-w-[150px]">End Date (Expires)</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <AdminSubscriptionRow key={result.user.id} result={result} plans={plans} />
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
