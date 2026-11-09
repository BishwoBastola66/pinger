import { SidebarNav } from '@/components/docs/SidebarNav';
import { DocsMobileNav } from '@/components/docs/DocsMobileNav';
import { ApiTester } from '@/components/docs/ApiTester';
import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Mobile Topbar */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 h-16 md:hidden flex items-center px-4 sm:px-6 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Pingr</span>
          <span className="text-xs text-gray-400 font-medium ml-1">Docs</span>
        </Link>

        <DocsMobileNav />
      </header>
      
      {/* Desktop Topbar */}
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 h-16 items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">Pingr</Link>
          <span className="ml-4 pl-4 border-l border-gray-300 text-sm font-medium text-gray-600">Documentation</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
        </div>
      </header>
      <SidebarNav />
      <div className="md:pl-64 xl:pr-96 pt-16 md:pt-16">
        <main className="max-w-4xl mx-auto px-6 py-12 lg:px-8 pb-24">
          <div className="docs-content text-base leading-7 text-gray-700">
            {children}
          </div>
        </main>
      </div>

      {/* Right Sidebar (Testing / TOC) */}
      <aside className="hidden xl:block fixed top-16 right-0 w-96 h-[calc(100vh-4rem)] border-l border-gray-200 bg-white/50 backdrop-blur-md pt-8 px-6 pb-24 overflow-y-auto z-40">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">On this page</h4>
        <div className="space-y-3 text-sm text-gray-600 font-medium">
          <p className="hover:text-blue-600 cursor-pointer transition-colors">Overview</p>
          <p className="hover:text-blue-600 cursor-pointer transition-colors">Configuration</p>
          <p className="hover:text-blue-600 cursor-pointer transition-colors">Examples</p>
          <p className="hover:text-blue-600 cursor-pointer transition-colors">Testing & Debugging</p>
        </div>
        
        <ApiTester />
      </aside>
    </div>
  );
}
