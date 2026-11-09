import Link from 'next/link';
import { Activity } from 'lucide-react';

export const DOCS_NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs', label: 'Introduction' },
    ]
  },
  {
    title: 'Core Concepts',
    links: [
      { href: '/docs/authentication', label: 'Authentication' },
      { href: '/docs/api-keys', label: 'API Keys' },
      { href: '/docs/rate-limits', label: 'Rate Limits' },
      { href: '/docs/webhooks', label: 'Webhooks' },
      { href: '/docs/errors', label: 'Errors' },
    ]
  },
  {
    title: 'Monitors',
    links: [
      { href: '/docs/monitors', label: 'Overview' },
      { href: '/docs/monitors/create', label: 'Create Monitor' },
      { href: '/docs/monitors/list', label: 'List Monitors' },
      { href: '/docs/monitors/get', label: 'Get Monitor' },
      { href: '/docs/monitors/update', label: 'Update Monitor' },
      { href: '/docs/monitors/delete', label: 'Delete Monitor' },
    ]
  },
  {
    title: 'Monitor Types',
    links: [
      { href: '/docs/monitor-types', label: 'Supported Types' },
      { href: '/docs/monitor-types/website', label: 'Website' },
      { href: '/docs/monitor-types/api', label: 'API' },
      { href: '/docs/monitor-types/supabase', label: 'Supabase' },
      { href: '/docs/monitor-types/cron', label: 'Cron' },
      { href: '/docs/monitor-types/heartbeat', label: 'Heartbeat' },
      { href: '/docs/monitor-types/tcp', label: 'TCP' },
      { href: '/docs/monitor-types/dns', label: 'DNS' },
      { href: '/docs/monitor-types/ssl', label: 'SSL' },
      { href: '/docs/monitor-types/keyword', label: 'Keyword' },
      { href: '/docs/monitor-types/websocket', label: 'WebSocket' },
      { href: '/docs/monitor-types/domain', label: 'Domain' },
    ]
  },
  {
    title: 'API Reference',
    links: [
      { href: '/docs/api-reference', label: 'API Reference' },
    ]
  }
];

export function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto hidden md:block pt-16">
      <div className="p-6">
        <nav className="space-y-8">
          {DOCS_NAV.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors block py-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
