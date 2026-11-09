'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  Zap,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMonitorAction, testMonitorAction } from '@/lib/monitors/actions';

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
}

const MONITOR_TYPES: MonitorTypeInfo[] = [
  {
    id: 'website',
    label: 'Website / HTTP',
    category: 'Web',
    icon: Globe,
    description: 'Monitor public websites, landing pages, and web apps with uptime & SSL checks.',
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
    description: 'Track endpoint latency, custom HTTP methods, headers, and expected response codes.',
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
    description: 'Verify Postgres REST API and auth availability with anon or service keys.',
    targetLabel: 'Supabase REST Endpoint',
    targetPlaceholder: 'https://your-project.supabase.co/rest/v1/',
    namePlaceholder: 'Production Supabase DB',
    helpText: 'Project REST URL (automatically sends apikey header)',
  },
  {
    id: 'tcp',
    label: 'TCP / Port',
    category: 'Network',
    icon: Server,
    description: 'Check raw socket connectivity on any port (Postgres, MySQL, Redis, SSH).',
    targetLabel: 'Host or IP Address',
    targetPlaceholder: 'db.example.com or 192.168.1.1',
    namePlaceholder: 'PostgreSQL Database Server',
    helpText: 'Hostname or IP only (do NOT include http://)',
    defaultPort: 5432,
  },
  {
    id: 'dns',
    label: 'DNS Record',
    category: 'Network',
    icon: Search,
    description: 'Verify nameserver resolution and assert against expected IP or text records.',
    targetLabel: 'Domain to Query',
    targetPlaceholder: 'example.com or mail.example.com',
    namePlaceholder: 'Apex Domain DNS',
    helpText: 'Domain name to query DNS records for',
  },
  {
    id: 'ssl',
    label: 'SSL Expiry',
    category: 'Security',
    icon: ShieldCheck,
    description: 'Inspect certificate health and receive alerts before SSL/TLS certificates expire.',
    targetLabel: 'Domain / Hostname',
    targetPlaceholder: 'example.com or app.example.com',
    namePlaceholder: 'Wildcard SSL Certificate',
    helpText: 'Domain to check certificate validity',
    defaultPort: 443,
  },
  {
    id: 'websocket',
    label: 'WebSocket',
    category: 'Web',
    icon: Link2,
    description: 'Test handshake and ongoing bidirectional connection health over WS or WSS.',
    targetLabel: 'WebSocket URL',
    targetPlaceholder: 'wss://stream.example.com/socket',
    namePlaceholder: 'Live Stream WebSocket',
    helpText: 'Must begin with wss:// (secure) or ws://',
  },
  {
    id: 'cron',
    label: 'Cron Job',
    category: 'Worker',
    icon: Clock,
    description: 'Monitor background jobs and worker daemons with schedule grace periods.',
    targetLabel: 'Job Identifier / Slug',
    targetPlaceholder: 'nightly-db-backup',
    namePlaceholder: 'Nightly Database Backup',
    helpText: 'Unique slug for this cron job monitor',
  },
];

const INTERVAL_PRESETS = [
  { label: '60s', value: 60, desc: 'Real-time' },
  { label: '3m', value: 180, desc: 'Fast' },
  { label: '5m', value: 300, desc: 'Standard' },
  { label: '10m', value: 600, desc: 'Eco' },
  { label: '30m', value: 1800, desc: 'Relaxed' },
];

export function MonitorWizard() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('website');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test Ping State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

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
    intervalSeconds: 300,
    timeoutSeconds: 10,
    failureThreshold: 1,
    retryIntervalSeconds: 60,
  });

  // Protocol specific states
  const [authHeader, setAuthHeader] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [customHeaders, setCustomHeaders] = useState<{ key: string; value: string }[]>([]);
  const [expectedDnsValue, setExpectedDnsValue] = useState('');

  const currentTypeInfo = MONITOR_TYPES.find((t) => t.id === selectedType) || MONITOR_TYPES[0];

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setError(null);
    setTestResult(null);
    const targetInfo = MONITOR_TYPES.find((t) => t.id === typeId);
    if (targetInfo?.defaultPort) {
      setFormData((prev: any) => ({ ...prev, port: targetInfo.defaultPort }));
    }
  };

  const handleTestPing = async () => {
    if (!formData.target.trim() && !['cron', 'heartbeat'].includes(selectedType)) {
      setError('Please enter a target address or URL first to test');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const payload: any = {
        type: selectedType,
        target: formData.target.trim(),
        method: formData.method,
        expectedStatus: Number(formData.expectedStatus) || 200,
        body: formData.body,
        port: Number(formData.port),
        dnsQueryType: formData.dnsQueryType,
        sslDaysBeforeExpiryAlert: Number(formData.sslDaysBeforeExpiryAlert),
        cronExpression: formData.cronExpression,
        timezone: formData.timezone,
        timeoutSeconds: Number(formData.timeoutSeconds) || 10,
        apiKey: supabaseKey.trim() || undefined,
      };

      if (customHeaders.length > 0 || authHeader.trim()) {
        const headerMap: Record<string, string> = {};
        if (authHeader.trim()) headerMap['Authorization'] = authHeader.trim();
        customHeaders.forEach((h) => {
          if (h.key.trim() && h.value.trim()) headerMap[h.key.trim()] = h.value.trim();
        });
        payload.headers = headerMap;
      }

      const res = await testMonitorAction(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        statusCode: null,
        responseTime: 0,
        errorMessage: err.message || 'Test connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('Please provide a friendly name for this monitor');
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
        router.push(`/dashboard/monitors/${result.monitorId}`);
      } else {
        setError(result?.message || 'Failed to create monitor. Please check your inputs.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Hero Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Setup Engine
              </span>
              <span className="text-xs text-gray-400">• Step-Free Configuration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Create New Monitor
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Select what you want to monitor. Relevant configuration options appear immediately below with real-time validation.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Type: <span className="text-gray-900">{currentTypeInfo.label}</span>
          </div>
        </div>

        {/* MONITOR TYPE SELECTION GRID */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
            1. Select Resource Type
          </Label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            {MONITOR_TYPES.map((t) => {
              const Icon = t.icon;
              const isSelected = selectedType === t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeSelect(t.id)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.span>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {t.label}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DYNAMIC CONFIGURATION FORM THAT FILLS THE AREA */}
      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* LEFT / MAIN COLUMN: Configuration Fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Error Banner */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* General Target & Identity */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    2. Target & Identity
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Target input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="target" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        {currentTypeInfo.targetLabel} <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] text-gray-400">{currentTypeInfo.helpText}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="target"
                        value={formData.target}
                        onChange={(e) => {
                          setFormData({ ...formData, target: e.target.value });
                          if (testResult) setTestResult(null);
                        }}
                        placeholder={currentTypeInfo.targetPlaceholder}
                        required
                        className="font-mono text-xs sm:text-sm h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleTestPing}
                        disabled={testing || (!formData.target.trim() && !['cron', 'heartbeat'].includes(selectedType))}
                        variant="outline"
                        className="h-11 px-4 text-xs font-semibold rounded-xl border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 shrink-0 gap-1.5 transition-all shadow-xs"
                      >
                        {testing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-500" />
                            <span>Test Ping</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Live Test Response Result Card */}
                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 shadow-xs transition-all ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-semibold">
                            {testResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-600" />
                            )}
                            <span>{testResult.success ? 'Ping Succeeded' : 'Ping Failed'}</span>
                            {testResult.statusCode && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                testResult.success ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'
                              }`}>
                                HTTP {testResult.statusCode}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] font-medium text-gray-600">
                            ⚡ {testResult.responseTime}ms
                          </span>
                        </div>
                        {testResult.errorMessage && (
                          <p className="text-[11px] text-rose-700 font-medium">
                            {testResult.errorMessage}
                          </p>
                        )}
                        {testResult.bodySnippet && (
                          <div className="mt-1 p-2 bg-white/80 rounded-lg border border-gray-200/60 font-mono text-[10px] text-gray-700 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                            {testResult.bodySnippet}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Friendly Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Friendly Display Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={currentTypeInfo.namePlaceholder}
                      required
                      className="text-xs sm:text-sm h-11 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Protocol Specific Configuration */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    3. Protocol Options ({currentTypeInfo.label})
                  </h2>
                </div>

                {/* Website / HTTP & API Options */}
                {['website', 'api', 'supabase'].includes(selectedType) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          HTTP Method
                        </Label>
                        <select
                          className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.method}
                          onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                        >
                          <option value="GET">GET (Standard)</option>
                          <option value="POST">POST (Submit Payload)</option>
                          <option value="HEAD">HEAD (Lightweight)</option>
                          <option value="PUT">PUT (Replace)</option>
                          <option value="PATCH">PATCH (Update)</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Expected Status Code
                        </Label>
                        <Input
                          type="number"
                          value={formData.expectedStatus || 200}
                          onChange={(e) => setFormData({ ...formData, expectedStatus: Number(e.target.value) })}
                          placeholder="200"
                          className="text-xs sm:text-sm h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Supabase Key Field */}
                    {selectedType === 'supabase' && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                        <Label className="text-xs font-bold text-emerald-900">
                          Supabase Anon / Service Role API Key
                        </Label>
                        <Input
                          type="password"
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="text-xs bg-white h-10 font-mono rounded-lg border-emerald-300"
                        />
                        <p className="text-[11px] text-emerald-700">
                          Passed automatically in the <code className="font-mono">apikey</code> and <code className="font-mono">Authorization: Bearer</code> headers.
                        </p>
                      </div>
                    )}

                    {/* Authorization Header */}
                    {selectedType !== 'supabase' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Authorization Header (Optional)
                        </Label>
                        <Input
                          type="password"
                          value={authHeader}
                          onChange={(e) => setAuthHeader(e.target.value)}
                          placeholder="Bearer eyJhbGciOiJIUzI1Ni..."
                          className="text-xs sm:text-sm h-11 font-mono rounded-xl"
                        />
                      </div>
                    )}

                    {/* Request Body for POST/PUT/PATCH */}
                    {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Request Body (JSON / Payload)
                        </Label>
                        <textarea
                          rows={3}
                          value={formData.body || ''}
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                          placeholder={'{\n  "health": "ok"\n}'}
                          className="w-full text-xs font-mono p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Custom HTTP Headers */}
                    <div className="space-y-2.5 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Custom Headers ({customHeaders.length})
                        </Label>
                        <button
                          type="button"
                          onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Header
                        </button>
                      </div>

                      {customHeaders.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="Header Name (e.g. User-Agent)"
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
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TCP / Port Options */}
                {selectedType === 'tcp' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Target Port (1 - 65535) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        value={formData.port || ''}
                        onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                        placeholder="e.g. 5432"
                        required
                        className="text-xs sm:text-sm h-11 rounded-xl"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 font-medium block mb-2">Common Port Presets:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'PostgreSQL (5432)', port: 5432 },
                          { label: 'MySQL (3306)', port: 3306 },
                          { label: 'Redis (6379)', port: 6379 },
                          { label: 'SSH (22)', port: 22 },
                          { label: 'HTTP (80)', port: 80 },
                          { label: 'HTTPS (443)', port: 443 },
                        ].map((preset) => (
                          <button
                            key={preset.port}
                            type="button"
                            onClick={() => setFormData({ ...formData, port: preset.port })}
                            className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-colors ${
                              formData.port === preset.port
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* DNS Record Options */}
                {selectedType === 'dns' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          DNS Record Query Type
                        </Label>
                        <select
                          className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={formData.dnsQueryType || 'A'}
                          onChange={(e) => setFormData({ ...formData, dnsQueryType: e.target.value })}
                        >
                          <option value="A">A (IPv4 Address)</option>
                          <option value="AAAA">AAAA (IPv6 Address)</option>
                          <option value="CNAME">CNAME (Alias)</option>
                          <option value="MX">MX (Mail Server)</option>
                          <option value="TXT">TXT (Verification / SPF)</option>
                          <option value="NS">NS (Nameserver)</option>
                          <option value="SOA">SOA (Authority)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Expected Value Assertion (Optional)
                        </Label>
                        <Input
                          value={expectedDnsValue}
                          onChange={(e) => setExpectedDnsValue(e.target.value)}
                          placeholder="e.g. 192.0.2.1 or v=spf1"
                          className="text-xs sm:text-sm h-11 font-mono rounded-xl"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Alerts if resolved DNS records do not contain this IP, host, or string.
                    </p>
                  </div>
                )}

                {/* SSL Expiry Options */}
                {selectedType === 'ssl' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          TLS Port
                        </Label>
                        <Input
                          type="number"
                          value={formData.port || 443}
                          onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                          placeholder="443"
                          className="text-xs sm:text-sm h-11 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Alert Days Before Expiry
                        </Label>
                        <Input
                          type="number"
                          value={formData.sslDaysBeforeExpiryAlert || 14}
                          onChange={(e) =>
                            setFormData({ ...formData, sslDaysBeforeExpiryAlert: Number(e.target.value) })
                          }
                          placeholder="14"
                          className="text-xs sm:text-sm h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {[7, 14, 30, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFormData({ ...formData, sslDaysBeforeExpiryAlert: days })}
                          className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-colors ${
                            formData.sslDaysBeforeExpiryAlert === days
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* WebSocket Options */}
                {selectedType === 'websocket' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2.5">
                      <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Pingr initiates a WebSocket handshake to test connection availability. Use <strong className="font-mono">wss://</strong> for secure connections.
                      </span>
                    </div>
                  </div>
                )}

                {/* Cron Job Options */}
                {selectedType === 'cron' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Cron Schedule Expression <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formData.cronExpression || ''}
                        onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                        placeholder="*/5 * * * *"
                        required
                        className="text-xs sm:text-sm h-11 font-mono rounded-xl"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Every 5m (*/5 * * * *)', val: '*/5 * * * *' },
                        { label: 'Every 15m (*/15 * * * *)', val: '*/15 * * * *' },
                        { label: 'Hourly (0 * * * *)', val: '0 * * * *' },
                        { label: 'Daily (0 0 * * *)', val: '0 0 * * *' },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, cronExpression: preset.val })}
                          className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition-colors ${
                            formData.cronExpression === preset.val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Timezone
                        </Label>
                        <select
                          className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={formData.timezone || 'UTC'}
                          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        >
                          <option value="UTC">UTC (Universal)</option>
                          <option value="America/New_York">America / New York (EST)</option>
                          <option value="America/Chicago">America / Chicago (CST)</option>
                          <option value="America/Los_Angeles">America / Los Angeles (PST)</option>
                          <option value="Europe/London">Europe / London (GMT)</option>
                          <option value="Europe/Paris">Europe / Paris (CET)</option>
                          <option value="Asia/Tokyo">Asia / Tokyo (JST)</option>
                          <option value="Asia/Kathmandu">Asia / Kathmandu (NPT)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Grace Period (Seconds)
                        </Label>
                        <Input
                          type="number"
                          value={formData.gracePeriodSeconds || 300}
                          onChange={(e) =>
                            setFormData({ ...formData, gracePeriodSeconds: Number(e.target.value) })
                          }
                          placeholder="300"
                          className="text-xs sm:text-sm h-11 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reliability & Frequency Settings */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    4. Check Interval & Timing
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Check Frequency
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {INTERVAL_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, intervalSeconds: preset.value })}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            formData.intervalSeconds === preset.value
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-sm">{preset.label}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{preset.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Request Timeout (Seconds)
                      </Label>
                      <Input
                        type="number"
                        value={formData.timeoutSeconds || 10}
                        onChange={(e) => setFormData({ ...formData, timeoutSeconds: Number(e.target.value) })}
                        className="text-xs sm:text-sm h-11 rounded-xl"
                        min={1}
                        max={60}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Failure Threshold (Retries Before Alert)
                      </Label>
                      <select
                        className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={formData.failureThreshold || 1}
                        onChange={(e) => setFormData({ ...formData, failureThreshold: Number(e.target.value) })}
                      >
                        <option value={1}>1 failure (Instant alert)</option>
                        <option value={2}>2 consecutive failures</option>
                        <option value={3}>3 consecutive failures (Recommended)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Live Monitor Summary Card & Submit */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 sticky top-6">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Monitor Summary
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs text-gray-600">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400">Type</span>
                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                      {currentTypeInfo.label}
                    </span>
                  </div>

                  <div className="py-1.5 border-b border-gray-100 space-y-1">
                    <span className="text-gray-400 block">Name</span>
                    <span className="font-semibold text-gray-900 truncate block">
                      {formData.name || 'Untitled Monitor'}
                    </span>
                  </div>

                  <div className="py-1.5 border-b border-gray-100 space-y-1">
                    <span className="text-gray-400 block">Target Address</span>
                    <span className="font-mono text-[11px] text-blue-600 truncate block">
                      {formData.target || 'None configured'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400">Frequency</span>
                    <span className="font-semibold text-gray-900">
                      Every {INTERVAL_PRESETS.find((p) => p.value === formData.intervalSeconds)?.label || '5m'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400">Threshold</span>
                    <span className="font-semibold text-gray-900">
                      {formData.failureThreshold || 1} fail
                    </span>
                  </div>

                  {selectedType === 'ssl' && (
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-400">SSL Alert</span>
                      <span className="font-semibold text-gray-900">
                        &lt; {formData.sslDaysBeforeExpiryAlert || 14} days
                      </span>
                    </div>
                  )}

                  {selectedType === 'cron' && (
                    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-400">Schedule</span>
                      <span className="font-mono font-semibold text-gray-900">
                        {formData.cronExpression || '*/5 * * * *'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2 space-y-2.5">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-xl h-11 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Monitor...
                      </>
                    ) : (
                      <>
                        Create Monitor
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <Link
                    href="/dashboard/monitors"
                    className="w-full inline-flex items-center justify-center text-xs font-semibold text-gray-500 hover:text-gray-800 py-2 transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </form>
    </div>
  );
}
