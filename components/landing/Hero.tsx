'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { NetworkVisualization } from '@/components/three/NetworkVisualization';
import { motion } from 'framer-motion';

export function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50, damping: 15 } },
  };

  return (
    <section className="relative overflow-hidden h-screen w-full flex items-center justify-center" style={{ background: '#ffffff' }}>
      <NetworkVisualization />
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative w-full px-6 md:px-12 lg:px-20 flex flex-col items-center text-center z-10 mt-8 md:mt-16 lg:mt-24 mb-8"
      >
        <motion.h1
          variants={itemVariants}
          className="font-extrabold tracking-tight mb-5 sm:mb-6 max-w-5xl leading-[1.06]"
          style={{
            color: '#0f172a',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '-0.03em',
          }}
        >
          Know when your{' '}
          <span style={{ color: '#2563eb' }}>services</span> go down.
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="mb-8 sm:mb-10 leading-relaxed max-w-xl sm:max-w-2xl"
          style={{ color: '#475569', fontSize: 'clamp(0.95rem, 2vw, 1.2rem)' }}
        >
          Monitor websites, APIs, and Supabase projects globally. Integrate programmatically with our powerful developer API.
        </motion.p>
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/register">
            <Button 
              size="lg" 
              className="group h-14 px-9 rounded-2xl text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/35 transition-all duration-200 active:scale-[0.98]"
            >
              Start monitoring
              <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button 
              size="lg" 
              className="h-14 px-9 rounded-2xl text-lg font-semibold bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-200/90 hover:border-gray-300 shadow-sm hover:shadow transition-all duration-200 backdrop-blur-sm active:scale-[0.98]"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Documentation
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
