'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

export function Navbar({ minimal = false }: { minimal?: boolean }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent py-2'
      }`}
    >
      <div className="w-full px-6 md:px-12 lg:px-16 mx-auto h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Pingr</span>
        </Link>
        
        {!minimal && (
          <>
            <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
              <Link href="/#features" className="hover:text-gray-900 transition-colors">Features</Link>
              <Link href="/#how-it-works" className="hover:text-gray-900 transition-colors">How it works</Link>
              <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Log in
              </Link>
              <Link href="/register">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">Get started</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </motion.header>
  );
}
