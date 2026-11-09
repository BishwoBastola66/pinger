'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateApiKeyAction, revokeApiKeyAction } from '@/lib/api-keys/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Eye, 
  PenLine, 
  Shield, 
  SlidersHorizontal,
  Calendar,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Code
} from 'lucide-react';

interface ScopeDefinition {
  id: string;
  name: string;
  category: 'Monitors' | 'Incidents' | 'Heartbeats' | 'Status Page';
  action: 'read' | 'write';
  description: string;
}

const AVAILABLE_SCOPES: ScopeDefinition[] = [
  {
    id: 'monitors:read',
    name: 'Read Monitors & Metrics',
    category: 'Monitors',
    action: 'read',
    description: 'Inspect monitor statuses, uptime stats, latency charts, and ping logs.',
  },
  {
    id: 'monitors:write',
    name: 'Write & Manage Monitors',
    category: 'Monitors',
    action: 'write',
    description: 'Create, edit, pause, resume, and delete monitors.',
  },
  {
    id: 'incidents:read',
    name: 'Read Incidents & Outages',
    category: 'Incidents',
    action: 'read',
    description: 'View active and historical incident records and post-mortem notes.',
  },
  {
    id: 'incidents:write',
    name: 'Publish & Manage Incidents',
    category: 'Incidents',
    action: 'write',
    description: 'Open new incident notices and publish progress updates.',
  },
  {
    id: 'heartbeats:write',
    name: 'Push Heartbeats & Telemetry',
    category: 'Heartbeats',
    action: 'write',
    description: 'Send automated check-in pings and telemetry from cron jobs or daemons.',
  },
  {
    id: 'status:read',
    name: 'Read Status Page & Domains',
    category: 'Status Page',
    action: 'read',
    description: 'Query public status page configurations and custom domain DNS records.',
  },
];

const PRESETS = [
  {
    id: 'full_access',
    label: 'Full Access',
    badge: 'Read & Write',
    icon: Shield,
    scopes: AVAILABLE_SCOPES.map(s => s.id),
    summary: 'Full control over monitors, incidents, heartbeats, and status pages.',
  },
  {
    id: 'read_only',
    label: 'Read Only',
    badge: 'Query Only',
    icon: Eye,
    scopes: AVAILABLE_SCOPES.filter(s => s.action === 'read').map(s => s.id),
    summary: 'Inspect status and query telemetry without mutating data.',
  },
  {
    id: 'write_only',
    label: 'Write Only',
    badge: 'Push & Mutate',
    icon: PenLine,
    scopes: AVAILABLE_SCOPES.filter(s => s.action === 'write').map(s => s.id),
    summary: 'Push heartbeats & post incidents without reading private configs.',
  },
  {
    id: 'custom',
    label: 'Custom',
    badge: 'Granular',
    icon: SlidersHorizontal,
    scopes: [],
    summary: 'Select individual permission scopes for specific integrations.',
  },
] as const;

export function ApiKeyManager({ initialKeys }: { initialKeys: any[] }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<{ id: string; name: string } | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({});

  // Permission selection state for modal
  const [selectedPreset, setSelectedPreset] = useState<'full_access' | 'read_only' | 'write_only' | 'custom'>('full_access');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    AVAILABLE_SCOPES.map(s => s.id)
  );

  const [state, formAction, isPending] = useActionState(generateApiKeyAction, null as any);

  useEffect(() => {
    if (state?.success && state.plaintextToken) {
      setGeneratedKey(state.plaintextToken);
    }
  }, [state]);

  const handleOpenModal = () => {
    setSelectedPreset('full_access');
    setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
    setIsModalOpen(true);
  };

  const handleSelectPreset = (presetId: 'full_access' | 'read_only' | 'write_only' | 'custom') => {
    setSelectedPreset(presetId);
    if (presetId === 'full_access') {
      setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
    } else if (presetId === 'read_only') {
      setSelectedScopes(AVAILABLE_SCOPES.filter(s => s.action === 'read').map(s => s.id));
    } else if (presetId === 'write_only') {
      setSelectedScopes(AVAILABLE_SCOPES.filter(s => s.action === 'write').map(s => s.id));
    }
  };

  const handleToggleScope = (scopeId: string) => {
    let nextScopes: string[];
    if (selectedScopes.includes(scopeId)) {
      nextScopes = selectedScopes.filter(id => id !== scopeId);
    } else {
      nextScopes = [...selectedScopes, scopeId];
    }
    setSelectedScopes(nextScopes);

    const isFull = AVAILABLE_SCOPES.every(s => nextScopes.includes(s.id)) && nextScopes.length === AVAILABLE_SCOPES.length;
    const readScopes = AVAILABLE_SCOPES.filter(s => s.action === 'read').map(s => s.id);
    const isReadOnly = nextScopes.length === readScopes.length && readScopes.every(id => nextScopes.includes(id));
    const writeScopes = AVAILABLE_SCOPES.filter(s => s.action === 'write').map(s => s.id);
    const isWriteOnly = nextScopes.length === writeScopes.length && writeScopes.every(id => nextScopes.includes(id));

    if (isFull) {
      setSelectedPreset('full_access');
    } else if (isReadOnly) {
      setSelectedPreset('read_only');
    } else if (isWriteOnly) {
      setSelectedPreset('write_only');
    } else {
      setSelectedPreset('custom');
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyCurl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const confirmRevoke = async () => {
    if (!keyToRevoke) return;
    const keyId = keyToRevoke.id;
    setIsRevoking(keyId);
    const result = await revokeApiKeyAction(keyId);
    if (result.success) {
      setKeys(keys.filter(k => k.id !== keyId));
      setKeyToRevoke(null);
    } else {
      alert('Failed to revoke API key');
    }
    setIsRevoking(null);
  };

  const toggleScopeExpansion = (keyId: string) => {
    setExpandedScopes(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const renderPermissionBadge = (keyScopes: string[] | undefined) => {
    const list = Array.isArray(keyScopes) ? keyScopes : ['monitors:read'];
    const allScopes = AVAILABLE_SCOPES.map(s => s.id);
    const hasAll = allScopes.every(id => list.includes(id));
    const isRead = list.length > 0 && list.every(s => s.endsWith(':read'));
    const isWrite = list.length > 0 && list.every(s => s.endsWith(':write'));

    if (hasAll) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Full Access
        </span>
      );
    }
    if (isRead) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          Read Only
        </span>
      );
    }
    if (isWrite) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <PenLine className="w-3.5 h-3.5 text-amber-600" />
          Write Only
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
        Custom ({list.length} scopes)
      </span>
    );
  };

  const getPermissionSummary = (keyScopes: string[] | undefined) => {
    const list = Array.isArray(keyScopes) ? keyScopes : ['monitors:read'];
    const allScopes = AVAILABLE_SCOPES.map(s => s.id);
    const hasAll = allScopes.every(id => list.includes(id));
    if (hasAll) return 'All 6 scopes granted (read & write)';
    if (list.every(s => s.endsWith(':read'))) return `All read scopes (${list.length})`;
    if (list.every(s => s.endsWith(':write'))) return `All write scopes (${list.length})`;
    return `${list.length} granular scopes`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  API Keys
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  {keys.length} {keys.length === 1 ? 'Key' : 'Keys'}
                </span>
              </div>
              <p className="text-gray-500 mt-1 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Manage scoped API keys to access Pingr programmatically. Securely authenticate your background workers, CLI scripts, and CI/CD pipelines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center w-full sm:w-auto">
            <Link 
              href="/docs/api-keys" 
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
              API Docs
            </Link>
            <Button 
              onClick={handleOpenModal} 
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Generate New Key
            </Button>
          </div>
        </div>

        {/* Feature info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2.5 text-xs text-gray-600">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted with SHA-256 at rest</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-600">
            <Terminal className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Passed via <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">Authorization: Bearer</code></span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-600">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Instant revocation capability</span>
          </div>
        </div>
      </div>

      {/* Main Keys Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {keys.length === 0 ? (
          <div className="py-16 sm:py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-xs">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">No API keys generated yet</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
              Create your first scoped API key to authenticate your tools, send heartbeats, and fetch monitor telemetry.
            </p>
            <Button 
              onClick={handleOpenModal} 
              className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-5 rounded-xl text-sm font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate API Key
            </Button>
          </div>
        ) : (
          <div>
            {/* DESKTOP TABLE VIEW (Screens >= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-6 w-[26%]">Key Name</th>
                    <th className="py-3.5 px-6 w-[30%]">Permissions & Scopes</th>
                    <th className="py-3.5 px-6 w-[18%]">Key Hash</th>
                    <th className="py-3.5 px-6 w-[16%]">Created</th>
                    <th className="py-3.5 px-6 w-[10%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {keys.map((key) => {
                    const keyScopes: string[] = Array.isArray(key.scopes) ? key.scopes : ['monitors:read'];
                    const isExpanded = !!expandedScopes[key.id];
                    const hashSnippet = key.keyHash ? `${key.keyHash.substring(0, 14)}...` : '—';

                    return (
                      <tr key={key.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Name */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0 mt-0.5">
                              <Key className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate" title={key.name}>
                                {key.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                <span className="text-[11px] text-gray-500 font-medium">Active</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Permissions */}
                        <td className="py-4 px-6 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderPermissionBadge(keyScopes)}
                              <button
                                onClick={() => toggleScopeExpansion(key.id)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                              >
                                {isExpanded ? 'Hide' : 'Details'}
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 leading-tight">
                              {getPermissionSummary(keyScopes)}
                            </p>

                            {/* Collapsible Scopes */}
                            {isExpanded && (
                              <div className="flex flex-wrap gap-1 pt-1.5 max-w-sm animate-in fade-in-50 duration-150">
                                {keyScopes.map(sc => (
                                  <span 
                                    key={sc} 
                                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200"
                                  >
                                    {sc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Key Hash */}
                        <td className="py-4 px-6 align-top">
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
                              {hashSnippet}
                            </code>
                            {key.keyHash && (
                              <button
                                onClick={() => handleCopyHash(key.keyHash, key.id)}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                title="Copy full key hash"
                              >
                                {copiedHashId === key.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Created & Last Used */}
                        <td className="py-4 px-6 align-top">
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{key.createdAt ? new Date(key.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{key.lastUsedAt ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 align-top text-right">
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => setKeyToRevoke({ id: key.id, name: key.name })}
                            disabled={isRevoking === key.id}
                            className="text-xs font-semibold rounded-lg hover:bg-red-50 text-red-600 border border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> 
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE & TABLET CARDS VIEW (Screens < lg) */}
            <div className="block lg:hidden divide-y divide-gray-100">
              {keys.map((key) => {
                const keyScopes: string[] = Array.isArray(key.scopes) ? key.scopes : ['monitors:read'];
                const isExpanded = !!expandedScopes[key.id];
                const hashSnippet = key.keyHash ? `${key.keyHash.substring(0, 16)}...` : '—';

                return (
                  <div key={key.id} className="p-4 sm:p-5 space-y-3.5 hover:bg-gray-50/50 transition-colors">
                    {/* Top Row: Key Name, Status & Revoke */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Key className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate" title={key.name}>
                            {key.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[11px] text-gray-500 font-medium">Active Key</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => setKeyToRevoke({ id: key.id, name: key.name })}
                        disabled={isRevoking === key.id}
                        className="text-xs font-semibold rounded-lg px-2.5 py-1 text-red-600 bg-red-50 border border-red-200 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> 
                        Revoke
                      </Button>
                    </div>

                    {/* Permissions Badge & Summary */}
                    <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {renderPermissionBadge(keyScopes)}
                        <button
                          onClick={() => toggleScopeExpansion(key.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          {isExpanded ? 'Hide Scopes' : 'View Scopes'}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      <p className="text-xs text-gray-500">
                        {getPermissionSummary(keyScopes)}
                      </p>

                      {/* Expandable Scopes */}
                      {isExpanded && (
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-200/60 animate-in fade-in-50 duration-150">
                          {keyScopes.map(sc => (
                            <span 
                              key={sc} 
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200 shadow-2xs"
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata: Hash, Created & Last Used */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                      <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-50/60 border border-gray-100 rounded-lg px-2.5 py-1.5">
                        <span className="text-gray-400 text-[11px]">Hash:</span>
                        <code className="font-mono text-gray-700 text-[11px]">{hashSnippet}</code>
                        {key.keyHash && (
                          <button
                            onClick={() => handleCopyHash(key.keyHash, key.id)}
                            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors ml-auto sm:ml-0"
                            title="Copy full key hash"
                          >
                            {copiedHashId === key.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-gray-500 px-1 py-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{key.lastUsedAt ? 'Used' : 'Never used'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Developer Quickstart Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">How to authenticate with your API key</h3>
          </div>
          <Link 
            href="/docs/api-keys" 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Full documentation <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-gray-600">
          Send your generated API key in the <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono text-[11px]">Authorization</code> header with the <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono text-[11px]">Bearer</code> scheme:
        </p>

        <div className="relative bg-gray-900 text-gray-100 rounded-xl p-3.5 sm:p-4 text-xs font-mono overflow-x-auto">
          <pre className="pr-12">
{`curl -X GET "https://api.pingr.site/api/v1/monitors" \\
  -H "Authorization: Bearer pingr_your_api_key_here"`}
          </pre>
          <button
            onClick={() => handleCopyCurl('curl -X GET "https://api.pingr.site/api/v1/monitors" \\\n  -H "Authorization: Bearer pingr_your_api_key_here"')}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy command"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Revoke API Key</h3>
                <p className="text-xs text-gray-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
              Are you sure you want to revoke <span className="font-semibold text-gray-900">&quot;{keyToRevoke.name}&quot;</span>? Any services or background jobs using this token will immediately stop authenticating.
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setKeyToRevoke(null)}
                className="rounded-xl px-4 text-xs font-semibold"
                disabled={!!isRevoking}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmRevoke}
                disabled={!!isRevoking}
                className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 text-xs font-semibold shadow-xs"
              >
                {isRevoking ? 'Revoking...' : 'Yes, Revoke Key'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {isModalOpen && !generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in-50">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">
                    Generate New API Key
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure key identity and select authorized permission scopes.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 -mr-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Form */}
            <form action={formAction} className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
              {state?.message && !state?.success && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {/* Hidden inputs for selected scopes */}
              {selectedScopes.map(sc => (
                <input key={sc} type="hidden" name="scopes" value={sc} />
              ))}

              {/* Key Name Input */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Key Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="e.g. Production CI/CD Pipeline or Metrics Ingestor" 
                  required 
                  autoFocus 
                  className="w-full h-10 text-sm rounded-xl border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {state?.errors?.name && <p className="text-xs text-red-500">{state.errors.name[0]}</p>}
              </div>

              {/* Permission Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Permission Preset
                  </Label>
                  <span className="text-xs text-gray-500 font-medium">
                    {selectedScopes.length} of {AVAILABLE_SCOPES.length} scopes active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id as any)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-2 ring-blue-600/20 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {preset.badge}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">{preset.label}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{preset.summary}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Scopes List */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Granular Capabilities
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedScopes(AVAILABLE_SCOPES.map(s => s.id));
                        setSelectedPreset('full_access');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedScopes([]);
                        setSelectedPreset('custom');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_SCOPES.map((scope) => {
                    const isChecked = selectedScopes.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        onClick={() => handleToggleScope(scope.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked 
                            ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-500/10 shadow-2xs' 
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled by container onClick
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-xs font-semibold truncate ${isChecked ? 'text-gray-900' : 'text-gray-700'}`}>
                              {scope.name}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${
                              scope.action === 'read' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {scope.action}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                            {scope.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedScopes.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  Please select at least one permission scope to generate an API key.
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)} 
                  className="rounded-xl px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl px-5 h-10 font-semibold text-xs sm:text-sm" 
                  disabled={isPending || selectedScopes.length === 0}
                >
                  {isPending ? 'Generating...' : 'Generate Key'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Key Success Result Modal */}
      {generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">API Key Created!</h2>
                <p className="text-xs text-gray-500">Copy your secret key now. It won&apos;t be shown again.</p>
              </div>
            </div>
            
            {/* Key Copy Box */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-2.5">
              <code className="text-xs sm:text-sm font-mono text-emerald-700 font-semibold break-all select-all flex-1">
                {generatedKey}
              </code>
              <button 
                onClick={handleCopyKey}
                className="shrink-0 flex items-center gap-1 px-3 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold transition-colors shadow-2xs"
                title="Copy to clipboard"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Pingr only stores an irreversible cryptographic hash of this key. If you lose this key, you will have to revoke it and generate a new one.
              </span>
            </div>

            <Button 
              className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-xl h-10 text-xs sm:text-sm font-semibold" 
              onClick={() => {
                setGeneratedKey(null);
                setIsModalOpen(false);
                router.refresh();
              }}
            >
              I have saved my API key
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
