'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="bg-white border-t border-gray-200 py-14"
    >
      <div className="w-full px-6 md:px-12 lg:px-16 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-bold text-gray-900">Pingr</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">Professional infrastructure monitoring for websites, APIs, and developer-facing services.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">
            <div>
              <p className="text-gray-600 font-semibold mb-3">Product</p>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-500 hover:text-gray-700 transition-colors">Monitor Types</Link></li>
                <li><Link href="#how-it-works" className="text-gray-500 hover:text-gray-700 transition-colors">Developer API</Link></li>
                <li><Link href="#pricing" className="text-gray-500 hover:text-gray-700 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-gray-600 font-semibold mb-3">Docs</p>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-gray-500 hover:text-gray-700 transition-colors">Getting Started</Link></li>
                <li><Link href="/docs/api-reference" className="text-gray-500 hover:text-gray-700 transition-colors">API Reference</Link></li>
                <li><Link href="/docs/webhooks" className="text-gray-500 hover:text-gray-700 transition-colors">Webhooks</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-gray-600 font-semibold mb-3">Account</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-gray-500 hover:text-gray-700 transition-colors">Log in</Link></li>
                <li><Link href="/register" className="text-gray-500 hover:text-gray-700 transition-colors">Sign up</Link></li>
                <li><Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">Dashboard</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-12 pt-8 text-gray-600 text-sm flex justify-between">
          <span>&copy; {new Date().getFullYear()} Pingr Inc. All rights reserved.</span>
        </div>
      </div>
    </motion.footer>
  );
}
