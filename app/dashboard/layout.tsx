import { ReactNode } from 'react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { Activity, LogOut } from 'lucide-react';
import { SidebarNav } from '@/components/dashboard/SidebarNav';
import { DashboardBreadcrumb } from '@/components/dashboard/Breadcrumb';
import { MobileSidebar } from '@/components/dashboard/MobileSidebar';
import { NotificationDropdown } from '@/components/dashboard/NotificationDropdown';
import { db } from '@/lib/db';
import { monitors, subscriptions, plans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserDashboardData } from '@/lib/data/dashboard';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();

  const { userMonitors, sub } = await getUserDashboardData(user.id);

  const totalMonitors = userMonitors.length;
  const operationalCount = userMonitors.filter((m) => m.status === 'healthy').length;
  const issuesCount = userMonitors.filter((m) => m.status === 'failing' || m.status === 'degraded').length;
  const planName = sub?.planName || 'Free';

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Pingr</span>
          </div>
        </div>

        <SidebarNav isAdmin={user.role === 'admin'} />

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-200/80">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight" title={user.name}>{user.name}</p>
                <p className="text-[11px] text-gray-500 truncate mt-0.5" title={user.email}>{user.email}</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST" className="shrink-0">
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-gray-200 bg-white/80 backdrop-blur-md gap-4">
          <div className="flex items-center md:hidden">
            <MobileSidebar user={user} />
          </div>
          
          <div className="flex-1 flex justify-center lg:justify-start">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search monitors..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 lg:gap-6">
            <NotificationDropdown />
            <span className="hidden sm:inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 whitespace-nowrap">Plan: {planName}</span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Secondary Sub-header Bar */}
            <div className="h-12 border-b border-gray-200 bg-white/50 flex items-center px-4 lg:px-8">
              <DashboardBreadcrumb email={user.email} />
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8">
              <div className="w-full">
                {children}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="w-80 flex-shrink-0 bg-white border-l border-gray-200 hidden lg:flex flex-col overflow-y-auto py-6 px-4 space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Stats</span>
                <span className={`w-2 h-2 rounded-full ${issuesCount > 0 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Monitors</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{totalMonitors}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Healthy</p>
                  <p className="text-xl font-bold text-green-600 mt-0.5">{operationalCount}</p>
                </div>
              </div>

              {issuesCount > 0 && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600 font-medium">
                  ⚠ {issuesCount} monitor{issuesCount > 1 ? 's' : ''} reporting issues
                </div>
              )}

              <Link 
                href="/dashboard/statistics" 
                className="flex items-center justify-between text-xs text-blue-600 hover:text-blue-700 font-medium pt-1 group"
              >
                <span>Full Telemetry & Analytics</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Quick Actions</span>
              <div className="pt-2 space-y-1.5">
                <Link
                  href="/dashboard/monitors/new"
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors shadow-sm"
                >
                  <span>Add New Monitor</span>
                  <span className="text-gray-400">+</span>
                </Link>
                <Link
                  href="/dashboard/api-keys"
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors shadow-sm"
                >
                  <span>Manage API Keys</span>
                  <span className="text-gray-400">→</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
