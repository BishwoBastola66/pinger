import { getAdminOverview } from '@/lib/admin/actions';
import { Users, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  const stats = await getAdminOverview();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-500">Active Subscriptions</h3>
            <CreditCard className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <Link href="/dashboard/admin/users" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
          Manage Users
        </Link>
        <Link href="/dashboard/admin/subscriptions" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm">
          Manage Subscriptions
        </Link>
      </div>
    </div>
  );
}
