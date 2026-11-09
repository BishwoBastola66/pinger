'use client';

import { motion } from 'framer-motion';

export function Maintenance() {
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
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Maintenance Windows</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Deploy without<br />noisy alerts.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Schedule maintenance windows on any monitor. During the window, checks are silenced — you get the data without the false-positive alert flood.
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Monitor</span>
                <span className="text-gray-800 text-sm font-mono">Production DB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Start</span>
                <span className="text-gray-800 text-sm font-mono">Sep 21 02:00 UTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">End</span>
                <span className="text-gray-800 text-sm font-mono">Sep 21 04:00 UTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Status</span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">Scheduled</span>
              </div>
            </div>
          </motion.div>
          
          <div className="space-y-6">
            {[
              { title: 'Zero false positives', desc: 'Checks continue running during the window but no alerts are dispatched.' },
              { title: 'Full log retention',   desc: 'Every check during the window is still logged for your incident history.' },
              { title: 'Any monitor type',     desc: 'Create maintenance windows on any of the 11 supported monitor types.' },
            ].map(({ title, desc }, i) => (
              <motion.div 
                key={title} 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
              >
                <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
