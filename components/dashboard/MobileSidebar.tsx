'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Activity, LogOut } from 'lucide-react';
import { SidebarNav } from './SidebarNav';

export function MobileSidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const overlay = (
    <div className="fixed inset-0 z-[100] flex lg:hidden">
      <div className="fixed inset-0 bg-black/80" onClick={() => setIsOpen(false)} />
      <div className="relative flex w-64 h-full flex-col bg-white border-r border-gray-200 shadow-2xl">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-gray-900">Pingr</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-gray-500 hover:text-gray-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <SidebarNav isAdmin={user.role === 'admin' || user.role === 'super_admin'} />

            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-gray-50/80 border border-gray-200/80">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0 shadow-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate leading-tight" title={user.name}>{user.name}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5" title={user.email}>{user.email}</p>
                  </div>
                </div>
                <form action="/api/auth/logout" method="POST" className="shrink-0">
                  <button
                    type="submit"
                    title="Sign out"
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
        <Menu className="w-6 h-6" />
      </button>
      {isOpen && mounted && createPortal(overlay, document.body)}
    </>
  );
}
