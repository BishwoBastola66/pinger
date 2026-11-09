'use client';

import { Shield, Lock, Key, Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function Security() {
  const features = [
    {
      icon: Shield,
      title: 'SSRF Protection',
      desc: 'Outbound probe targets are validated against a blocklist of private IP ranges and cloud metadata endpoints (169.254.x.x, 10.x, 127.x) before dispatch.'
    },
    {
      icon: Lock,
      title: 'Email OTP Verification',
      desc: 'All new accounts require email OTP verification. OTP attempts are rate-limited with an atomic counter to prevent brute-force attacks.'
    },
    {
      icon: Key,
      title: 'Scoped API Keys',
      desc: 'API keys are issued with explicit scopes. A read-only key cannot create or delete monitors. Keys are stored as bcrypt hashes — never in plaintext.'
    },
    {
      icon: Layers,
      title: 'Workspace Isolation',
      desc: 'Every resource is scoped to a workspace. All API endpoints enforce workspace membership before returning or modifying any data.'
    },
    {
      icon: RefreshCw,
      title: 'Session Management',
      desc: 'Sessions are hashed tokens with configurable expiry. Sessions can be individually revoked. IP and user-agent are logged on creation.'
    },
    {
      icon: AlertCircle,
      title: 'Rate Limiting',
      desc: 'Login, registration, OTP verification, and password reset endpoints are rate-limited per email to prevent abuse.'
    },
  ];

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
          <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Security</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Secure from day one.
          </h2>
          <p className="text-gray-600 text-lg">
            Security is not an afterthought. Every layer of Pinger is built with isolation, rate limiting, and least-privilege access in mind.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div 
              key={title} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-7 hover:border-blue-400 transition-colors duration-200"
            >
              <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-gray-900 font-semibold text-base mb-3">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
