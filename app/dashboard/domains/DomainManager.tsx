'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Server,
  Lock,
  Activity,
  Zap,
  Search,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  verifyCustomDomain,
  removeCustomDomain,
  addCustomDomain,
  detectDomainDns,
  updateStatusPageComponents,
} from '@/lib/status-pages/actions';
import { normalizeDomain } from '@/lib/domains/validation';
import { toast } from 'sonner';

function getApexDomain(domain: string): string {
  const parts = domain.toLowerCase().trim().split('.');
  if (parts.length <= 2) return domain;
  const secondLevelTlds = ['co.uk', 'com.au', 'co.nz', 'com.br', 'co.jp', 'com.tr', 'co.za'];
  const lastTwo = parts.slice(-2).join('.');
  if (secondLevelTlds.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

function getRegistrarConsoleUrl(domain: string, providerName?: string): { url: string; label: string } {
  const rootDomain = getApexDomain(domain);
  const p = (providerName || '').toLowerCase();

  if (p.includes('cloudflare')) {
    return { url: 'https://dash.cloudflare.com', label: 'Cloudflare' };
  }
  if (p.includes('godaddy')) {
    return { url: `https://dcc.godaddy.com/manage/${rootDomain}/dns`, label: 'GoDaddy' };
  }
  if (p.includes('namecheap')) {
    return { url: `https://ap.www.namecheap.com/domains/domaincontrolpanel/${rootDomain}/advancedns`, label: 'Namecheap' };
  }
  if (p.includes('route 53') || p.includes('amazon') || p.includes('aws')) {
    return { url: 'https://us-east-1.console.aws.amazon.com/route53/v2/home#Dashboard', label: 'AWS Route 53' };
  }
  if (p.includes('google')) {
    return { url: 'https://console.cloud.google.com/net-services/dns/zones', label: 'Google Cloud DNS' };
  }
  if (p.includes('digitalocean')) {
    return { url: 'https://cloud.digitalocean.com/networking/domains', label: 'DigitalOcean' };
  }
  if (p.includes('hostinger')) {
    return { url: 'https://hpanel.hostinger.com/dns-zone', label: 'Hostinger' };
  }
  if (p.includes('vercel')) {
    return {
      url: `https://vercel.com/dashboard/domains/${rootDomain}/dns`,
      label: 'Vercel DNS Console',
    };
  }
  if (p.includes('squarespace')) {
    return { url: 'https://account.squarespace.com/domains', label: 'Squarespace' };
  }
  if (p.includes('porkbun')) {
    return { url: 'https://porkbun.com/account/domains', label: 'Porkbun' };
  }
  if (p.includes('ovh')) {
    return { url: 'https://www.ovh.com/manager/', label: 'OVHcloud' };
  }
  if (p.includes('hetzner')) {
    return { url: 'https://dns.hetzner.com/', label: 'Hetzner' };
  }
  if (p.includes('bluehost')) {
    return { url: 'https://my.bluehost.com/hosting/cpanel', label: 'Bluehost' };
  }

  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`${providerName || 'domain'} DNS management ${rootDomain}`)}`,
    label: providerName || 'DNS Registrar',
  };
}

interface DomainManagerProps {
  initialDomains?: any[];
  initialStatusPage?: any;
  allMonitors?: any[];
}

export function DomainManager({
  initialDomains,
  initialStatusPage,
  allMonitors = [],
}: DomainManagerProps) {
  // Normalize incoming domain list
  const [domains, setDomains] = useState<any[]>(() => {
    if (initialDomains && initialDomains.length > 0) return initialDomains;
    if (initialStatusPage) return [initialStatusPage];
    return [];
  });

  // Track connected components/monitors for each domain
  const [domainComponents, setDomainComponents] = useState<
    Record<string, { monitorId: string; groupName: string; position: number }[]>
  >(() => {
    const map: Record<string, { monitorId: string; groupName: string; position: number }[]> = {};
    if (initialDomains) {
      initialDomains.forEach((d) => {
        map[d.id] = d.components || [];
      });
    }
    return map;
  });

  // Track which domain currently has "Add Monitors" picker open
  const [addingMonitorsDomainId, setAddingMonitorsDomainId] = useState<string | null>(null);
  const [selectedMonitorIdToAdd, setSelectedMonitorIdToAdd] = useState('');
  const [newMonitorGroupName, setNewMonitorGroupName] = useState('Core');

  // Track whether reference DNS details are expanded for verified domains
  const [showDnsDetails, setShowDnsDetails] = useState<Record<string, boolean>>({});

  const toggleShowDnsDetails = (id: string) => {
    setShowDnsDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAddingMonitors = (domainId: string) => {
    setAddingMonitorsDomainId((prev) => {
      if (prev === domainId) {
        return null;
      }
      setSelectedMonitorIdToAdd('');
      setNewMonitorGroupName('Core');
      return domainId;
    });
  };

  // Remove monitor from domain status page
  const handleRemoveMonitorFromDomain = async (pageId: string, monitorId: string) => {
    const currentList = domainComponents[pageId] || [];
    const updatedList = currentList.filter((c) => c.monitorId !== monitorId);
    setDomainComponents((prev) => ({ ...prev, [pageId]: updatedList }));

    try {
      await updateStatusPageComponents(
        pageId,
        updatedList.map((c, i) => ({
          monitorId: c.monitorId,
          groupName: c.groupName,
          position: i,
        }))
      );
      toast.success('Monitor removed from this status page');
    } catch (err: any) {
      setDomainComponents((prev) => ({ ...prev, [pageId]: currentList }));
      toast.error(err.message || 'Failed to remove monitor');
    }
  };

  // Add monitor to domain status page
  const handleAddMonitorToDomain = async (
    pageId: string,
    monitorId: string,
    groupName: string = 'Core Services'
  ) => {
    const currentList = domainComponents[pageId] || [];
    if (currentList.some((c) => c.monitorId === monitorId)) return;

    const updatedList = [
      ...currentList,
      { monitorId, groupName, position: currentList.length },
    ];
    setDomainComponents((prev) => ({ ...prev, [pageId]: updatedList }));

    try {
      await updateStatusPageComponents(
        pageId,
        updatedList.map((c, i) => ({
          monitorId: c.monitorId,
          groupName: c.groupName,
          position: i,
        }))
      );
      toast.success('Monitor added to this status page');
    } catch (err: any) {
      setDomainComponents((prev) => ({ ...prev, [pageId]: currentList }));
      toast.error(err.message || 'Failed to add monitor');
    }
  };

  // Filter list of domains that have a custom domain configured
  const configuredDomains = domains.filter((d) => Boolean(d.customDomain));

  // Expanded details state per domain (accordion)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    if (configuredDomains.length > 0) {
      return { [configuredDomains[0].id]: true };
    }
    return {};
  });

  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [scanningDomainId, setScanningDomainId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Automated DNS detection state map keyed by domain name
  const [dnsDetectionMap, setDnsDetectionMap] = useState<
    Record<
      string,
      { provider: string; nameservers: string[]; cnameFound: boolean; loading: boolean }
    >
  >({});

  // Copy feedback state tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (key: string, text: string, successMessage: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(successMessage);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Run nameserver and DNS auto-detection for a specific domain
  const runDnsDetectionForDomain = async (domainName: string) => {
    if (!domainName) return;
    setDnsDetectionMap((prev) => ({
      ...prev,
      [domainName]: {
        provider: prev[domainName]?.provider || 'Scanning authoritative NS...',
        nameservers: prev[domainName]?.nameservers || [],
        cnameFound: prev[domainName]?.cnameFound || false,
        loading: true,
      },
    }));

    try {
      const res = await detectDomainDns(domainName);
      setDnsDetectionMap((prev) => ({
        ...prev,
        [domainName]: {
          provider: res.provider,
          nameservers: res.nameservers,
          cnameFound: res.cnameFound,
          loading: false,
        },
      }));
    } catch {
      setDnsDetectionMap((prev) => ({
        ...prev,
        [domainName]: {
          provider: 'Standard DNS Provider',
          nameservers: [],
          cnameFound: false,
          loading: false,
        },
      }));
    }
  };

  // Run detection for expanded domains on mount
  useEffect(() => {
    configuredDomains.forEach((d) => {
      if (expandedIds[d.id] && !dnsDetectionMap[d.customDomain]) {
        runDnsDetectionForDomain(d.customDomain);
      }
    });
  }, [configuredDomains, expandedIds]);

  // Add domain submission handler
  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeDomain(newDomainInput);
    if (!clean) {
      toast.error('Please enter a valid domain (e.g. status.yourcompany.com)');
      return;
    }

    startTransition(async () => {
      try {
        const newPage = await addCustomDomain(clean);
        setDomains((prev) => {
          const exists = prev.some((d) => d.id === newPage.id);
          if (exists) {
            return prev.map((d) => (d.id === newPage.id ? newPage : d));
          }
          return [newPage, ...prev];
        });
        setDomainComponents((prev) => ({ ...prev, [newPage.id]: (newPage as any).components || [] }));
        setExpandedIds((prev) => ({ ...prev, [newPage.id]: true }));
        setNewDomainInput('');
        setIsAddingDomain(false);
        runDnsDetectionForDomain(clean);
        toast.success(`Domain ${clean} added! Auto-configuring DNS records.`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to add custom domain');
      }
    });
  };

  // Verify / Auto-configure specific domain
  const handleVerifyDomain = async (pageId: string, domainName: string) => {
    setVerifyingId(pageId);
    try {
      const res = await verifyCustomDomain(pageId);
      setDomains((prev) =>
        prev.map((d) =>
          d.id === pageId
            ? { ...d, customDomainStatus: res.status, customDomainError: res.error || null }
            : d
        )
      );

      if (res.status === 'active') {
        toast.success(`Domain ${domainName} is verified and active!`);
      } else if (res.status === 'verified') {
        toast.info(res.message || 'Ownership verified! CNAME is still propagating.');
      } else {
        toast.error(res.error || 'Verification failed. Please check DNS records.');
      }
      runDnsDetectionForDomain(domainName);
    } catch (err: any) {
      toast.error(err.message || 'DNS check failed');
    } finally {
      setVerifyingId(null);
    }
  };

  // 1-Click Auto-Configure with Edge Auto-Provisioning & Live Background Polling
  const startAutoConfigureAndOpenRegistrar = async (
    pageId: string,
    domainName: string,
    providerName?: string,
    token?: string
  ) => {
    setVerifyingId(pageId);
    const toastId = toast.loading(`Auto-configuring ${domainName}...`);

    try {
      // Step 1: Check if domain can be auto-configured directly via Edge/API integration
      const res = await verifyCustomDomain(pageId);
      if (res.status === 'active') {
        toast.dismiss(toastId);
        toast.success(`🎉 ${domainName} is auto-configured and active! Edge routing and SSL are live.`, {
          duration: 5000,
        });
        setDomains((prev) =>
          prev.map((d) =>
            d.id === pageId
              ? { ...d, customDomainStatus: 'active', customDomainError: null }
              : d
          )
        );
        runDnsDetectionForDomain(domainName);
        setVerifyingId(null);
        return; // Fully provisioned! No external tab redirect needed.
      }
    } catch {
      // Fall through to external registrar flow
    } finally {
      toast.dismiss(toastId);
      setVerifyingId(null);
    }

    // Step 2: For external registrars that require manual DNS records, deep link to their exact domain DNS page
    const root = getApexDomain(domainName);
    const isApex = domainName === root;
    const subdomain = isApex ? '@' : domainName.split('.')[0];
    const txtHost = `_pingr-verification.${domainName}`;
    const target = 'cname.pingr.site';
    const registrar = getRegistrarConsoleUrl(domainName, providerName);

    // Format all DNS records cleanly for clipboard
    const dnsSummary = `Pingr DNS Configuration for ${domainName}:\n\n1. TXT Record (Ownership Verification):\n   Type: TXT\n   Host/Name: ${txtHost}\n   Value: ${token || 'pingr_verify_...'}\n\n2. CNAME Record (Routing):\n   Type: CNAME\n   Host/Name: ${subdomain}\n   Target: ${target}\n   TTL: Auto / 300`;

    try {
      await navigator.clipboard.writeText(dnsSummary);
    } catch {
      // Ignore clipboard failure in restricted iframe/browser environments
    }

    // Launch registrar console directly in new tab
    window.open(registrar.url, '_blank', 'noopener,noreferrer');

    toast.success(`DNS records copied! Opening ${registrar.label}...`, {
      description: 'Paste the records into your registrar. Background scanner is now listening for DNS saves.',
      duration: 6000,
    });

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setScanningDomainId(pageId);

    let attempts = 0;
    const maxAttempts = 35; // 35 * 4s = 140s

    pollingIntervalRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await verifyCustomDomain(pageId);
        if (res.status === 'active' || res.status === 'verified') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanningDomainId(null);
          setDomains((prev) =>
            prev.map((d) =>
              d.id === pageId
                ? { ...d, customDomainStatus: res.status, customDomainError: null }
                : d
            )
          );
          runDnsDetectionForDomain(domainName);
          toast.success(`🎉 DNS Verified! ${domainName} is now live.`);
        } else if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanningDomainId(null);
          toast.info(
            'Auto-scanning paused. DNS changes can take a few minutes to propagate worldwide. You can click Auto-Configure anytime to resume.'
          );
        }
      } catch {
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setScanningDomainId(null);
        }
      }
    }, 4000);
  };

  const stopScanning = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setScanningDomainId(null);
    toast.info('Background DNS scanning stopped.');
  };

  // Remove specific domain
  const handleRemoveDomain = async (pageId: string, domainName: string) => {
    if (scanningDomainId === pageId) {
      stopScanning();
    }
    if (!confirm(`Are you sure you want to remove ${domainName}?`)) return;

    startTransition(async () => {
      try {
        await removeCustomDomain(pageId);
        setDomains((prev) => {
          if (prev.length > 1) {
            return prev.filter((d) => d.id !== pageId);
          }
          return prev.map((d) =>
            d.id === pageId
              ? {
                  ...d,
                  customDomain: null,
                  customDomainStatus: 'none',
                  customDomainVerificationToken: null,
                  customDomainVerificationTxt: null,
                  customDomainError: null,
                }
              : d
          );
        });
        toast.success(`Domain ${domainName} removed`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to remove domain');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Active & Secured
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-3.5 h-3.5 text-blue-600" />
            Verified
          </span>
        );
      case 'verifying':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            Verifying...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            DNS Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending DNS
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Domains & DNS
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Connect a custom domain to your status page with automatic SSL certificates and edge routing.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddingDomain(!isAddingDomain)}
          className={`text-xs font-semibold h-8 md:h-9 px-3 md:px-4 rounded-lg transition-all shadow-xs shrink-0 flex items-center gap-1.5 ${
            isAddingDomain
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isAddingDomain ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </>
          )}
        </Button>
      </div>

      {/* Animated Sliding Panel for Adding Domain */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isAddingDomain
            ? 'max-h-[400px] opacity-100 scale-100 mb-6'
            : 'max-h-0 opacity-0 scale-98 mb-0 pointer-events-none'
        }`}
      >
        <form
          onSubmit={handleAddDomain}
          className="pb-6 pt-2 border-b border-gray-200 space-y-3.5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Connect Custom Domain
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter your fully qualified domain or subdomain (e.g.{' '}
                <span className="font-mono text-gray-800 font-medium">status.yourcompany.com</span>).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAddingDomain(false);
                setNewDomainInput('');
              }}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-2xl">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="status.yourcompany.com"
                  required
                  autoFocus={isAddingDomain}
                  className="text-xs font-mono pl-9 h-10 bg-white border-gray-300 focus-visible:ring-blue-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isPending || !newDomainInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 px-5 shrink-0 shadow-xs"
              >
                {isPending ? 'Connecting...' : 'Connect Domain'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsAddingDomain(false);
                  setNewDomainInput('');
                }}
                className="text-xs h-10 px-3 text-gray-500 hover:text-gray-800"
              >
                Cancel
              </Button>
            </div>

            {newDomainInput.trim() && (
              <p className="text-[11px] text-gray-500 font-mono">
                Target Hostname:{' '}
                <span className="text-blue-600 font-semibold">
                  {normalizeDomain(newDomainInput) || 'invalid domain'}
                </span>
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Empty State when no domains configured */}
      {configuredDomains.length === 0 && !isAddingDomain && (
        <div className="p-10 rounded-2xl border border-dashed border-gray-200 text-center bg-gray-50/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <Globe className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-semibold text-gray-900">No custom domains connected</h3>
            <p className="text-xs text-gray-500 mt-1">
              Connect your branded custom domain (e.g. status.yourcompany.com) to serve your public status page with automated SSL.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddingDomain(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-9 px-4 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Connect Custom Domain
          </Button>
        </div>
      )}

      {/* MULTIPLE DOMAINS ACCORDION CONTAINER LIST */}
      {configuredDomains.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Connected Domains ({configuredDomains.length})
            </span>
            <span className="text-[11px] text-gray-400">
              Click any domain to manage connected monitors & settings
            </span>
          </div>

          <div className="space-y-3">
            {configuredDomains.map((d) => {
              const isExpanded = !!expandedIds[d.id];
              const isVerifying = verifyingId === d.id;
              const isDomainVerified =
                d.customDomainStatus === 'active' || d.customDomainStatus === 'verified';
              const detection = dnsDetectionMap[d.customDomain] || {
                provider: 'Scanning authoritative NS...',
                nameservers: [],
                cnameFound: false,
                loading: false,
              };

              const subdomainHost =
                d.customDomain.split('.').length > 2
                  ? d.customDomain.split('.')[0]
                  : '@';
              const verificationTxt =
                d.customDomainVerificationTxt || `_pingr-verification.${d.customDomain}`;

              const connectedMonitors = domainComponents[d.id] || [];
              const connectedMonitorIds = new Set(connectedMonitors.map((c) => c.monitorId));
              const availableToAdd = allMonitors.filter((m) => !connectedMonitorIds.has(m.id));
              const isAddingForThisDomain = addingMonitorsDomainId === d.id;
              const isDnsRefOpen = !!showDnsDetails[d.id];

              return (
                <div
                  key={d.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs transition-all"
                >
                  {/* Domain Header Row */}
                  <div
                    onClick={() => {
                      toggleExpand(d.id);
                      if (!dnsDetectionMap[d.customDomain]) {
                        runDnsDetectionForDomain(d.customDomain);
                      }
                    }}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/60 transition-colors select-none"
                  >
                    {/* Left: Domain Name & Status Badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDomainVerified
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900 truncate">
                            {d.customDomain}
                          </span>
                          {getStatusBadge(d.customDomainStatus)}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Target: <span className="font-mono text-gray-600">cname.pingr.site</span> • Edge SSL
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions and Expand Chevron */}
                    <div
                      className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDomainVerified && (
                        <a
                          href={`https://${d.customDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Open live site"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyDomain(d.id, d.customDomain)}
                        disabled={isVerifying}
                        className="text-xs h-8 px-2.5 flex items-center gap-1.5 border-gray-200"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${isVerifying ? 'animate-spin text-blue-600' : 'text-gray-500'}`}
                        />
                        <span>{isVerifying ? 'Checking...' : 'Verify DNS'}</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(d.id, d.customDomain)}
                        disabled={isPending}
                        className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove domain"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Details Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleExpand(d.id);
                          if (!dnsDetectionMap[d.customDomain]) {
                            runDnsDetectionForDomain(d.customDomain);
                          }
                        }}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-1"
                        title={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Details Container */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50/40 space-y-4">
                      {isDomainVerified ? (
                        <div className="space-y-4">
                          {/* Connected Monitors Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-900">
                                  Connected Monitors
                                </span>
                                <span className="text-[11px] text-gray-500 font-medium">
                                  ({connectedMonitors.length})
                                </span>
                              </div>

                              {!isAddingForThisDomain && availableToAdd.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleAddingMonitors(d.id)}
                                  className="text-xs h-7 px-2.5 flex items-center gap-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Monitor</span>
                                </Button>
                              )}
                            </div>

                            {/* Inline Add Monitor Bar */}
                            {isAddingForThisDomain && (
                              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <select
                                  value={selectedMonitorIdToAdd}
                                  onChange={(e) => setSelectedMonitorIdToAdd(e.target.value)}
                                  className="text-xs bg-white border border-gray-300 rounded-md px-2.5 py-1.5 flex-1 min-w-0 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">Select a monitor to connect...</option>
                                  {availableToAdd.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.target})
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  value={newMonitorGroupName}
                                  onChange={(e) => setNewMonitorGroupName(e.target.value)}
                                  placeholder="Group (e.g. Core)"
                                  className="text-xs bg-white border border-gray-300 rounded-md px-2.5 py-1.5 w-full sm:w-36 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                  <Button
                                    size="sm"
                                    disabled={!selectedMonitorIdToAdd}
                                    onClick={() => {
                                      if (selectedMonitorIdToAdd) {
                                        handleAddMonitorToDomain(d.id, selectedMonitorIdToAdd, newMonitorGroupName);
                                        setSelectedMonitorIdToAdd('');
                                      }
                                    }}
                                    className="text-xs h-7 px-3 bg-gray-900 text-white hover:bg-gray-800"
                                  >
                                    Add
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddingMonitorsDomainId(null)}
                                    className="text-xs h-7 px-2 text-gray-500"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Connected Monitors List */}
                            {connectedMonitors.length === 0 ? (
                              <div className="py-6 text-center text-xs text-gray-400 bg-white rounded-lg border border-gray-200 border-dashed">
                                No monitors connected to this status page yet.
                                {availableToAdd.length > 0 && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleAddingMonitors(d.id)}
                                      className="text-xs h-7 px-2.5"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Connect Monitor
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                                {connectedMonitors.map((comp) => {
                                  const mon = allMonitors.find((m) => m.id === comp.monitorId);
                                  return (
                                    <div
                                      key={comp.monitorId}
                                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span
                                          className={`w-2 h-2 rounded-full shrink-0 ${
                                            mon?.status === 'up'
                                              ? 'bg-emerald-500'
                                              : mon?.status === 'down'
                                              ? 'bg-rose-500'
                                              : mon?.status === 'degraded'
                                              ? 'bg-amber-500'
                                              : 'bg-gray-300'
                                          }`}
                                          title={mon?.status || 'Unknown status'}
                                        />
                                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-medium text-gray-900 truncate">
                                            {mon?.name || `Monitor ${comp.monitorId.substring(0, 8)}`}
                                          </span>
                                          <span className="text-[10px] text-gray-400 font-mono truncate max-w-xs">
                                            {mon?.target}
                                          </span>
                                          <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                            {comp.groupName || 'Core'}
                                          </span>
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMonitorFromDomain(d.id, comp.monitorId)}
                                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors shrink-0"
                                        title="Remove monitor from this status page"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Collapsible DNS Reference for Verified Domain */}
                          <div className="pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => toggleShowDnsDetails(d.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors font-medium py-0.5"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isDnsRefOpen ? 'rotate-180' : ''
                                }`}
                              />
                              <span>DNS Configuration Reference</span>
                            </button>

                            {isDnsRefOpen && (
                              <div className="mt-2 space-y-2">
                                <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden text-xs">
                                  {/* TXT Row */}
                                  <div className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="font-mono text-[10px] text-gray-500 sm:w-16 font-semibold">
                                      TXT
                                    </span>
                                    <span className="flex-1 font-mono text-[11px] text-gray-700 truncate">
                                      {verificationTxt}
                                    </span>
                                    <span className="flex-1 font-mono text-[11px] text-gray-700 truncate">
                                      {d.customDomainVerificationToken}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(
                                          `txt-val-${d.id}`,
                                          d.customDomainVerificationToken || '',
                                          'TXT copied'
                                        )
                                      }
                                      className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                      title="Copy token"
                                    >
                                      {copiedKey === `txt-val-${d.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  {/* CNAME Row */}
                                  <div className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="font-mono text-[10px] text-gray-500 sm:w-16 font-semibold">
                                      CNAME
                                    </span>
                                    <span className="flex-1 font-mono text-[11px] text-gray-700 truncate">
                                      {subdomainHost}
                                    </span>
                                    <span className="flex-1 font-mono text-[11px] text-blue-600 font-medium truncate">
                                      cname.pingr.site
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(
                                          `cname-val-${d.id}`,
                                          'cname.pingr.site',
                                          'CNAME copied'
                                        )
                                      }
                                      className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                      title="Copy target"
                                    >
                                      {copiedKey === `cname-val-${d.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Diagnostic Alert if error */}
                          {d.customDomainError && (
                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-semibold">DNS Diagnostic Error:</span>
                                <p className="font-mono text-rose-800 text-[11px] break-all">
                                  {d.customDomainError}
                                </p>
                                <p className="text-[11px] text-rose-700 pt-0.5">
                                  Please ensure your DNS records point to the values below.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Required DNS Records Table */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-900">
                                  Required DNS Records
                                </span>
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                  Account-wide TXT token
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const summary = `DNS Records for ${d.customDomain}:\nTXT Host: ${verificationTxt}\nTXT Value: ${d.customDomainVerificationToken}\nCNAME Host: ${subdomainHost}\nCNAME Target: cname.pingr.site`;
                                  handleCopy(`all-rec-${d.id}`, summary, 'All DNS records copied to clipboard');
                                }}
                                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                {copiedKey === `all-rec-${d.id}` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy All Records</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden text-xs shadow-2xs">
                              {/* TXT Row */}
                              <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-2 sm:w-24 shrink-0">
                                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                    TXT
                                  </span>
                                  <span className="text-[11px] font-medium text-gray-500">Ownership</span>
                                </div>

                                <div className="flex-1 font-mono text-gray-800 break-all text-[11px] flex items-center justify-between gap-2 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                  <span className="truncate">{verificationTxt}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(
                                        `txt-host-${d.id}`,
                                        verificationTxt,
                                        'TXT Host copied'
                                      )
                                    }
                                    className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                    title="Copy host"
                                  >
                                    {copiedKey === `txt-host-${d.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                <div className="flex-1 font-mono text-gray-800 break-all text-[11px] flex items-center justify-between gap-2 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                  <span className="truncate">{d.customDomainVerificationToken || 'pending...'}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(
                                        `txt-val-${d.id}`,
                                        d.customDomainVerificationToken || '',
                                        'TXT Value copied'
                                      )
                                    }
                                    className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                    title="Copy value"
                                  >
                                    {copiedKey === `txt-val-${d.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* CNAME Row */}
                              <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-2 sm:w-24 shrink-0">
                                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    CNAME
                                  </span>
                                  <span className="text-[11px] font-medium text-gray-500">Routing</span>
                                </div>

                                <div className="flex-1 font-mono text-gray-800 break-all text-[11px] flex items-center justify-between gap-2 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                  <span>{subdomainHost}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(
                                        `cname-host-${d.id}`,
                                        subdomainHost,
                                        'CNAME Host copied'
                                      )
                                    }
                                    className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                    title="Copy host"
                                  >
                                    {copiedKey === `cname-host-${d.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                <div className="flex-1 font-mono text-blue-700 font-semibold break-all text-[11px] flex items-center justify-between gap-2 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                  <span>cname.pingr.site</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(
                                        `cname-val-${d.id}`,
                                        'cname.pingr.site',
                                        'CNAME Target copied'
                                      )
                                    }
                                    className="text-gray-400 hover:text-gray-700 p-0.5 shrink-0"
                                    title="Copy target"
                                  >
                                    {copiedKey === `cname-val-${d.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Auto-Configured Nameserver & Edge Box */}
                          <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 space-y-3.5 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-100">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="p-1 rounded-md bg-blue-600 text-white">
                                    <Zap className="w-3.5 h-3.5" />
                                  </span>
                                  <h4 className="text-xs font-bold text-gray-900">
                                    Auto-Configure & Registrar Connect
                                  </h4>
                                </div>
                                <p className="text-[11px] text-gray-500">
                                  Open your DNS registrar in 1-click with pre-copied records. Background scanner auto-activates when saved.
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    startAutoConfigureAndOpenRegistrar(
                                      d.id,
                                      d.customDomain,
                                      detection.provider,
                                      d.customDomainVerificationToken
                                    )
                                  }
                                  disabled={isVerifying || scanningDomainId === d.id}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5"
                                >
                                  {scanningDomainId === d.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Scanning Live DNS...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Auto-Configure on {detection.provider && !detection.loading ? detection.provider.split(' ')[0] : 'Registrar'}</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVerifyDomain(d.id, d.customDomain)}
                                  disabled={isVerifying || scanningDomainId === d.id}
                                  className="text-xs h-8 px-2.5 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                                  title="Check DNS status immediately"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                                  <span>Check Now</span>
                                </Button>
                              </div>
                            </div>

                            {/* Live Background Scanning Banner */}
                            {scanningDomainId === d.id && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 animate-pulse">
                                <div className="flex items-center gap-2 text-xs">
                                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                                  <div>
                                    <span className="font-semibold">Auto-detecting DNS changes...</span>
                                    <span className="text-gray-500 ml-1 hidden sm:inline">
                                      Polling {detection.provider || 'DNS'} every 4s. Domain becomes active automatically once records propagate.
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={stopScanning}
                                  className="h-7 text-xs border-blue-300 text-blue-800 hover:bg-blue-100 shrink-0"
                                >
                                  Stop Scanning
                                </Button>
                              </div>
                            )}

                            {/* Nameserver & Provider Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Detected DNS Provider
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Auto-Detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="font-bold text-gray-900 truncate">
                                    {detection.loading
                                      ? 'Querying nameservers...'
                                      : detection.provider}
                                  </span>
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Authoritative Nameservers
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => runDnsDetectionForDomain(d.customDomain)}
                                    className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Refresh NS
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 pt-0.5 min-w-0">
                                  <Server className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span className="font-mono text-[11px] text-gray-700 truncate">
                                    {detection.loading
                                      ? 'Looking up NS records...'
                                      : detection.nameservers.length > 0
                                      ? detection.nameservers.join(', ')
                                      : 'Authoritative nameservers active'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
