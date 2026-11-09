'use client';

import { BarChart2, Activity, Clock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const CHART_BARS = [
  22, 28, 19, 32, 17, 29, 24, 16, 27, 21,
  35, 18, 25, 30, 16, 23, 27, 19, 24, 31,
  20, 26, 18, 28, 23, 19, 72, 86, 91, 74,
  29, 22, 18, 33, 25, 20, 27, 24, 30, 21,
];

export function Analytics() {
  const metrics = [
    { value: '99.99%', label: 'Uptime SLA', icon: ShieldCheck, color: 'emerald' },
    { value: '45ms', label: 'Avg Latency', icon: Clock, color: 'blue' },
    { value: '20M+', label: 'Monthly Pings', icon: Activity, color: 'indigo' },
    { value: '1 yr', label: 'Log Retention', icon: BarChart2, color: 'purple' },
  ];

  return (
    <section className="py-28 bg-white overflow-hidden">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Deep Analytics</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Measure performance,<br />not just uptime.
          </h2>
          <p className="text-gray-600 text-lg">
            Move beyond simple up/down status. Pinger logs the exact response time of every single request in milliseconds, allowing you to track latency degradation before it becomes an outage.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics.map(({ value, label, icon: Icon, color }, i) => (
            <motion.div 
              key={label} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-500/10`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{value}</div>
              <div className="text-gray-500 text-sm font-medium">{label}</div>
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-10 max-w-5xl mx-auto shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-gray-900 font-bold text-lg">Response Time History</h3>
              <p className="text-gray-500 text-sm">Last 24 hours — Production API</p>
            </div>
            <div className="bg-gray-100 text-gray-600 text-xs font-mono px-3 py-1.5 rounded-lg border border-gray-200">
              Avg: 45ms
            </div>
          </div>
          
          {/* Mock Chart Area */}
          <div className="h-48 w-full flex items-end gap-1 sm:gap-2">
            {CHART_BARS.map((height, i) => {
              const isSpike = i > 25 && i < 30;
              return (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t-sm ${isSpike ? 'bg-yellow-400' : 'bg-blue-200 hover:bg-blue-300'} transition-colors cursor-pointer`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400 font-mono">
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
