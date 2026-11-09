'use client';

import { CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

export function StatusPages() {
  return (
    <section className="py-28 bg-gray-50 overflow-hidden">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Status Pages</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Give your users<br />full visibility.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Create a public status page with a custom slug. Pin any of your monitors to it and your users can check your service health at any time — without needing a login.
            </p>
            <ul className="space-y-4 text-gray-600">
              {[
                'Custom slug — e.g. status.pingr.site/your-product',
                'Group monitors by service or environment',
                'Real-time status updates on the page',
                'Incident announcements with timestamps',
                'Post status update messages during outages',
              ].map((f, i) => (
                <motion.li 
                  key={f} 
                  initial={{ opacity: 0, y: 5 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <CheckSquare className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">Pingr Core API</h3>
                  <p className="text-gray-500 text-xs mt-0.5">status.pingr.site/core</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">All Systems Operational</span>
              </div>
            </div>
            <div className="px-8 py-5 space-y-3">
              {[
                { name: 'API Gateway',     status: 'operational' },
                { name: 'Authentication',  status: 'operational' },
                { name: 'Database',        status: 'operational' },
                { name: 'CDN',             status: 'operational' },
                { name: 'Webhooks',        status: 'degraded'    },
              ].map(({ name, status }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-700 text-sm">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                    <span className={`text-xs font-medium ${status === 'operational' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                      {status === 'operational' ? 'Operational' : 'Degraded'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
