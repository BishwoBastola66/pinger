import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { pingLogs, monitorStats } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { ArrowLeft, Play, Pause, Trash2, Edit3, Globe, Activity, Database, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { MonitorEditForm } from '@/components/dashboard/MonitorEditForm';
import { InstantPingButton } from '@/components/dashboard/InstantPingButton';
import { getActiveWorkspaceId } from '@/lib/data/dashboard';
import { getMonitorById } from '@/lib/data/monitor-service';

export default async function MonitorDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ edit?: string }> }) {
  const { id } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === 'true';
  const user = await requireAuth();
  const workspaceId = await getActiveWorkspaceId(user.id);

  const monitor = await getMonitorById(id, workspaceId);

  if (!monitor) {
    notFound();
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <MonitorEditForm 
          monitor={monitor} 
          onCancel={async () => {
            'use server';
            const { redirect } = await import('next/navigation');
            redirect(`/dashboard/monitors/${id}`);
          }} 
        />
      </div>
    );
  }

  const [stats] = await db.select().from(monitorStats).where(eq(monitorStats.monitorId, id)).limit(1);
  
  const recentLogs = await db.select()
    .from(pingLogs)
    .where(eq(pingLogs.monitorId, id))
    .orderBy(desc(pingLogs.checkedAt))
    .limit(50);

  const uptime = stats?.totalChecks > 0 
    ? ((stats.successfulChecks / stats.totalChecks) * 100).toFixed(4) 
    : '0.0000';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/monitors" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to monitors
          </Link>
          <div className="flex items-center gap-3">
            {monitor.type === 'website' ? <Globe className="w-6 h-6 text-blue-600" /> : 
             monitor.type === 'api' ? <Activity className="w-6 h-6 text-green-600" /> : 
             <Database className="w-6 h-6 text-purple-600" />}
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{monitor.name}</h1>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              monitor.status === 'healthy' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
              monitor.status === 'failing' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
              monitor.status === 'degraded' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
              monitor.status === 'paused' ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' :
              'bg-blue-500/10 text-blue-600 border-blue-500/20'
            }`}>
              {monitor.status}
            </div>
          </div>
          <p className="text-gray-500 mt-2 font-mono text-sm">{monitor.method} {monitor.target}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <InstantPingButton monitorId={id} />
          <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900">
            {monitor.enabled ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Resume</>}
          </Button>
          <Link href={`/dashboard/monitors/${id}?edit=true`}>
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900">
              <Edit3 className="w-4 h-4 mr-2" /> Edit
            </Button>
          </Link>
          <Button variant="danger">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Uptime</p>
          <p className="text-2xl font-bold text-gray-900">{uptime}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Current Response Time</p>
          <p className="text-2xl font-bold text-gray-900">{monitor.lastResponseTime ? `${monitor.lastResponseTime}ms` : '--'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Checks</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalChecks || 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500 mb-1">Frequency</p>
          <p className="text-2xl font-bold text-gray-900">
            {monitor.intervalSeconds < 3600 
              ? `${Math.floor(monitor.intervalSeconds / 60)}m` 
              : `${Math.floor(monitor.intervalSeconds / 3600)}h`}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Response Time</h2>
        <div className="h-64">
          <ResponseTimeChart data={recentLogs} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Ping Logs</h2>
        </div>
        
        {recentLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No ping logs yet. The worker will check this monitor soon.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Response Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                      {new Date(log.checkedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {log.success ? (
                        <span className="inline-flex items-center text-green-500 text-sm">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-500 text-sm">
                          <XCircle className="w-4 h-4 mr-1.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                      {log.statusCode || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                      {log.responseTime ? `${log.responseTime}ms` : '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-red-400">
                      {log.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
