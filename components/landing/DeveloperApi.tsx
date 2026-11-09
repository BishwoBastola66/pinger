'use client';

import { motion } from 'framer-motion';

export function DeveloperApi() {
  return (
    <section id="how-it-works" className="py-28 bg-white overflow-hidden">
      <div className="w-full px-6 md:px-12 lg:px-20 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden order-2 lg:order-1"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50 bg-gray-50/50 backdrop-blur">
              <span className="w-3 h-3 rounded-full bg-red-400/90" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/90" />
              <span className="w-3 h-3 rounded-full bg-green-400/90" />
              <span className="text-xs text-gray-400 font-mono ml-3 font-medium">POST /api/v1/monitors</span>
            </div>
            <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto text-gray-700 font-medium">
{`fetch("https://api.pingr.site/api/v1/monitors", {
  method: "POST",
  headers: {
    "Authorization": "Bearer pinger_xxxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Production API",
    type: "api",
    target: "https://api.yourcompany.com/health",
    method: "GET",
    expectedStatus: 200,
    intervalSeconds: 60,
    timeoutSeconds: 10
  })
})`}
            </pre>
            <div className="border-t border-gray-50 bg-gray-50/50 px-5 py-3">
              <span className="text-xs text-emerald-500 font-mono font-semibold">← 201 Created</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="order-1 lg:order-2"
          >
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Developer API</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Built for code,<br />not just clicks.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              Every action in the dashboard is available through a REST API. Create scoped API keys and wire Pinger into your CI/CD pipelines, deployment scripts, or internal tooling.
            </p>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'monitors:read',  desc: 'List and retrieve monitors' },
                { label: 'monitors:write', desc: 'Create, update, delete monitors' },
                { label: 'Full REST API',  desc: 'GET, POST, PATCH, DELETE' },
                { label: 'API Key Scopes', desc: 'Least-privilege per key' },
              ].map(({ label, desc }) => (
                <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <p className="text-gray-900 text-sm font-mono font-semibold mb-1">{label}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
