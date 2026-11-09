'use client';

import { motion } from 'framer-motion';

export function Alerting() {
  return (
    <section className="py-28 bg-gray-50 overflow-hidden">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Alerting</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Know the moment<br />something breaks.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              Configure multiple notification channels per monitor. Choose which events each channel receives — downtime, recovery, or both.
            </p>
            <ul className="space-y-5">
              {[
                { channel: 'Email',    detail: 'Transactional email alerts via SMTP. Works out of the box.' },
                { channel: 'Slack',    detail: 'Post to any Slack channel via Incoming Webhook URL.' },
                { channel: 'Discord',  detail: 'Send rich embeds to your Discord server through a webhook.' },
                { channel: 'Telegram', detail: 'Direct bot notifications and group alerts via Telegram Bot API.' },
                { channel: 'Webhook',  detail: 'Hit any HTTPS endpoint with a signed JSON payload on every event.' },
              ].map(({ channel, detail }) => (
                <li key={channel} className="flex items-start gap-4">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1 text-sm sm:text-base leading-relaxed">
                    <span className="text-gray-900 font-semibold mr-2">{channel}</span>
                    <span className="text-gray-600">— {detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3"
          >
            <p className="text-xs text-gray-500 font-mono mb-4">RECENT ALERTS</p>
            {[
              { status: 'down',     label: 'Production API',         ch: 'Slack',   ago: '2m ago' },
              { status: 'up',       label: 'Customer Portal',        ch: 'Email',   ago: '14m ago' },
              { status: 'down',     label: 'Main Database',          ch: 'Discord', ago: '1h ago' },
              { status: 'up',       label: 'Payment Gateway',        ch: 'Webhook', ago: '1h ago' },
              { status: 'expiring', label: 'Marketing Site SSL',     ch: 'Email',   ago: '3h ago' },
            ].map(({ status, label, ch, ago }, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.1), duration: 0.3 }}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${status === 'down' ? 'bg-red-500' : status === 'up' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                  <span className="text-gray-800 text-sm font-mono">{label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium border border-gray-200">{ch}</span>
                  <span>{ago}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
