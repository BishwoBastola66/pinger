'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateMonitorAction, testMonitorAction } from '@/lib/monitors/actions';

export function MonitorEditForm({
  monitor,
  onCancel,
}: {
  monitor: any;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Initialize with existing data, keeping only editable fields
  const [formData, setFormData] = useState<any>({
    type: monitor.type,
    name: monitor.name || '',
    target: monitor.target || '',
    method: monitor.method || 'GET',
    expectedStatus: monitor.expectedStatus || 200,
    headers: monitor.headers || {},
    body: monitor.body || '',
    intervalSeconds: monitor.intervalSeconds || 300,
    timeoutSeconds: monitor.timeoutSeconds || 10,
    failureThreshold: monitor.failureThreshold || 1,
    retryIntervalSeconds: monitor.retryIntervalSeconds || 60,
    port: monitor.port || undefined,
    dnsQueryType: monitor.dnsQueryType || 'A',
    sslDaysBeforeExpiryAlert: monitor.sslDaysBeforeExpiryAlert || 14,
    cronExpression: monitor.cronExpression || '*/5 * * * *',
    timezone: monitor.timezone || 'UTC',
    gracePeriodSeconds: monitor.gracePeriodSeconds || 300,
    heartbeatSecret: monitor.heartbeatSecret || '',
  });

  const typeMeta: Record<
    string,
    { label: string; placeholder: string; help: string }
  > = {
    website: {
      label: 'Website URL',
      placeholder: 'https://example.com',
      help: 'Full website URL including http:// or https://',
    },
    api: {
      label: 'REST API Endpoint URL',
      placeholder: 'https://api.example.com/v1/health',
      help: 'The full URL endpoint to send HTTP requests to',
    },
    supabase: {
      label: 'Supabase Project / REST URL',
      placeholder: 'https://your-project.supabase.co/rest/v1/',
      help: 'Your Supabase project URL or REST endpoint',
    },
    tcp: {
      label: 'Host or IP Address',
      placeholder: '192.168.1.1 or db.example.com',
      help: 'Host domain or IP (do NOT include http:// or port here)',
    },
    dns: {
      label: 'Domain / Hostname to Query',
      placeholder: 'example.com or mail.example.com',
      help: 'Domain name to query DNS records for',
    },
    ssl: {
      label: 'Domain / Hostname',
      placeholder: 'example.com or app.mycompany.com',
      help: 'Domain name to inspect SSL/TLS certificates and expiry date',
    },
    websocket: {
      label: 'WebSocket URL',
      placeholder: 'wss://echo.websocket.org or ws://stream.example.com',
      help: 'Must begin with wss:// (secure) or ws://',
    },
    cron: {
      label: 'Job Identifier / Slug',
      placeholder: 'nightly-db-backup or hourly-sync',
      help: 'Unique identifier slug for this cron job monitor',
    },
    heartbeat: {
      label: 'Heartbeat Identifier / Slug',
      placeholder: 'worker-node-1',
      help: 'Unique slug for passive heartbeat telemetry',
    },
  };

  const currentMeta = typeMeta[formData.type] || typeMeta.website;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { ...formData };
      if (payload.type === 'ssl' && !payload.port) {
        payload.port = 443;
      }
      const result = await updateMonitorAction(monitor.id, payload);
      if (result?.success) {
        onCancel(); // exit edit mode
      } else {
        setError(result?.errors || result?.message || 'Failed to update monitor');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestPing = async () => {
    if (!formData.target?.trim() && !['cron', 'heartbeat'].includes(formData.type)) {
      setError('Please enter a target address or URL to test');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await testMonitorAction({
        ...formData,
        timeoutSeconds: Number(formData.timeoutSeconds) || 10,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        statusCode: null,
        responseTime: 0,
        errorMessage: err.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Monitor: {monitor.name}</h2>
          <span className="text-xs font-mono uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded mt-1 inline-block">
            {monitor.type}
          </span>
        </div>
        <Button variant="ghost" onClick={onCancel} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-gray-700">Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-700">{currentMeta.label}</Label>
          <div className="flex gap-2">
            <Input
              value={formData.target}
              onChange={(e) => {
                setFormData({ ...formData, target: e.target.value });
                if (testResult) setTestResult(null);
              }}
              placeholder={currentMeta.placeholder}
              className="font-mono text-sm flex-1"
            />
            <Button
              type="button"
              onClick={handleTestPing}
              disabled={testing || (!formData.target?.trim() && !['cron', 'heartbeat'].includes(formData.type))}
              variant="outline"
              className="px-4 text-xs font-semibold rounded-lg border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 shrink-0 gap-1.5 transition-all shadow-xs"
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
          <p className="text-[11px] text-gray-500">{currentMeta.help}</p>

          {/* Test Response Result */}
          {testResult && (
            <div
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
            </div>
          )}
        </div>

        {/* Dynamic fields based on type */}
        {['website', 'api', 'supabase'].includes(formData.type) && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              HTTP & Request Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">HTTP Method</Label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-md h-9 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Expected HTTP Status</Label>
                <Input
                  type="number"
                  value={formData.expectedStatus || 200}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedStatus: Number(e.target.value) })
                  }
                  placeholder="200"
                  className="text-xs h-9"
                />
              </div>
            </div>

            {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Request Body (JSON / text)
                </Label>
                <textarea
                  rows={3}
                  value={formData.body || ''}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder={'{\n  "status": "ping"\n}'}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* TCP */}
        {formData.type === 'tcp' && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              TCP Port Settings
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Target Port (1 - 65535) *</Label>
              <Input
                type="number"
                value={formData.port || ''}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                placeholder="5432"
                className="text-xs h-9"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
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
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      formData.port === preset.port
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DNS */}
        {formData.type === 'dns' && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              DNS Query Settings
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">DNS Query Record Type</Label>
              <select
                className="w-full bg-white border border-gray-300 rounded-md h-9 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formData.dnsQueryType || 'A'}
                onChange={(e) => setFormData({ ...formData, dnsQueryType: e.target.value })}
              >
                <option value="A">A (IPv4 Address)</option>
                <option value="AAAA">AAAA (IPv6 Address)</option>
                <option value="CNAME">CNAME (Canonical Name)</option>
                <option value="MX">MX (Mail Server)</option>
                <option value="TXT">TXT (Text / SPF)</option>
                <option value="NS">NS (Authoritative Nameserver)</option>
                <option value="SOA">SOA (Start of Authority)</option>
              </select>
            </div>
          </div>
        )}

        {/* SSL */}
        {formData.type === 'ssl' && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              SSL Expiry Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">TLS Port</Label>
                <Input
                  type="number"
                  value={formData.port || 443}
                  onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Alert Days Before Expiry
                </Label>
                <Input
                  type="number"
                  value={formData.sslDaysBeforeExpiryAlert || 14}
                  onChange={(e) =>
                    setFormData({ ...formData, sslDaysBeforeExpiryAlert: Number(e.target.value) })
                  }
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* Cron Job */}
        {formData.type === 'cron' && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Cron Schedule Settings
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Cron Schedule Expression</Label>
              <Input
                value={formData.cronExpression || ''}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                className="text-xs h-9 font-mono"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Every 5m', val: '*/5 * * * *' },
                  { label: 'Every 15m', val: '*/15 * * * *' },
                  { label: 'Hourly', val: '0 * * * *' },
                  { label: 'Daily', val: '0 0 * * *' },
                  { label: 'Weekly', val: '0 0 * * 0' },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setFormData({ ...formData, cronExpression: preset.val })}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      formData.cronExpression === preset.val
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Timezone</Label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-md h-9 px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <Label className="text-xs font-semibold text-gray-700">Grace Period (Seconds)</Label>
                <Input
                  type="number"
                  value={formData.gracePeriodSeconds || 300}
                  onChange={(e) =>
                    setFormData({ ...formData, gracePeriodSeconds: Number(e.target.value) })
                  }
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* Heartbeat */}
        {formData.type === 'heartbeat' && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Heartbeat Settings
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Grace Period (Seconds)</Label>
              <Input
                type="number"
                value={formData.gracePeriodSeconds || 300}
                onChange={(e) =>
                  setFormData({ ...formData, gracePeriodSeconds: Number(e.target.value) })
                }
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Heartbeat Secret</Label>
              <Input
                type="password"
                value={formData.heartbeatSecret || ''}
                onChange={(e) => setFormData({ ...formData, heartbeatSecret: e.target.value })}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>
        )}

        {/* Scheduling & Intervals */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Monitoring Intervals & Thresholds
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Check Interval (Seconds)</Label>
              <Input
                type="number"
                value={formData.intervalSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, intervalSeconds: Number(e.target.value) })
                }
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Timeout (Seconds)</Label>
              <Input
                type="number"
                value={formData.timeoutSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, timeoutSeconds: Number(e.target.value) })
                }
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Failure Threshold</Label>
              <Input
                type="number"
                value={formData.failureThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, failureThreshold: Number(e.target.value) })
                }
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Retry Interval (Seconds)</Label>
              <Input
                type="number"
                value={formData.retryIntervalSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, retryIntervalSeconds: Number(e.target.value) })
                }
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <p className="font-semibold mb-1">Error saving monitor:</p>
          {typeof error === 'string' ? (
            error
          ) : (
            <ul className="list-disc pl-5">
              {Object.entries(error).map(([key, val]: any) => (
                <li key={key}>
                  {key}: {Array.isArray(val) ? val.join(', ') : val}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
