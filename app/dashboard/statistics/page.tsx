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
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default async function StatisticsPage() {
  const user = await requireAuth();

  // 1. Fetch user monitors
  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.workspaceId, user.id));

  // 2. Fetch stats for user monitors
  const monitorIds = userMonitors.map((m) => m.id);
  const statsList = monitorIds.length > 0
    ? await db.select().from(monitorStats).where(inArray(monitorStats.monitorId, monitorIds))
    : [];

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

  const validLatencies = [] as number[];
  const avgLatency = validLatencies.length > 0 
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) 
    : null;

  // 4. Fetch usage and subscription plan
  const workspaceId = user.id;

  const [userUsage] = await db
    .select()
    .from(usage)
    .where(eq(usage.workspaceId, workspaceId))
    .limit(1);

  const [sub] = await db
    .select({
      planName: plans.name,
      maxMonitors: plans.maxMonitors,
      apiAccess: plans.apiAccess,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const planName = sub?.planName || 'Free';
  const apiLimit = planName === 'Business' ? 'Unlimited' : planName === 'Pro' ? 50000 : 500;
  const monthlyCalls = userUsage?.monthlyCalls || 0;
  const totalCalls = userUsage?.totalCalls || 0;
  const usagePercentage = typeof apiLimit === 'number' 
    ? Math.min(100, Math.round((monthlyCalls / apiLimit) * 100)) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <BarChart2 className="w-7 h-7 text-blue-600" />
            Statistics & Performance
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time telemetry, global uptime, and API consumption across all your endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">System Uptime</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
              failingCount > 0 
                ? 'bg-red-500/10 text-red-600 border-red-500/20'
                : degradedCount > 0 
                ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                : 'bg-green-500/10 text-green-600 border-green-500/20'
            }`}>
              {failingCount > 0 ? 'Failing' : degradedCount > 0 ? 'Degraded' : 'Operational'}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{overallUptime}%</p>
            <span className="text-xs text-gray-500">all checks</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {successfulChecks.toLocaleString()} of {totalChecks.toLocaleString()} pings succeeded
          </p>
        </div>

        {/* Total Checks */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Health Checks</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{totalChecks.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
            <span className="text-green-600 font-semibold">✓ {successfulChecks.toLocaleString()} ok</span>
            <span className="text-red-600 font-semibold">✕ {failedChecks.toLocaleString()} failed</span>
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Average Latency</p>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {avgLatency !== null ? `${avgLatency}ms` : '--'}
            </p>
            <span className="text-xs text-gray-500">current avg</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Min: {fastestResponse !== null ? `${fastestResponse}ms` : '--'} • Max: {slowestResponse !== null ? `${slowestResponse}ms` : '--'}
          </p>
        </div>

        {/* Monthly API Calls */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">API Calls ({planName})</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {monthlyCalls.toLocaleString()}
            </p>
            <span className="text-xs text-gray-500">
              / {typeof apiLimit === 'number' ? apiLimit.toLocaleString() : '∞'}
            </span>
          </div>
          <div className="mt-2.5 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-blue-600'}`}
              style={{ width: `${typeof apiLimit === 'number' ? usagePercentage : 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* Monitor Health Breakdown & API Quota Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monitor Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:col-span-1">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Monitors Status
          </h3>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Healthy</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{healthyCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Degraded</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{degradedCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Failing</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{failingCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <PauseCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Paused / Disabled</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{pausedCount}</span>
            </div>
          </div>
        </div>

        {/* API Quota & Subscription Statistics */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                API Usage & Quota
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {planName} Plan
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              All active API keys share your account&apos;s monthly quota. Usage resets automatically on the 1st of every month.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Monthly Calls</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{monthlyCalls.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {typeof apiLimit === 'number' ? `${(apiLimit - monthlyCalls).toLocaleString()} remaining` : 'Unlimited quota'}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">All-Time Calls</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{totalCalls.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Lifetime consumption</p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Monitors Limit</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {totalMonitors} / {sub?.maxMonitors || 5}
                </p>
                <p className="text-xs text-gray-500 mt-1">Configured endpoints</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Last usage reset: {userUsage?.lastResetAt ? new Date(userUsage.lastResetAt).toLocaleDateString() : 'Beginning of month'}</span>
            <Link href="/dashboard/billing" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Manage Subscription <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Monitor Performance Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Endpoint Performance Summary</h2>
            <p className="text-sm text-gray-500 mt-0.5">Uptime and latency metrics per configured monitor.</p>
          </div>
          <span className="text-xs text-gray-500 font-mono">{userMonitors.length} Total Monitors</span>
        </div>

        {userMonitors.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No monitor statistics yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
              Create your first monitor to begin collecting uptime metrics, latency checks, and failure logs.
            </p>
            <Link
              href="/dashboard/monitors/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Monitor
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monitor</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uptime</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Checks</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fastest / Slowest</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Latency</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userMonitors.map((monitor) => {
                  const s = statsMap.get(monitor.id);
                  const mTotal = Number(s?.totalChecks || 0);
                  const mSuccess = Number(s?.successfulChecks || 0);
                  const mUptime = mTotal > 0 ? ((mSuccess / mTotal) * 100).toFixed(2) : '100.00';

                  return (
                    <tr key={monitor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            {monitor.type === 'website' ? <Globe className="w-4 h-4 text-blue-600" /> :
                             monitor.type === 'api' ? <Activity className="w-4 h-4 text-green-600" /> :
                             <Database className="w-4 h-4 text-purple-600" />}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <p className="text-sm font-semibold text-gray-900 truncate">{monitor.name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate">{monitor.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          monitor.status === 'healthy' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                          monitor.status === 'failing' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          monitor.status === 'degraded' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                          'bg-gray-500/10 text-gray-500 border-gray-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            monitor.status === 'healthy' ? 'bg-green-500' :
                            monitor.status === 'failing' ? 'bg-red-500' :
                            monitor.status === 'degraded' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`} />
                          {monitor.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">{mUptime}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{mTotal.toLocaleString()} checks</span>
                          <span className="text-xs text-gray-500">
                            {Number(s?.failedChecks || 0).toLocaleString()} failed
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                        {s?.fastestResponse ? `${s.fastestResponse}ms` : '--'} / {s?.slowestResponse ? `${s.slowestResponse}ms` : '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">
                          {s?.fastestResponse ? `${Math.round(s.fastestResponse)}ms` : '--'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/dashboard/monitors/${monitor.id}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-xs gap-1"
                        >
                          View Details <ArrowRight className="w-3.5 h-3.5" />
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
