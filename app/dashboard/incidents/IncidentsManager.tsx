'use client';

import { useState, useTransition } from 'react';
import { Radio, Trash2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createStatusPageUpdate,
  deleteStatusPageUpdate,
} from '@/lib/status-pages/actions';
import { toast } from 'sonner';

interface IncidentUpdate {
  id: string;
  statusPageId: string;
  title: string;
  content: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'maintenance';
  createdAt: Date | string;
}

interface MonitorItem {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

interface IncidentsManagerProps {
  initialStatusPage: {
    id: string;
    title: string;
    slug: string;
  } | null;
  initialUpdates: IncidentUpdate[];
  monitors?: MonitorItem[];
  components?: any[];
}

export function IncidentsManager({
  initialStatusPage,
  initialUpdates,
  monitors = [],
  components = [],
}: IncidentsManagerProps) {
  const [pageId] = useState(initialStatusPage?.id || '');
  const [updates, setUpdates] = useState<IncidentUpdate[]>(initialUpdates || []);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentContent, setIncidentContent] = useState('');
  const [incidentStatus, setIncidentStatus] = useState<
    'investigating' | 'identified' | 'monitoring' | 'resolved' | 'maintenance'
  >('investigating');
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([]);
  const [affectedScope, setAffectedScope] = useState<'all' | 'specific'>('all');

  const availableMonitors = monitors.length > 0
    ? monitors
    : (components.map((c) => ({
        id: c.monitorId || c.id,
        name: c.monitorName || c.name,
        status: c.monitorStatus || c.status,
        type: c.monitorType || c.type,
      })) || []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId) {
      toast.error('Please configure your status page branding first');
      return;
    }
    if (!incidentTitle.trim() || !incidentContent.trim()) {
      toast.error('Title and message content are required');
      return;
    }

    const affectedNames =
      affectedScope === 'specific' && selectedMonitors.length > 0
        ? availableMonitors
            .filter((m) => selectedMonitors.includes(m.id))
            .map((m) => m.name)
        : [];

    const finalContent =
      affectedNames.length > 0
        ? `[Affected: ${affectedNames.join(', ')}]\n\n${incidentContent.trim()}`
        : incidentContent.trim();

    startTransition(async () => {
      try {
        await createStatusPageUpdate(pageId, {
          title: incidentTitle.trim(),
          content: finalContent,
          status: incidentStatus,
        });

        // Optimistically add to state
        setUpdates([
          {
            id: `temp-${Date.now()}`,
            statusPageId: pageId,
            title: incidentTitle.trim(),
            content: finalContent,
            status: incidentStatus,
            createdAt: new Date(),
          },
          ...updates,
        ]);

        setIncidentTitle('');
        setIncidentContent('');
        setIncidentStatus('investigating');
        setSelectedMonitors([]);
        setAffectedScope('all');
        toast.success('Incident notice published successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to publish incident update');
      }
    });
  };

  const handleDeleteIncident = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this incident update?')) return;

    startTransition(async () => {
      try {
        await deleteStatusPageUpdate(updateId);
        setUpdates(updates.filter((u) => u.id !== updateId));
        toast.success('Incident update removed');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete update');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Maintenance
          </span>
        );
      case 'monitoring':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
            Monitoring
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-600" />
            Incidents & Notices
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Publish real-time service updates, ongoing investigation progress, and scheduled maintenance notices.
          </p>
        </div>
      </div>

      {/* Post Incident Form */}
      <section className="space-y-4 pb-6 border-b border-gray-200 w-full">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Post New Notice</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Broadcast service health announcements directly to your status subscribers.
          </p>
        </div>

        <form onSubmit={handleCreateIncident} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1.5">
              <Label htmlFor="incTitle" className="text-xs font-semibold text-gray-700">
                Notice Title *
              </Label>
              <Input
                id="incTitle"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="e.g. Investigating increased latency in US-East"
                required
                className="text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="incStatus" className="text-xs font-semibold text-gray-700">
                Current Status *
              </Label>
              <select
                id="incStatus"
                value={incidentStatus}
                onChange={(e) => setIncidentStatus(e.target.value as any)}
                className="w-full text-xs font-medium border border-gray-200 rounded-md p-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
              >
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {/* Affected Services / Monitors Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Affected Services / Monitors
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAffectedScope('all');
                  setSelectedMonitors([]);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  affectedScope === 'all'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Entire Platform (All Services)
              </button>
              <button
                type="button"
                onClick={() => setAffectedScope('specific')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  affectedScope === 'specific'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Specific Monitors {selectedMonitors.length > 0 ? `(${selectedMonitors.length} selected)` : ''}
              </button>
            </div>

            {affectedScope === 'specific' && (
              <div className="pt-1">
                {availableMonitors.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No monitors found in workspace.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {availableMonitors.map((m) => {
                      const isSelected = selectedMonitors.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setSelectedMonitors((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span>{m.name}</span>
                          <span className="text-[10px] opacity-80">{isSelected ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="incContent" className="text-xs font-semibold text-gray-700">
              Update Message *
            </Label>
            <textarea
              id="incContent"
              value={incidentContent}
              onChange={(e) => setIncidentContent(e.target.value)}
              rows={3}
              placeholder="Describe the situation, affected endpoints, and current mitigation steps..."
              required
              className="w-full text-xs border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Incident Notice'
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* Incident History Section */}
      <section className="space-y-4 w-full">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Incident History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            All historical service notices and resolution updates.
          </p>
        </div>

        {updates.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4">No incident notices posted yet.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 bg-white">
            {updates.map((update) => {
              const affectedMatch = update.content.match(/^\[Affected:\s*([^\]]+)\]\n\n?/);
              const affectedList = affectedMatch ? affectedMatch[1].split(',').map((s) => s.trim()) : [];
              const displayContent = affectedMatch ? update.content.replace(affectedMatch[0], '') : update.content;

              return (
                <div
                  key={update.id}
                  className="py-4 px-4 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{update.title}</span>
                      {getStatusBadge(update.status)}
                      {affectedList.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {name}
                        </span>
                      ))}
                      <span className="text-[11px] text-gray-400">
                        {new Date(update.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {displayContent}
                    </p>
                  </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteIncident(update.id)}
                  disabled={isPending}
                  className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 h-auto shrink-0"
                  title="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}
