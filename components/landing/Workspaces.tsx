'use client';

import { Users, UserCog, UserCheck, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export function Workspaces() {
  const roles = [
    {
      icon: UserCog,
      role: 'Owner',
      desc: 'Full control over billing, API keys, and workspace deletion. Ultimate authority.',
      color: 'red'
    },
    {
      icon: UserCheck,
      role: 'Admin',
      desc: 'Can create and delete monitors, manage status pages, and invite other members.',
      color: 'blue'
    },
    {
      icon: Users,
      role: 'Member',
      desc: 'Can view monitors, acknowledge incidents, and create maintenance windows.',
      color: 'emerald'
    },
    {
      icon: Eye,
      role: 'Viewer',
      desc: 'Read-only access to dashboard data and analytics. Cannot modify any configuration.',
      color: 'gray'
    }
  ];

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
            <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Team Workspaces</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Collaborate securely<br />with your team.
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Keep personal projects and work infrastructure strictly separated. Invite team members to isolated workspaces and enforce security through strict Role-Based Access Control (RBAC).
            </p>
            
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <span className="text-gray-800 font-semibold text-sm">Workspace Members</span>
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">Pingr Team</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">alice@pingr.site</span>
                <span className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-2 py-0.5 rounded-full">Owner</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">bob@pingr.site</span>
                <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">charlie@pingr.site</span>
                <span className="bg-gray-100 text-gray-600 border border-gray-200 text-xs font-semibold px-2 py-0.5 rounded-full">Viewer</span>
              </div>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {roles.map(({ icon: Icon, role, desc, color }, i) => {
              const bgClass = `bg-${color}-500/10`;
              const textClass = `text-${color}-600`;
              return (
                <motion.div 
                  key={role} 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className={`w-5 h-5 ${textClass}`} />
                    <h3 className="text-gray-900 font-semibold">{role}</h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
