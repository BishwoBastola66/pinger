'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function Pricing() {
  const plans = [
    {
      title: 'Free',
      price: '$0',
      subtitle: 'Free forever',
      features: [
        'Up to 5 monitors', 
        '3 minute minimum interval', 
        '100 logs history', 
        '1 Status Page & 1 Custom Domain', 
        'Basic Monitors', 
        '1 API key & 500 API calls/month',
        'Email notifications',
        '1 Team Member (Admin)'
      ],
      buttonText: 'Get Started Free',
      buttonLink: '/register',
      isPopular: false,
    },
    {
      title: 'Pro',
      price: '$12',
      subtitle: 'Price negotiable via WhatsApp',
      badge: 'Negotiable',
      isPopular: true,
      features: [
        'Up to 50 monitors', 
        '1 minute minimum interval', 
        '500 logs history', 
        '5 Status Pages & 5 Custom Domains',
        'Advanced Monitors (TCP, DNS, SSL)',
        '10 API keys & 50k API calls/month', 
        'Webhook, Slack & Discord alerts',
        '5 Team Members',
        'Private Status Pages'
      ],
      buttonText: 'Negotiate on WhatsApp',
      buttonLink: 'https://wa.me/9779863479066?text=Hi%2C%20I%20am%20interested%20in%20the%20Pro%20plan%20on%20Pingr.',
    },
    {
      title: 'Business',
      price: '$49',
      subtitle: 'Custom & negotiable pricing',
      badge: 'Negotiable',
      isPopular: false,
      features: [
        'Up to 250 monitors', 
        '1 minute minimum interval', 
        '5000 logs history', 
        '25 Status Pages & 25 Custom Domains',
        'Advanced Monitors (TCP, DNS, SSL)',
        'Unlimited API keys & calls', 
        'All notification channels',
        '25 Team Members',
        'Remove Pingr Branding',
        'Priority support'
      ],
      buttonText: 'Negotiate on WhatsApp',
      buttonLink: 'https://wa.me/9779863479066?text=Hi%2C%20I%20am%20interested%20in%20the%20Business%20plan%20on%20Pingr.',
    },
    {
      title: 'Enterprise',
      price: 'Let\'s Talk',
      subtitle: 'Tailored for large scale',
      badge: 'Custom',
      isPopular: false,
      features: [
        '1000+ monitors', 
        '30 second intervals', 
        '20,000 logs history', 
        '100+ Status Pages & Domains',
        'Advanced Monitors (TCP, DNS, SSL)',
        'Unlimited API keys & calls', 
        'All notification channels',
        'Unlimited Team Members',
        'Custom Branding & SSO',
        '24/7 Dedicated Support & SLA'
      ],
      buttonText: 'Contact Sales',
      buttonLink: 'https://wa.me/9779863479066?text=Hi%2C%20I%20am%20interested%20in%20the%20Enterprise%20plan%20on%20Pingr.',
    }
  ];

  return (
    <section id="pricing" className="py-28 bg-gray-50">
      <div className="w-full px-6 md:px-12 lg:px-16 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-blue-500 text-sm font-semibold uppercase tracking-widest mb-4">Pricing</p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-600 text-lg">
            Plans are flexible and negotiable. Chat with us on WhatsApp at{' '}
            <a href="https://wa.me/9779863479066" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-semibold hover:underline">
              +977 9863479066
            </a>
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-[1400px] mx-auto items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`bg-white rounded-2xl p-8 flex flex-col justify-between relative ${plan.isPopular ? 'border-2 border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.15)]' : 'border border-gray-200'}`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>
                  {plan.badge && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${plan.isPopular ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : plan.title === 'Business' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.price !== "Let's Talk" && <span className="text-gray-600">/month</span>}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${plan.isPopular ? 'text-blue-600' : plan.title === 'Business' ? 'text-emerald-400' : plan.title === 'Enterprise' ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {plan.subtitle}
                  </p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center text-gray-700">
                      <ArrowRight className="w-4 h-4 text-blue-500 mr-3 shrink-0" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {plan.buttonLink.startsWith('http') ? (
                <a href={plan.buttonLink} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className={`w-full h-12 rounded-xl text-base font-semibold transition-all shadow-sm ${plan.isPopular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                    {plan.buttonText}
                  </Button>
                </a>
              ) : (
                <Link href={plan.buttonLink} className="w-full">
                  <Button className="w-full h-12 rounded-xl text-base font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-sm">
                    {plan.buttonText}
                  </Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
