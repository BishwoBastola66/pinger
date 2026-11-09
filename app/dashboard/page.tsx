import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { monitors, monitorStats, usage, subscriptions, plans } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { 
  BarChart2, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  PauseCircle,
  Zap, 
  Clock, 
  Globe, 
  Database, 
  Key,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Plus,
  Radio
} from 'lucide-react';
import Link from 'next/link';
import { getUserDashboardData, getMonitorStats } from '@/lib/data/dashboard';
import { ClientNetworkGlobe } from '@/components/dashboard/ClientNetworkGlobe';

export default async function DashboardOverview() {
  const user = await requireAuth();

  // Dynamic time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // 1. Fetch user monitors, usage, and subscription in parallel (Cached)
  const { userMonitors: rawMonitors, userUsage, sub } = await getUserDashboardData(user.id);
  const userMonitors = rawMonitors as any[];

  // 2. Fetch stats for user monitors (Cached)
  const monitorIds = userMonitors.map((m) => m.id);
  const statsList = await getMonitorStats(monitorIds);

  const statsMap = new Map(statsList.map((s) => [s.monitorId, s]));

  // 3. Compute monitor metrics
  const totalMonitors = userMonitors.length;
  const healthyCount = userMonitors.filter((m) => m.status === 'healthy').length;
  const degradedCount = userMonitors.filter((m) => m.status === 'degraded').length;
  const failingCount = userMonitors.filter((m) => m.status === 'failing').length;
  const pausedCount = userMonitors.filter((m) => m.status === 'paused' || m.status === 'disabled').length;

  const totalChecks = statsList.reduce((sum, s) => sum + Number(s.totalChecks || 0), 0);
  const successfulChecks = statsList.reduce((sum, s) => sum + Number(s.successfulChecks || 0), 0);
  const failedChecks = statsList.reduce((sum, s) => sum + Number(s.failedChecks || 0), 0);

  const overallUptime = totalChecks > 0 
    ? ((successfulChecks / totalChecks) * 100).toFixed(2) 
    : '100.00';

  const validFastest = statsList
    .map((s) => s.fastestResponse)
    .filter((r): r is number => r !== null && r !== undefined && r > 0);
  const fastestResponse = validFastest.length > 0 ? Math.min(...validFastest) : null;

  const validSlowest = statsList
    .map((s) => s.slowestResponse)
    .filter((r): r is number => r !== null && r !== undefined && r > 0);
  const slowestResponse = validSlowest.length > 0 ? Math.max(...validSlowest) : null;

  const validLatencies = userMonitors
    .map((m) => m.lastResponseTime)
    .filter((r): r is number => r !== null && r !== undefined && r > 0);
  const avgLatency = validLatencies.length > 0 
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) 
    : null;

  // 4. Compute usage and subscription metrics

  const planName = sub?.planName || 'Free';
  const apiLimit = planName === 'Business' ? 'Unlimited' : planName === 'Pro' ? 50000 : 500;
  const monthlyCalls = userUsage?.monthlyCalls || 0;
  const totalCalls = userUsage?.totalCalls || 0;
  const usagePercentage = typeof apiLimit === 'number' 
    ? Math.min(100, Math.round((monthlyCalls / apiLimit) * 100)) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header with Good Morning greeting and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {greeting}, {user.name.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1">
            Here is your live telemetry, uptime performance, and resource usage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/incidents"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Radio className="w-4 h-4 text-blue-600" />
            Incidents
          </Link>
          <Link
            href="/dashboard/monitors/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Monitor
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Uptime */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-500 truncate">System Uptime</p>
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                failingCount > 0 
                  ? 'bg-red-500/10 text-red-600 border-red-500/20'
                  : degradedCount > 0 
                  ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                  : 'bg-green-500/10 text-green-600 border-green-500/20'
              }`}>
                {failingCount > 0 ? 'Failing' : degradedCount > 0 ? 'Degraded' : 'Operational'}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{overallUptime}%</p>
              <span className="text-xs text-gray-500 whitespace-nowrap">last 24h</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="truncate">Across {totalMonitors} active target{totalMonitors === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Total Checks */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-500 truncate">Checks Performed</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{totalChecks.toLocaleString()}</p>
              <span className="text-xs text-gray-500 whitespace-nowrap">total pings</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <span className="text-green-600 font-medium whitespace-nowrap">{successfulChecks.toLocaleString()} ok</span>
            <span className="text-gray-500 hidden xl:inline">·</span>
            <span className="text-red-600 font-medium whitespace-nowrap">{failedChecks.toLocaleString()} fail</span>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-500 truncate">Average Latency</p>
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {avgLatency !== null ? `${avgLatency}ms` : '--'}
              </p>
              <span className="text-xs text-gray-500 whitespace-nowrap">response time</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
            <span className="whitespace-nowrap">Fastest: {fastestResponse ? `${fastestResponse}ms` : '--'}</span>
            <span className="hidden xl:inline">·</span>
            <span className="whitespace-nowrap">Slowest: {slowestResponse ? `${slowestResponse}ms` : '--'}</span>
          </div>
        </div>

        {/* Monthly API Calls */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-500 truncate">Monthly API Usage</p>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{monthlyCalls.toLocaleString()}</p>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                / {typeof apiLimit === 'number' ? apiLimit.toLocaleString() : apiLimit}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 70 ? 'bg-yellow-500' : 'bg-blue-600'
                }`}
                style={{ width: `${typeof apiLimit === 'number' ? usagePercentage : 5}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between items-center text-[10px] text-gray-500 mt-1.5 gap-1">
              <span className="truncate max-w-[60%]">{planName} Tier</span>
              <span className="whitespace-nowrap">{typeof apiLimit === 'number' ? `${usagePercentage}% used` : 'Unmetered'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Health Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fleet Health Breakdown</h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time distribution of monitored service states</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/monitors"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View detailed monitors <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Visual proportional bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex mb-6">
          {totalMonitors === 0 ? (
            <div className="w-full h-full bg-gray-700" />
          ) : (
            <>
              {healthyCount > 0 && (
                <div 
                  className="h-full bg-green-500 transition-all" 
                  style={{ width: `${(healthyCount / totalMonitors) * 100}%` }}
                  title={`Healthy: ${healthyCount}`}
                />
              )}
              {degradedCount > 0 && (
                <div 
                  className="h-full bg-yellow-500 transition-all" 
                  style={{ width: `${(degradedCount / totalMonitors) * 100}%` }}
                  title={`Degraded: ${degradedCount}`}
                />
              )}
              {failingCount > 0 && (
                <div 
                  className="h-full bg-red-500 transition-all" 
                  style={{ width: `${(failingCount / totalMonitors) * 100}%` }}
                  title={`Failing: ${failingCount}`}
                />
              )}
              {pausedCount > 0 && (
                <div 
                  className="h-full bg-gray-600 transition-all" 
                  style={{ width: `${(pausedCount / totalMonitors) * 100}%` }}
                  title={`Paused: ${pausedCount}`}
                />
              )}
            </>
          )}
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Healthy</p>
              <p className="text-lg font-bold text-gray-900">{healthyCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-md bg-yellow-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Degraded</p>
              <p className="text-lg font-bold text-gray-900">{degradedCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Failing</p>
              <p className="text-lg font-bold text-gray-900">{failingCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-md bg-gray-500/10 flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Paused</p>
              <p className="text-lg font-bold text-gray-900">{pausedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Plan & Quota + Global Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription & API Quota */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Subscription & API Quota</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                {planName} Plan
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Your tier monitors up to {sub?.maxMonitors || 5} endpoints with interval limits and API request pools.
            </p>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-gray-200 text-sm">
                <span className="text-gray-500">Active Monitors</span>
                <span className="font-semibold text-gray-900">{totalMonitors} / {sub?.maxMonitors || 5}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-gray-200 text-sm">
                <span className="text-gray-500">Monthly API Calls</span>
                <span className="font-semibold text-gray-900">
                  {monthlyCalls.toLocaleString()} / {typeof apiLimit === 'number' ? apiLimit.toLocaleString() : apiLimit}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-gray-200 text-sm">
                <span className="text-gray-500">Total Lifetime API Calls</span>
                <span className="font-semibold text-gray-900">{totalCalls.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 text-sm">
                <span className="text-gray-500">Direct WhatsApp Billing</span>
                <span className="font-semibold text-green-600">Active & Negotiable</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">Need more capacity or faster pings?</span>
            <Link 
              href="/dashboard/billing" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage / Upgrade Plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Latency Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Globe className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Global Latency Overview</h3>
                <p className="text-xs text-gray-500">Response time analytics across active endpoints</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Fastest</p>
                <p className="text-xl font-bold text-green-600">
                  {fastestResponse ? `${fastestResponse}ms` : '--'}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Average</p>
                <p className="text-xl font-bold text-blue-600">
                  {avgLatency ? `${avgLatency}ms` : '--'}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Slowest</p>
                <p className="text-xl font-bold text-yellow-600">
                  {slowestResponse ? `${slowestResponse}ms` : '--'}
                </p>
              </div>
            </div>

            <div className="mt-2 w-full relative">
              <ClientNetworkGlobe />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">Looking for raw logs & history?</span>
            <Link 
              href="/dashboard/monitors" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Endpoints <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Monitored Endpoints Performance Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monitored Endpoints Performance</h2>
            <p className="text-xs text-gray-500 mt-0.5">Individual uptime, response speeds, and 24h ping reliability</p>
          </div>
          <Link
            href="/dashboard/monitors"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            All Monitors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {userMonitors.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No monitors configured</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
              Add your first HTTP/HTTPS or Supabase service to start aggregating telemetry.
            </p>
            <Link
              href="/dashboard/monitors/new"
              className="inline-flex items-center justify-center h-10 px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              Create Monitor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Monitor Name</th>
                  <th className="py-3 px-4">Interval</th>
                  <th className="py-3 px-4">Last Latency</th>
                  <th className="py-3 px-4">24h Checks</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {userMonitors.map((m) => {
                  const stat = statsMap.get(m.id);
                  const mChecks = Number(stat?.totalChecks || 0);
                  const mSuccess = Number(stat?.successfulChecks || 0);
                  const mRate = mChecks > 0 ? ((mSuccess / mChecks) * 100).toFixed(1) : '100.0';

                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          m.status === 'healthy' ? 'bg-green-50 text-green-700 border border-green-200' :
                          m.status === 'failing' ? 'bg-red-50 text-red-700 border border-red-200' :
                          m.status === 'degraded' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                          'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            m.status === 'healthy' ? 'bg-green-500' :
                            m.status === 'failing' ? 'bg-red-500' :
                            m.status === 'degraded' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`} />
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500 font-mono truncate max-w-xs">{m.target}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-700">
                        {m.intervalSeconds}s
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-900">
                        {m.lastResponseTime ? `${m.lastResponseTime}ms` : '--'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-700">
                        {mChecks.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            Number(mRate) >= 99 ? 'text-green-600' : Number(mRate) >= 95 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {mRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <Link
                          href={`/dashboard/monitors/${m.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
