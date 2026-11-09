'use client';

import { Activity, Globe, Database, Clock, Server, Wifi, Lock, CheckSquare, RefreshCw, AlertCircle, Cpu, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

export function MonitorTypes() {
  const monitors = [
    { icon: Globe,       color: '#3b82f6', label: 'Website',          desc: 'HTTP/HTTPS uptime checks. Assert on status code, response time, and content.' },
    { icon: Server,      color: '#8b5cf6', label: 'API',               desc: 'Full REST monitoring with custom headers, query params, request body, and response assertions.' },
    { icon: Database,    color: '#10b981', label: 'Supabase',          desc: 'Purpose-built health check for Supabase projects using your project URL and anon key.' },
    { icon: Clock,       color: '#f97316', label: 'Cron',              desc: 'Validate scheduled jobs ran on time. Configure cron expressions and grace periods.' },
    { icon: Activity,    color: '#22c55e', label: 'Heartbeat',         desc: 'Your service pings us. Silence within the interval triggers an incident automatically.' },
    { icon: Cpu,         color: '#ec4899', label: 'TCP / Port',        desc: 'Raw TCP socket probe to confirm a port is open and accepting connections.' },
    { icon: Wifi,        color: '#06b6d4', label: 'DNS',               desc: 'Query A, AAAA, CNAME, MX, TXT, and NS records and assert they resolve correctly.' },
    { icon: Lock,        color: '#eab308', label: 'SSL Certificate',   desc: 'Monitor TLS validity and get alerted a configurable number of days before expiry.' },
    { icon: CheckSquare, color: '#6366f1', label: 'Keyword / Content', desc: 'Load a URL and assert a specific keyword is present — or absent — in the response body.' },
    { icon: RefreshCw,   color: '#ef4444', label: 'WebSocket',         desc: 'Open a WebSocket connection and verify your endpoint is reachable and responsive.' },
    { icon: AlertCircle, color: '#f59e0b', label: 'Domain Expiry',     desc: 'Track domain registration expiration. Get alerted before your domain lapses.' },
    { icon: Radio,       color: '#84cc16', label: 'Ping (ICMP)',       desc: 'Send ICMP echo requests to verify server availability and measure round-trip time.' },
  ];

  return (
    <section id="features" className="py-28 bg-white">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-20"
        >
          <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Monitor Types</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            One tool.<br />Every protocol.
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Pinger ships with 12 distinct monitor types so you can cover every layer of your stack — from public-facing HTTP endpoints to low-level TCP sockets.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200">
          {monitors.map(({ icon: Icon, color, label, desc }, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-gray-50 p-8 hover:bg-gray-100/80 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: color + '18' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="text-gray-900 font-semibold text-base mb-2">{label}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
