"use client";

import dynamic from 'next/dynamic';

export const ClientNetworkGlobe = dynamic(
  () => import('@/components/dashboard/NetworkGlobe').then((mod) => mod.NetworkGlobe),
  { 
    ssr: false, 
    loading: () => <div className="w-full h-[240px] sm:h-[260px] animate-pulse bg-gray-100 rounded-full" /> 
  }
);
