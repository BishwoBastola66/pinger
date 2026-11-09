'use client';

import { motion } from 'framer-motion';

export function Incidents() {
  return (
    <section className="py-28 bg-white">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Incident Tracking</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Every outage. Fully recorded.
          </h2>
          <p className="text-gray-600 text-lg">
            Pinger captures every incident automatically — start time, duration, error type, and resolution. Response times are logged per check for deep trend analysis.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { value: 'Real-time', label: 'Incident detection',  sub: 'Raised the moment a threshold is breached' },
            { value: 'Per-check', label: 'Response time logs',  sub: 'Every ping stored with ms resolution' },
            { value: 'Full trail', label: 'Incident history',   sub: 'Start time, duration, error message, resolution' },
          ].map(({ value, label, sub }, i) => (
            <motion.div 
              key={label} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center"
            >
              <div className="text-3xl font-extrabold text-gray-900 mb-2">{value}</div>
              <div className="text-blue-600 font-semibold mb-1">{label}</div>
              <div className="text-gray-500 text-sm">{sub}</div>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-6 max-w-3xl mx-auto"
        >
          <p className="text-xs text-gray-500 font-mono mb-5">INCIDENT LOG — Production API</p>
          <div className="space-y-4">
            {[
              { time: 'Sep 20, 14:32:01', event: 'Incident opened', color: 'red',     detail: 'HTTP 503 — Service Unavailable' },
              { time: 'Sep 20, 14:32:01', event: 'Alert sent',       color: 'yellow',  detail: 'Notified via Slack #alerts' },
              { time: 'Sep 20, 14:33:01', event: 'Still failing',    color: 'red',     detail: 'HTTP 503 — retry #2' },
              { time: 'Sep 20, 14:36:04', event: 'Incident resolved', color: 'green',  detail: 'HTTP 200 — 4 min 3 sec downtime' },
              { time: 'Sep 20, 14:36:04', event: 'Recovery alert',   color: 'green',   detail: 'Notified via Slack #alerts' },
            ].map(({ time, event, color, detail }, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.05), duration: 0.3 }}
                className="flex items-start gap-4"
              >
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="text-gray-800 text-sm font-semibold">{event}</span>
                    <span className="text-gray-500 text-sm"> — {detail}</span>
                  </div>
                  <span className="text-gray-600 text-xs font-mono shrink-0">{time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
