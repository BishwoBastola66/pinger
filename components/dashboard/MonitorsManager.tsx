'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  Activity,
  Database,
  Server,
  Search,
  ShieldCheck,
  Link2,
  Clock,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Shield,
  Layers,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMonitorAction } from '@/lib/monitors/actions';

interface MonitorTypeInfo {
  id: string;
  label: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  targetLabel: string;
  targetPlaceholder: string;
  namePlaceholder: string;
  helpText: string;
  defaultPort?: number;
  isAdvanced?: boolean;
}

const MONITOR_TYPES: MonitorTypeInfo[] = [
  {
    id: 'website',
    label: 'Website / HTTP',
    category: 'Web',
    icon: Globe,
    description: 'Public websites and landing pages.',
    targetLabel: 'Website URL',
    targetPlaceholder: 'https://example.com',
    namePlaceholder: 'Main Company Website',
    helpText: 'Include full URL with https:// or http://',
  },
  {
    id: 'api',
    label: 'REST API',
    category: 'API',
    icon: Activity,
    description: 'API endpoints with custom headers & status codes.',
    targetLabel: 'API Endpoint URL',
    targetPlaceholder: 'https://api.example.com/v1/health',
    namePlaceholder: 'Authentication API',
    helpText: 'Full HTTP/HTTPS endpoint to test',
  },
  {
    id: 'supabase',
    label: 'Supabase',
    category: 'Database',
    icon: Database,
    description: 'Postgres REST API & Auth telemetry.',
    targetLabel: 'Supabase REST Endpoint',
    targetPlaceholder: 'https://your-project.supabase.co/rest/v1/',
    namePlaceholder: 'Production Supabase DB',
    helpText: 'Automatically sends apikey header',
  },
  {
    id: 'tcp',
    label: 'TCP / Port',
    category: 'Network',
    icon: Server,
    description: 'Raw network sockets (DB, Redis, SSH).',
    targetLabel: 'Host or IP Address',
    targetPlaceholder: 'db.example.com or 192.168.1.1',
    namePlaceholder: 'PostgreSQL Database Server',
    helpText: 'Hostname or IP only (no http://)',
    defaultPort: 5432,
    isAdvanced: true,
  },
  {
    id: 'dns',
    label: 'DNS Record',
    category: 'Network',
    icon: Search,
    description: 'Nameserver lookups & record assertion.',
    targetLabel: 'Domain to Query',
    targetPlaceholder: 'example.com or mail.example.com',
    namePlaceholder: 'Apex Domain DNS',
    helpText: 'Domain name to query DNS records for',
    isAdvanced: true,
  },
  {
    id: 'ssl',
    label: 'SSL Expiry',
    category: 'Security',
    icon: ShieldCheck,
    description: 'TLS certificate expiration warning.',
    targetLabel: 'Domain / Hostname',
    targetPlaceholder: 'example.com or app.example.com',
    namePlaceholder: 'Wildcard SSL Certificate',
    helpText: 'Domain to inspect SSL certificate validity',
    defaultPort: 443,
    isAdvanced: true,
  },
  {
    id: 'websocket',
    label: 'WebSocket',
    category: 'Web',
    icon: Link2,
    description: 'Handshake & connection health over WS/WSS.',
    targetLabel: 'WebSocket URL',
    targetPlaceholder: 'wss://stream.example.com/socket',
    namePlaceholder: 'Live Stream WebSocket',
    helpText: 'Must begin with wss:// or ws://',
  },
  {
    id: 'cron',
    label: 'Cron Job',
    category: 'Worker',
    icon: Clock,
    description: 'Scheduled daemon & background worker checks.',
    targetLabel: 'Job Identifier / Slug',
    targetPlaceholder: 'nightly-db-backup',
    namePlaceholder: 'Nightly Database Backup',
    helpText: 'Unique slug for this cron job monitor',
  },
];

const INTERVAL_PRESETS = [
  { label: '60s', value: 60, isPro: true },
  { label: '3m', value: 180, isPro: false },
  { label: '5m', value: 300, isPro: false },
  { label: '10m', value: 600, isPro: false },
  { label: '30m', value: 1800, isPro: false },
];

export function MonitorsManager({ 
  initialMonitors,
  currentPlan = 'Free'
}: { 
  initialMonitors: any[];
  currentPlan?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [monitors, setMonitors] = useState(initialMonitors);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('website');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    name: '',
    target: '',
    method: 'GET',
    expectedStatus: 200,
    body: '',
    port: 443,
    dnsQueryType: 'A',
    sslDaysBeforeExpiryAlert: 14,
    cronExpression: '*/5 * * * *',
    timezone: 'UTC',
    gracePeriodSeconds: 300,
    intervalSeconds: currentPlan === 'Free' ? 180 : 60,
    timeoutSeconds: 10,
    failureThreshold: 1,
    retryIntervalSeconds: 60,
  });

  const [authHeader, setAuthHeader] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([]);
  const [expectedDnsValue, setExpectedDnsValue] = useState('');

  // Check if ?new=true is in URL on load
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  // Keep monitors updated if initialMonitors changes
  useEffect(() => {
    setMonitors(initialMonitors);
  }, [initialMonitors]);

  const currentTypeInfo = MONITOR_TYPES.find((t) => t.id === selectedType) || MONITOR_TYPES[0];

  const handleOpenDrawer = () => {
    setError(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setError(null);
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setError(null);
    const targetInfo = MONITOR_TYPES.find((t) => t.id === typeId);
    if (targetInfo?.defaultPort) {
      setFormData((prev: any) => ({ ...prev, port: targetInfo.defaultPort }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Please enter a display name for this monitor');
      }
      if (!formData.target.trim()) {
        throw new Error('Please enter the target address or URL');
      }

      const common = {
        name: formData.name.trim(),
        type: selectedType,
        enabled: true,
        intervalSeconds: Number(formData.intervalSeconds) || 300,
        timeoutSeconds: Number(formData.timeoutSeconds) || 10,
        failureThreshold: Number(formData.failureThreshold) || 1,
        retryIntervalSeconds: Number(formData.retryIntervalSeconds) || 60,
        tags: [],
      };

      let payload: any;

      if (['website', 'api', 'supabase'].includes(selectedType)) {
        let targetUrl = formData.target.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = `https://${targetUrl}`;
        }

        const compiledHeaders: Record<string, string> = {};
        if (authHeader.trim()) {
          compiledHeaders['Authorization'] = authHeader.trim();
        }
        if (selectedType === 'supabase' && supabaseKey.trim()) {
          compiledHeaders['apikey'] = supabaseKey.trim();
          if (!compiledHeaders['Authorization']) {
            compiledHeaders['Authorization'] = `Bearer ${supabaseKey.trim()}`;
          }
        }
        customHeaders.forEach((h) => {
          if (h.key.trim() && h.value.trim()) {
            compiledHeaders[h.key.trim()] = h.value.trim();
          }
        });

        payload = {
          ...common,
          target: targetUrl,
          method: formData.method || 'GET',
          expectedStatus: Number(formData.expectedStatus) || 200,
          headers: compiledHeaders,
          queryParameters: {},
          body: ['POST', 'PUT', 'PATCH'].includes(formData.method) && formData.body?.trim() ? formData.body.trim() : null,
          assertions: [
            {
              type: 'status_code',
              operator: 'equals',
              value: String(formData.expectedStatus || 200),
            },
          ],
        };
      } else if (selectedType === 'tcp') {
        payload = {
          ...common,
          target: formData.target.trim().replace(/^https?:\/\//i, '').split('/')[0],
          port: Number(formData.port) || 80,
        };
      } else if (selectedType === 'dns') {
        const assertions = expectedDnsValue.trim()
          ? [
              {
                type: 'contains',
                operator: 'contains',
                value: expectedDnsValue.trim(),
              },
            ]
          : [];

        payload = {
          ...common,
          target: formData.target.trim().replace(/^https?:\/\//i, '').split('/')[0],
          dnsQueryType: formData.dnsQueryType || 'A',
          assertions,
        };
      } else if (selectedType === 'ssl') {
        payload = {
          ...common,
          target: formData.target.trim().replace(/^https?:\/\//i, '').split('/')[0],
          port: Number(formData.port) || 443,
          sslDaysBeforeExpiryAlert: Number(formData.sslDaysBeforeExpiryAlert) || 14,
        };
      } else if (selectedType === 'websocket') {
        let wsTarget = formData.target.trim();
        if (!wsTarget.startsWith('ws://') && !wsTarget.startsWith('wss://')) {
          wsTarget = `wss://${wsTarget.replace(/^https?:\/\//i, '')}`;
        }
        payload = {
          ...common,
          target: wsTarget,
        };
      } else if (selectedType === 'cron') {
        payload = {
          ...common,
          target: formData.target.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          cronExpression: formData.cronExpression.trim() || '*/5 * * * *',
          timezone: formData.timezone || 'UTC',
          gracePeriodSeconds: Number(formData.gracePeriodSeconds) || 300,
        };
      } else {
        payload = { ...common, target: formData.target.trim() };
      }

      const result = await createMonitorAction(payload);
      if (result?.success) {
        setIsDrawerOpen(false);
        // Reset form
        setFormData({
          name: '',
          target: '',
          method: 'GET',
          expectedStatus: 200,
          body: '',
          port: 443,
          dnsQueryType: 'A',
          sslDaysBeforeExpiryAlert: 14,
          cronExpression: '*/5 * * * *',
          timezone: 'UTC',
          gracePeriodSeconds: 300,
          intervalSeconds: 300,
          timeoutSeconds: 10,
          failureThreshold: 1,
          retryIntervalSeconds: 60,
        });
        setAuthHeader('');
        setSupabaseKey('');
        setCustomHeaders([]);
        setExpectedDnsValue('');
        router.refresh();
      } else {
        setError(result?.message || 'Failed to save monitor. Please check your inputs.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Monitors</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage and view all your monitoring endpoints in real time.</p>
        </div>
        <Button 
          onClick={handleOpenDrawer}
          className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl h-10 px-4 font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Monitor
        </Button>
      </div>

      {/* Monitors Table / Empty State */}
      <div className="overflow-hidden">
        {monitors.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-xs">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No monitors found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto text-xs sm:text-sm leading-relaxed">
              You haven&apos;t set up any services to monitor yet. Create one now with the slide-in setup panel.
            </p>
            <Button 
              onClick={handleOpenDrawer}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl px-5 h-10 text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create your first monitor
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Target</th>
                  <th className="px-6 py-3.5">Frequency</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {monitors.map((monitor) => (
                  <tr key={monitor.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full mr-2.5 ${
                            monitor.status === 'healthy'
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : monitor.status === 'failing'
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                              : monitor.status === 'degraded'
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : monitor.status === 'paused'
                              ? 'bg-gray-400'
                              : 'bg-blue-500 animate-pulse'
                          }`}
                        />
                        <span className="text-xs font-semibold text-gray-700 capitalize">{monitor.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                          {monitor.type === 'website' ? <Globe className="w-3.5 h-3.5 text-blue-600" /> :
                           monitor.type === 'api' ? <Activity className="w-3.5 h-3.5 text-emerald-600" /> :
                           monitor.type === 'tcp' ? <Server className="w-3.5 h-3.5 text-indigo-600" /> :
                           monitor.type === 'ssl' ? <ShieldCheck className="w-3.5 h-3.5 text-sky-600" /> :
                           monitor.type === 'dns' ? <Search className="w-3.5 h-3.5 text-amber-600" /> :
                           monitor.type === 'cron' ? <Clock className="w-3.5 h-3.5 text-rose-600" /> :
                           <Database className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{monitor.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md max-w-[220px] truncate inline-block" title={monitor.target}>
                        {monitor.target}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {monitor.intervalSeconds < 3600
                        ? `Every ${Math.floor(monitor.intervalSeconds / 60)}m`
                        : `Every ${Math.floor(monitor.intervalSeconds / 3600)}h`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link href={`/dashboard/monitors/${monitor.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 font-semibold text-xs">
                          View Details →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ANIMATED SLIDE-OVER DRAWER APPEARS FROM THE RIGHT SIDE */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            />

            {/* Sliding Drawer Container */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="w-screen max-w-xl sm:max-w-2xl bg-white shadow-2xl flex flex-col border-l border-gray-200"
              >
                {/* Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        New Monitor
                      </h2>
                      <p className="text-xs text-gray-500">
                        Select a resource type to view and configure its parameters.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCloseDrawer}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {error && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 1. TYPE SELECTOR (Cards) */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                      1. Select Resource Type
                    </Label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                      {MONITOR_TYPES.map((t) => {
                        const Icon = t.icon;
                        const isSelected = selectedType === t.id;

                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleTypeSelect(t.id)}
                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20 shadow-xs'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                {t.isAdvanced && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
                                    Pro+
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900 truncate">{t.label}</div>
                              <div className="text-[10px] text-gray-500 truncate mt-0.5">{t.category}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pro Feature Callout for Advanced Types on Free Tier */}
                  {currentTypeInfo.isAdvanced && currentPlan === 'Free' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold">Pro Feature:</span> {currentTypeInfo.label} requires a Pro or higher plan.
                      </div>
                      <Link 
                        href="/dashboard/billing" 
                        onClick={handleCloseDrawer}
                        className="font-bold text-blue-700 hover:text-blue-900 underline shrink-0 text-xs"
                      >
                        Upgrade →
                      </Link>
                    </div>
                  )}

                  {/* 2. DYNAMIC OPTIONS APPEAR AS PER CHOSEN TYPE (Animated) */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedType}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5 pt-3 border-t border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          2. Configure {currentTypeInfo.label}
                        </span>
                      </div>

                      {/* Target Input */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                            {currentTypeInfo.targetLabel} <span className="text-red-500">*</span>
                          </Label>
                          <span className="text-[10px] text-gray-400">{currentTypeInfo.helpText}</span>
                        </div>
                        <Input
                          value={formData.target}
                          onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                          placeholder={currentTypeInfo.targetPlaceholder}
                          required
                          className="font-mono text-xs sm:text-sm h-10 rounded-xl"
                        />
                      </div>

                      {/* Display Name */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Display Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={currentTypeInfo.namePlaceholder}
                          required
                          className="text-xs sm:text-sm h-10 rounded-xl"
                        />
                      </div>

                      {/* PROTOCOL SPECIFIC FIELDS */}
                      {['website', 'api', 'supabase'].includes(selectedType) && (
                        <div className="space-y-4 pt-1">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                HTTP Method
                              </Label>
                              <select
                                className="w-full bg-white border border-gray-200 rounded-xl h-10 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={formData.method}
                                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                              >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="HEAD">HEAD</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="DELETE">DELETE</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Expected Status
                              </Label>
                              <Input
                                type="number"
                                value={formData.expectedStatus || 200}
                                onChange={(e) => setFormData({ ...formData, expectedStatus: Number(e.target.value) })}
                                placeholder="200"
                                className="text-xs h-10 rounded-xl"
                              />
                            </div>
                          </div>

                          {selectedType === 'supabase' && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                              <Label className="text-xs font-bold text-emerald-900">
                                Supabase Anon / Service Key
                              </Label>
                              <Input
                                type="password"
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                                placeholder="eyJhbGciOiJIUzI1Ni..."
                                className="text-xs bg-white h-9 font-mono rounded-lg border-emerald-300"
                              />
                            </div>
                          )}

                          {selectedType !== 'supabase' && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Authorization Header (Optional)
                              </Label>
                              <Input
                                type="password"
                                value={authHeader}
                                onChange={(e) => setAuthHeader(e.target.value)}
                                placeholder="Bearer eyJhbGciOi..."
                                className="text-xs h-10 font-mono rounded-xl"
                              />
                            </div>
                          )}

                          {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Request Body (JSON)
                              </Label>
                              <textarea
                                rows={3}
                                value={formData.body || ''}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                placeholder={'{\n  "status": "ping"\n}'}
                                className="w-full text-xs font-mono p-2.5 rounded-xl border border-gray-200"
                              />
                            </div>
                          )}

                          {/* Custom Headers */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Headers ({customHeaders.length})
                              </Label>
                              <button
                                type="button"
                                onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add Header
                              </button>
                            </div>

                            {customHeaders.map((h, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Input
                                  placeholder="Header Name"
                                  value={h.key}
                                  onChange={(e) => {
                                    const updated = [...customHeaders];
                                    updated[i].key = e.target.value;
                                    setCustomHeaders(updated);
                                  }}
                                  className="text-xs h-9 flex-1 font-mono rounded-lg"
                                />
                                <Input
                                  placeholder="Value"
                                  value={h.value}
                                  onChange={(e) => {
                                    const updated = [...customHeaders];
                                    updated[i].value = e.target.value;
                                    setCustomHeaders(updated);
                                  }}
                                  className="text-xs h-9 flex-1 font-mono rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== i))}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TCP Options */}
                      {selectedType === 'tcp' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                              Port (1-65535) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              type="number"
                              value={formData.port || ''}
                              onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                              placeholder="5432"
                              required
                              className="text-xs h-10 rounded-xl"
                            />
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Postgres (5432)', port: 5432 },
                              { label: 'MySQL (3306)', port: 3306 },
                              { label: 'Redis (6379)', port: 6379 },
                              { label: 'SSH (22)', port: 22 },
                              { label: 'HTTPS (443)', port: 443 },
                            ].map((preset) => (
                              <button
                                key={preset.port}
                                type="button"
                                onClick={() => setFormData({ ...formData, port: preset.port })}
                                className={`px-2.5 py-1 rounded-lg text-xs border font-medium ${
                                  formData.port === preset.port
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* DNS Options */}
                      {selectedType === 'dns' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Record Type
                              </Label>
                              <select
                                className="w-full bg-white border border-gray-200 rounded-xl h-10 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={formData.dnsQueryType || 'A'}
                                onChange={(e) => setFormData({ ...formData, dnsQueryType: e.target.value })}
                              >
                                <option value="A">A (IPv4)</option>
                                <option value="AAAA">AAAA (IPv6)</option>
                                <option value="CNAME">CNAME</option>
                                <option value="MX">MX</option>
                                <option value="TXT">TXT</option>
                                <option value="NS">NS</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Expected Value (Optional)
                              </Label>
                              <Input
                                value={expectedDnsValue}
                                onChange={(e) => setExpectedDnsValue(e.target.value)}
                                placeholder="192.0.2.1"
                                className="text-xs h-10 font-mono rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SSL Expiry Options */}
                      {selectedType === 'ssl' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                TLS Port
                              </Label>
                              <Input
                                type="number"
                                value={formData.port || 443}
                                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                                className="text-xs h-10 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Alert Days Before Expiry
                              </Label>
                              <Input
                                type="number"
                                value={formData.sslDaysBeforeExpiryAlert || 14}
                                onChange={(e) => setFormData({ ...formData, sslDaysBeforeExpiryAlert: Number(e.target.value) })}
                                className="text-xs h-10 rounded-xl"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {[7, 14, 30, 60].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => setFormData({ ...formData, sslDaysBeforeExpiryAlert: days })}
                                className={`px-2.5 py-1 rounded-lg text-xs border font-medium ${
                                  formData.sslDaysBeforeExpiryAlert === days
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                {days} Days
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cron Options */}
                      {selectedType === 'cron' && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                              Cron Schedule Expression <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={formData.cronExpression || ''}
                              onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                              placeholder="*/5 * * * *"
                              required
                              className="text-xs h-10 font-mono rounded-xl"
                            />
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Every 5m', val: '*/5 * * * *' },
                              { label: 'Every 15m', val: '*/15 * * * *' },
                              { label: 'Hourly', val: '0 * * * *' },
                              { label: 'Daily', val: '0 0 * * *' },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setFormData({ ...formData, cronExpression: preset.val })}
                                className={`px-2.5 py-1 rounded-lg text-xs border font-medium ${
                                  formData.cronExpression === preset.val
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. TIMING & FREQUENCY */}
                      <div className="space-y-3 pt-3 border-t border-gray-100">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                          3. Check Frequency & Reliability
                        </Label>

                        <div className="flex flex-wrap gap-2">
                          {INTERVAL_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, intervalSeconds: preset.value })}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                formData.intervalSeconds === preset.value
                                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>Every {preset.label}</span>
                              {preset.isPro && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                  Pro
                                </span>
                              )}
                            </button>
                          ))}
                        </div>

                        {formData.intervalSeconds === 60 && currentPlan === 'Free' && (
                          <p className="text-[11px] text-amber-700 font-medium">
                            Free tier requires a minimum check interval of 3m. 60s intervals require a Pro plan.
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500 font-medium">Timeout (Seconds)</Label>
                            <Input
                              type="number"
                              value={formData.timeoutSeconds || 10}
                              onChange={(e) => setFormData({ ...formData, timeoutSeconds: Number(e.target.value) })}
                              className="text-xs h-9 rounded-lg"
                              min={1}
                              max={60}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-gray-500 font-medium">Failure Threshold</Label>
                            <select
                              className="w-full bg-white border border-gray-200 rounded-lg h-9 px-2 text-xs text-gray-900"
                              value={formData.failureThreshold || 1}
                              onChange={(e) => setFormData({ ...formData, failureThreshold: Number(e.target.value) })}
                            >
                              <option value={1}>1 failure (Instant)</option>
                              <option value={2}>2 failures</option>
                              <option value={3}>3 failures (Recommended)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Drawer Footer Actions */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCloseDrawer}
                      className="rounded-xl px-4 text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 h-10 font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Monitor
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
