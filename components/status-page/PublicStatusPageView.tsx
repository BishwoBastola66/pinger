'use client';

import { Activity, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface DailyHistoryPoint {
  date: string;
  hasData: boolean;
  totalChecks: number;
  successfulChecks: number;
  uptimePercentage: number | null;
  avgLatencyMs: number | null;
}

interface MonitorPing {
  statusCode: number | null;
  success: boolean;
  responseTimeMs: number | null;
  timestamp: Date | string;
}

interface ComponentData {
  id: string;
  groupName: string | null;
  position: number;
  monitorId: string;
  monitorName: string;
  monitorType: string;
  monitorStatus: string;
  lastResponseTime: number | null;
  uptimePercentage: number;
  dailyHistory: DailyHistoryPoint[];
  recentPings: MonitorPing[];
}

interface UpdateData {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date | string;
}

interface PublicStatusPageProps {
  data: {
    page: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      logoUrl: string | null;
      customDomain: string | null;
      updatedAt: Date | string;
    };
    components: ComponentData[];
    updates: UpdateData[];
    overallStatus: 'operational' | 'degraded' | 'outage';
  };
}

function formatTimelineDate(dateStr: string) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

export function PublicStatusPageView({ data }: PublicStatusPageProps) {
  const { page, components, updates, overallStatus } = data;

  // Group components by groupName
  const grouped = components.reduce<Record<string, ComponentData[]>>((acc, comp) => {
    const group = comp.groupName || 'General Services';
    if (!acc[group]) acc[group] = [];
    acc[group].push(comp);
    return acc;
  }, {});

  const activeIncidents = updates.filter(
    (u) => u.status === 'investigating' || u.status === 'identified' || u.status === 'monitoring'
  );
  const resolvedUpdates = updates.filter((u) => u.status === 'resolved');

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header matching Pingr sizing, positioning & aesthetics */}
      <header className="h-16 border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {page.logoUrl ? (
              <img
                src={page.logoUrl}
                alt={page.title}
                className="w-9 h-9 rounded-xl object-contain border border-gray-200/80 bg-white p-0.5 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-2xs shrink-0">
                {page.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                {page.title}
              </h1>
              {page.description && (
                <p className="text-xs text-gray-500 font-normal truncate max-w-xs sm:max-w-md">
                  {page.description}
                </p>
              )}
            </div>
          </div>

          {/* Right-aligned Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live System Status Pill */}
            <div
              className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                overallStatus === 'operational'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : overallStatus === 'degraded'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  overallStatus === 'operational'
                    ? 'bg-emerald-500 animate-pulse'
                    : overallStatus === 'degraded'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-rose-500 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {overallStatus === 'operational'
                  ? 'All Systems Operational'
                  : overallStatus === 'degraded'
                  ? 'Degraded Performance'
                  : 'Active Service Outage'}
              </span>
              <span className="sm:hidden">
                {overallStatus === 'operational'
                  ? 'Operational'
                  : overallStatus === 'degraded'
                  ? 'Degraded'
                  : 'Outage'}
              </span>
            </div>

            {/* Refresh / Timestamp */}
            <button
              onClick={() => window.location.reload()}
              title="Refresh status"
              className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100/90 border border-gray-200/80 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
              <span className="hidden md:inline font-medium">
                Updated {new Date(page.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overall Status Banner */}
        <div
          className={`p-6 rounded-2xl border shadow-xs transition-all ${
            overallStatus === 'operational'
              ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
              : overallStatus === 'degraded'
              ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
              : 'bg-rose-50/70 border-rose-200/90 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                overallStatus === 'operational'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg'
                  : overallStatus === 'degraded'
                  ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-lg'
                  : 'bg-rose-500 text-white shadow-rose-500/20 shadow-lg'
              }`}
            >
              {overallStatus === 'operational' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : overallStatus === 'degraded' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {overallStatus === 'operational'
                  ? 'All Systems Operational'
                  : overallStatus === 'degraded'
                  ? 'Degraded Performance'
                  : 'Active Service Outage'}
              </h2>
              <p className="text-sm opacity-90 mt-0.5">
                {overallStatus === 'operational'
                  ? 'All monitored services and core infrastructure are functioning normally.'
                  : overallStatus === 'degraded'
                  ? 'Some components are experiencing elevated latency or degraded response.'
                  : 'Our engineering team is actively responding to disruptions.'}
              </p>
            </div>
          </div>
        </div>

        {/* Active Incident Notices */}
        {activeIncidents.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Active Incidents
            </h3>
            <div className="space-y-3">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="bg-white border-l-4 border-l-amber-500 border border-gray-200 rounded-xl p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-900">{inc.title}</h4>
                    <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{inc.content}</p>
                  <p className="text-xs text-gray-500">
                    Reported on {new Date(inc.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services & Components Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Services & Endpoints</h3>
            <span className="text-xs text-gray-500 font-medium">90-Day Uptime</span>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
              No components have been published to this status page yet.
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, items]) => (
              <div
                key={groupName}
                className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden"
              >
                <div className="px-6 py-3.5 bg-gray-50/70 border-b border-gray-200/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    {groupName}
                  </h4>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((component) => {
                    const isHealthy = component.monitorStatus === 'healthy';
                    const isFailing = component.monitorStatus === 'failing';
                    const isDegraded = component.monitorStatus === 'degraded';

                    return (
                      <div key={component.id} className="p-5 sm:px-6 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isHealthy
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                  : isFailing
                                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  : isDegraded
                                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                  : 'bg-gray-400'
                              }`}
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {component.monitorName}
                            </span>
                            <span className="text-[11px] uppercase tracking-wider font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {component.monitorType}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {component.lastResponseTime && (
                              <span className="text-xs font-mono text-gray-500 hidden sm:inline-block">
                                {component.lastResponseTime}ms
                              </span>
                            )}
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                isHealthy
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isFailing
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isDegraded
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}
                            >
                              {isHealthy
                                ? 'Operational'
                                : isFailing
                                ? 'Major Outage'
                                : isDegraded
                                ? 'Degraded'
                                : 'Paused'}
                            </span>
                          </div>
                        </div>

                        {/* Uptime bar visualization: 90 authentic calendar days */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                            <span>90 days ago</span>
                            <span className="font-semibold text-gray-700">
                              {component.uptimePercentage}% uptime
                            </span>
                            <span>Today</span>
                          </div>
                          <div className="flex gap-[2px] sm:gap-[3px] h-6 sm:h-7 w-full items-stretch">
                            {component.dailyHistory && component.dailyHistory.length > 0 ? (
                              component.dailyHistory.map((day) => {
                                let barColor = 'bg-gray-200 hover:bg-gray-300';
                                let tooltip = `${formatTimelineDate(day.date)}: No checks recorded`;

                                if (day.hasData) {
                                  if (day.totalChecks > 0 && day.successfulChecks === 0) {
                                    barColor = 'bg-rose-500 hover:bg-rose-600';
                                    tooltip = `${formatTimelineDate(day.date)}: Major Outage (0% uptime, ${day.totalChecks} checks failed)`;
                                  } else if (day.uptimePercentage !== null && day.uptimePercentage < 90) {
                                    barColor = 'bg-rose-500 hover:bg-rose-600';
                                    tooltip = `${formatTimelineDate(day.date)}: Outage (${day.uptimePercentage}% uptime, ${day.totalChecks - day.successfulChecks}/${day.totalChecks} failed)`;
                                  } else if (day.uptimePercentage !== null && day.uptimePercentage < 99) {
                                    barColor = 'bg-amber-500 hover:bg-amber-600';
                                    tooltip = `${formatTimelineDate(day.date)}: Degraded (${day.uptimePercentage}% uptime, ${day.totalChecks - day.successfulChecks}/${day.totalChecks} failed)`;
                                  } else {
                                    barColor = 'bg-emerald-500 hover:bg-emerald-600';
                                    tooltip = `${formatTimelineDate(day.date)}: 100% operational (${day.totalChecks} checks)`;
                                  }
                                }

                                return (
                                  <div
                                    key={day.date}
                                    className={`flex-1 rounded-xs transition-all hover:scale-y-125 hover:z-10 cursor-pointer ${barColor}`}
                                    title={tooltip}
                                  />
                                );
                              })
                            ) : (
                              <div className="w-full text-center text-xs text-gray-400 py-1">
                                No history data recorded
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Incident History */}
        <div className="space-y-4 pt-4">
          <h3 className="text-base font-bold text-gray-900">Incident & Maintenance History</h3>
          {resolvedUpdates.length === 0 ? (
            <div className="p-6 bg-white border border-gray-200 rounded-xl text-center text-xs text-gray-500">
              No recent incidents reported in the past 90 days.
            </div>
          ) : (
            <div className="space-y-4">
              {resolvedUpdates.map((update) => (
                <div key={update.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">{update.title}</h4>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Resolved
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{update.content}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(update.createdAt).toLocaleDateString()} at{' '}
                    {new Date(update.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16 py-8 text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Real-time monitoring powered by Pingr</span>
          </div>
          <Link
            href="/"
            className="hover:text-gray-900 transition-colors inline-flex items-center gap-1 font-semibold"
          >
            Create your own status page
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
