import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptions, plans, monitors, statusPages, apiKeys, workspaceMembers } from '@/lib/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Activity, 
  Globe, 
  Key, 
  Clock, 
  ShieldCheck, 
  MessageSquare,
  HelpCircle,
  Zap,
  ArrowUpRight,
  Users
} from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/9779863479066';

interface PlanTier {
  id: string;
  title: string;
  price: string;
  period: string;
  subtitle: string;
  badge?: string;
  isPopular?: boolean;
  limits: {
    monitors: number | string;
    minInterval: string;
    logsHistory: string;
    statusPages: number | string;
    customDomains: number | string;
    apiKeys: number | string;
    apiCalls: string;
    teamMembers: string;
  };
  features: string[];
  buttonText: string;
  whatsappMessage: string;
}

const PRICING_TIERS: PlanTier[] = [
  {
    id: 'Free',
    title: 'Free',
    price: '$0',
    period: '/month',
    subtitle: 'Free forever',
    limits: {
      monitors: 5,
      minInterval: '3 min',
      logsHistory: '100 logs',
      statusPages: 1,
      customDomains: 1,
      apiKeys: 1,
      apiCalls: '500/mo',
      teamMembers: '1 Member',
    },
    features: [
      'Up to 5 monitors',
      '3 minute minimum interval',
      '100 logs history',
      '1 Status Page & 1 Custom Domain',
      'Basic Monitors (Website, REST API, Supabase)',
      '1 API key & 500 API calls/month',
      'Email notifications',
      '1 Team Member (Admin)',
    ],
    buttonText: 'Current Plan',
    whatsappMessage: 'Hi, I have a question about the Free tier on Pingr.',
  },
  {
    id: 'Pro',
    title: 'Pro',
    price: '$12',
    period: '/month',
    subtitle: 'Price negotiable via WhatsApp',
    badge: 'Negotiable',
    isPopular: true,
    limits: {
      monitors: 50,
      minInterval: '1 min',
      logsHistory: '500 logs',
      statusPages: 5,
      customDomains: 5,
      apiKeys: 10,
      apiCalls: '50,000/mo',
      teamMembers: '5 Members',
    },
    features: [
      'Up to 50 monitors',
      '1 minute minimum interval',
      '500 logs history',
      '5 Status Pages & 5 Custom Domains',
      'Advanced Monitors (TCP, DNS, SSL)',
      '10 API keys & 50k API calls/month',
      'Webhook, Slack & Discord alerts',
      '5 Team Members',
      'Private Status Pages',
    ],
    buttonText: 'Negotiate on WhatsApp',
    whatsappMessage: 'Hi, I am interested in negotiating and upgrading to the Pro plan ($12/mo) on Pingr.',
  },
  {
    id: 'Business',
    title: 'Business',
    price: '$49',
    period: '/month',
    subtitle: 'Custom & negotiable pricing',
    badge: 'Negotiable',
    limits: {
      monitors: 250,
      minInterval: '1 min',
      logsHistory: '5,000 logs',
      statusPages: 25,
      customDomains: 25,
      apiKeys: 'Unlimited',
      apiCalls: 'Unlimited',
      teamMembers: '25 Members',
    },
    features: [
      'Up to 250 monitors',
      '1 minute minimum interval',
      '5000 logs history',
      '25 Status Pages & 25 Custom Domains',
      'Advanced Monitors (TCP, DNS, SSL)',
      'Unlimited API keys & calls',
      'All notification channels',
      '25 Team Members',
      'Remove Pingr Branding',
      'Priority support',
    ],
    buttonText: 'Negotiate on WhatsApp',
    whatsappMessage: 'Hi, I am interested in the Business plan ($49/mo) on Pingr.',
  },
  {
    id: 'Enterprise',
    title: 'Enterprise',
    price: "Let's Talk",
    period: '',
    subtitle: 'Tailored for large scale',
    badge: 'Custom',
    limits: {
      monitors: '1,000+',
      minInterval: '30 sec',
      logsHistory: '20,000 logs',
      statusPages: '100+',
      customDomains: '100+',
      apiKeys: 'Unlimited',
      apiCalls: 'Unlimited',
      teamMembers: 'Unlimited',
    },
    features: [
      '1000+ monitors',
      '30 second intervals',
      '20,000 logs history',
      '100+ Status Pages & Domains',
      'Advanced Monitors (TCP, DNS, SSL)',
      'Unlimited API keys & calls',
      'All notification channels',
      'Unlimited Team Members',
      'Custom Branding & SSO',
      '24/7 Dedicated Support & SLA',
    ],
    buttonText: 'Contact Sales',
    whatsappMessage: 'Hi, I am interested in an Enterprise custom plan on Pingr.',
  },
];

export default async function BillingPage() {
  const user = await requireAuth();

  // Fetch user's current subscription and active usage counts
  const [
    userMonitors,
    userStatusPages,
    userApiKeys,
    userTeamMembers,
    [subResult],
  ] = await Promise.all([
    db.select({ id: monitors.id }).from(monitors).where(eq(monitors.workspaceId, user.id)),
    db.select({ id: statusPages.id, customDomain: statusPages.customDomain }).from(statusPages).where(eq(statusPages.workspaceId, user.id)),
    db.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.workspaceId, user.id), isNull(apiKeys.revokedAt))),
    db.select({ id: workspaceMembers.id }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, user.id)),
    db
      .select({ 
        planName: plans.name,
        maxMonitors: plans.maxMonitors,
        minIntervalSeconds: plans.minIntervalSeconds,
        logRetentionCount: plans.logRetentionCount,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.workspaceId, user.id))
      .limit(1),
  ]);

  const currentPlan = subResult?.planName || 'Free';
  const validUntil = subResult?.endDate;

  // Usage numbers
  const monitorsCount = userMonitors.length;
  const statusPagesCount = userStatusPages.length;
  const customDomainsCount = userStatusPages.filter(p => !!p.customDomain).length;
  const apiKeysCount = userApiKeys.length;
  const teamMembersCount = 1 + userTeamMembers.length; // 1 (Owner) + members

  const currentTierInfo = PRICING_TIERS.find(t => t.id === currentPlan) || PRICING_TIERS[0];
  const maxMonitors = typeof currentTierInfo.limits.monitors === 'number' ? currentTierInfo.limits.monitors : 1000;
  const maxStatusPages = typeof currentTierInfo.limits.statusPages === 'number' ? currentTierInfo.limits.statusPages : 100;
  const maxCustomDomains = typeof currentTierInfo.limits.customDomains === 'number' ? currentTierInfo.limits.customDomains : 100;
  const maxApiKeys = typeof currentTierInfo.limits.apiKeys === 'number' ? currentTierInfo.limits.apiKeys : 100;
  const maxTeamMembers = currentPlan === 'Free' ? 1 : currentPlan === 'Pro' ? 5 : currentPlan === 'Business' ? 25 : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Transparent, negotiable plans matching Pingr&apos;s landing page specifications.
        </p>
      </div>

      {/* WhatsApp Notice Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 text-[#128C7E] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-[#128C7E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-emerald-950">Direct WhatsApp Billing & Flexible Negotiation</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 uppercase">
                Instant Activation
              </span>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              All upgrades, renewals, and custom monitoring limits are negotiable directly with our founders via WhatsApp at{' '}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-emerald-950">
                +977 9863479066
              </a>
              . Payment via bank transfer, digital wallets, PayPal, or crypto.
            </p>
          </div>
        </div>

        <a 
          href={WHATSAPP_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] transition-colors shrink-0 shadow-xs"
        >
          Chat on WhatsApp <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* CURRENT SUBSCRIPTION & RESOURCE USAGE OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Subscription Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Your Active Plan</p>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{currentPlan}</h3>
                {validUntil && currentPlan !== 'Free' ? (
                  <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                    Valid until {new Date(validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">No expiration • Free forever</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100 mt-4">
            <a 
              href={`${WHATSAPP_URL}?text=Hi%2C%20I%20want%20to%20upgrade%20or%20customize%20my%20Pingr%20plan%20(Current%3A%20${currentPlan})`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#128C7E] transition-colors shadow-2xs"
            >
              Negotiate Plan on WhatsApp
            </a>
          </div>
        </div>

        {/* Real-time Usage Meters */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Plan Resource Usage</h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Limits enforced strictly by current tier
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Monitors Usage */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" /> Monitors
                </span>
                <span className="font-bold text-gray-900">
                  {monitorsCount} / {currentTierInfo.limits.monitors}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    monitorsCount >= maxMonitors ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, (monitorsCount / maxMonitors) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {currentPlan === 'Free' ? '5 monitors limit on Free tier' : 'Includes advanced TCP/DNS/SSL'}
              </p>
            </div>

            {/* Custom Domains Usage */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" /> Custom Domains
                </span>
                <span className="font-bold text-gray-900">
                  {customDomainsCount} / {currentTierInfo.limits.customDomains}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (customDomainsCount / maxCustomDomains) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {customDomainsCount >= maxCustomDomains ? 'Domain limit reached' : 'Free tier allows 1 custom domain'}
              </p>
            </div>

            {/* API Keys Usage */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-600" /> Active API Keys
                </span>
                <span className="font-bold text-gray-900">
                  {apiKeysCount} / {currentTierInfo.limits.apiKeys}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (apiKeysCount / maxApiKeys) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {currentPlan === 'Free' ? '1 key with 500 calls/month' : '10 keys on Pro, Unlimited on Business'}
              </p>
            </div>

            {/* Team Members */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Team Members
                </span>
                <span className="font-bold text-gray-900">
                  {teamMembersCount} / {currentTierInfo.limits.teamMembers}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (teamMembersCount / maxTeamMembers) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {currentPlan === 'Free' ? '1 member (Owner) on Free. 5 on Pro.' : 'Shared monitor collaboration active'}
              </p>
            </div>

            {/* Check Interval */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Minimum Interval
                </span>
                <span className="font-bold text-gray-900">
                  {currentTierInfo.limits.minInterval}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 pt-1">
                {currentPlan === 'Free'
                  ? '3m interval on Free. Upgrade to Pro for 60s checks.'
                  : currentPlan === 'Enterprise'
                  ? '30 second ultra-fast checks active.'
                  : '1 minute fast check frequency enabled.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ALL 4 PLANS GRID (MATCHING LANDING PAGE) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">All Available Plans</h2>
          <p className="text-xs text-gray-500">Pick the tier that fits your infrastructure needs or negotiate custom specs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.id;
            const isPro = tier.id === 'Pro';

            return (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                  isPro
                    ? 'border-2 border-blue-600 shadow-lg shadow-blue-500/10 ring-1 ring-blue-600/20'
                    : 'border border-gray-200 shadow-xs hover:border-gray-300'
                }`}
              >
                {/* Popular or Negotiable Badges */}
                {isPro && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider py-1 px-3 rounded-full shadow-xs">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{tier.title}</h3>
                    {tier.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isPro ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {tier.badge}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{tier.price}</span>
                      {tier.period && <span className="text-xs text-gray-500 font-medium">{tier.period}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{tier.subtitle}</p>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2.5 pt-4 border-t border-gray-100 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-xs text-gray-700 leading-snug">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action Button */}
                <div className="pt-4 border-t border-gray-100">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full inline-flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold border border-gray-200 bg-gray-100 text-gray-500 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <a
                      href={`${WHATSAPP_URL}?text=${encodeURIComponent(tier.whatsappMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full inline-flex items-center justify-center h-10 px-4 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isPro
                          ? 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                          : 'bg-gray-900 hover:bg-black text-white'
                      }`}
                    >
                      {tier.buttonText}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BILLING FAQ & IMPORTANT DETAILS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-gray-900">Billing & Upgrade Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600 pt-2">
          <div className="space-y-1.5">
            <h4 className="font-bold text-gray-900">How do plan upgrades work?</h4>
            <p className="leading-relaxed">
              Pingr operates with manual, founder-assisted billing via WhatsApp. When you message us, we activate your requested plan immediately with receipt confirmation.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-gray-900">Can I negotiate custom monitor quotas?</h4>
            <p className="leading-relaxed">
              Yes! If you need 80 monitors, 30-second intervals, or specific webhook volumes between standard tiers, we tailor custom packages via WhatsApp.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-gray-900">Accepted Payment Methods</h4>
            <p className="leading-relaxed">
              We support direct Bank Transfers, eSewa, Khalti, PayPal, Wise, and cryptocurrency payments upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
