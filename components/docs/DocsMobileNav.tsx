'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, LayoutDashboard, Home } from 'lucide-react';
import { DOCS_NAV } from '@/components/docs/SidebarNav';

export function DocsMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const overlay = (
    <div className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-white md:hidden">
      {/* Quick Links */}
      <div className="p-3 border-b border-gray-100 bg-gray-50/80 grid grid-cols-2 gap-2 shrink-0">
        <Link
          href="/"
          onClick={() => setIsOpen(false)}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-xs"
        >
          <Home className="w-3.5 h-3.5 text-gray-500" />
          Home
        </Link>
        <Link
          href="/dashboard"
          onClick={() => setIsOpen(false)}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold text-blue-600 bg-blue-50/80 border border-blue-200 rounded-lg hover:bg-blue-100/80 transition-colors shadow-xs"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {DOCS_NAV.map((section) => (
          <div key={section.title}>
            <h4 className="font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-2.5">
              {section.title}
            </h4>
            <ul className="space-y-1">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <span>{link.label}</span>
                      {isActive && <ArrowRight className="w-3.5 h-3.5 text-blue-600" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close documentation navigation' : 'Open documentation navigation'}
        className="p-2 -mr-1 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center focus:outline-none"
      >
        {isOpen ? <X className="w-6 h-6 text-gray-900" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && mounted && createPortal(overlay, document.body)}
    </>
  );
}
