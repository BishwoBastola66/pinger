'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, Globe2, Radio, Palette, Bell, Key, CreditCard, Settings, Shield, BarChart2, Users } from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Statistics', href: '/dashboard/statistics', icon: BarChart2 },
  { name: 'Monitors', href: '/dashboard/monitors', icon: Globe },
  { name: 'Incidents', href: '/dashboard/incidents', icon: Radio },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Domains', href: '/dashboard/domains', icon: Globe2 },
  { name: 'Branding', href: '/dashboard/branding', icon: Palette },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            prefetch={true}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            {item.name}
          </Link>
        );
      })}

      {isAdmin && (
        <div className="pt-6 mt-6 border-t border-gray-200">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Admin</p>
          <Link
            href="/dashboard/admin"
            prefetch={true}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              pathname.startsWith('/dashboard/admin')
                ? 'bg-red-50 text-red-600 font-semibold border border-red-100'
                : 'text-red-500 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <Shield className="w-5 h-5" />
            Admin Panel
          </Link>
        </div>
      )}
    </div>
  );
}
